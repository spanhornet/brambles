package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"gorm.io/gorm"

	"github.com/spanhornet/brambles/apps/go-rest-api/services"
	"github.com/spanhornet/brambles/packages/database/models"
)

// DocumentJobPayload represents the job payload for document processing
type DocumentJobPayload struct {
	JobID     string `json:"JobID"`
	JobType   string `json:"JobType"`
	JobStatus string `json:"JobStatus"`

	UserID string `json:"UserId"`
	ChatID string `json:"ChatId"`

	Document models.Document `json:"Document"`
}

func RegisterDocumentRoutes(group fiber.Router, db *gorm.DB) {
	// GET /documents
	group.Get("/", func(c *fiber.Ctx) error {
		// Get the authenticated user
		user, ok := c.Locals("user").(models.User)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Retrieve all documents for the user
		var documents []models.Document
		if err := db.Where("user_id = ?", user.ID).Find(&documents).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not retrieve documents"})
		}

		// Return the list of documents
		return c.Status(fiber.StatusOK).JSON(documents)
	})

	// POST /documents
	group.Post("/", func(c *fiber.Ctx) error {
		// Get the authenticated user
		user, ok := c.Locals("user").(models.User)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Parse the request body
		chatIdStr := c.FormValue("chatId")
		if chatIdStr == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "chatId is required"})
		}
		chatId, err := uuid.Parse(chatIdStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid chatId format"})
		}

		// Parse the uploaded file
		fileHeader, err := c.FormFile("file")
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "failed to retrieve file: " + err.Error()})
		}

		// Open the uploaded file
		file, err := fileHeader.Open()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "cannot open uploaded file: " + err.Error()})
		}
		defer file.Close()

		// Generate a unique object key
		documentId := uuid.New()
		fileName := fileHeader.Filename
		fileSize := fileHeader.Size
		mimeType := fileHeader.Header.Get("Content-Type")
		objectKey := documentId.String()

		// Initialize the client
		cloudflareR2Client := services.GetCloudflareR2Client()
		if cloudflareR2Client == nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Cloudflare R2 client not initialized"})
		}

		// Upload the file
		bucket := os.Getenv("CLOUDFLARE_R2_BUCKET_NAME")
		if bucket == "" {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "R2 bucket name not configured"})
		}
		_, err = cloudflareR2Client.PutObject(context.Background(), bucket, objectKey, file, fileSize, minio.PutObjectOptions{
			ContentType: mimeType,
		})
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to upload file to storage: " + err.Error()})
		}

		// Get the public development URL
		publicEndpoint := os.Getenv("CLOUDFLARE_R2_PUBLIC_DEVELOPMENT_URL")
		if publicEndpoint == "" {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "R2 public endpoint not configured"})
		}

		// Construct the URL
		url := fmt.Sprintf("%s/%s", publicEndpoint, objectKey)

		// Create the document
		doc := models.Document{
			ID:        documentId,
			UserID:    user.ID,
			ChatID:    chatId,
			FileName:  fileName,
			FileSize:  fileHeader.Size,
			MimeType:  mimeType,
			URL:       url,
			Bucket:    bucket,
			ObjectKey: objectKey,
		}
		if err := db.Create(&doc).Error; err != nil {
			// Handle orphaned file
			_ = cloudflareR2Client.RemoveObject(context.Background(), bucket, objectKey, minio.RemoveObjectOptions{})
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save document record: " + err.Error()})
		}

		// Return document
		return c.Status(fiber.StatusCreated).JSON(doc)
	})

	// POST /:id/enqueue - Enqueue document for processing
	group.Post("/:id/enqueue", func(c *fiber.Ctx) error {
		documentID := c.Params("id")

		// Parse UUID
		documentUUID, err := uuid.Parse(documentID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid document ID"})
		}

		// Get the authenticated user
		user, ok := c.Locals("user").(models.User)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Fetch the document
		var document models.Document
		if err := db.Where("id = ? AND user_id = ?", documentUUID, user.ID).First(&document).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "document not found"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not verify document ownership"})
		}

		// Create the job payload
		jobPayload := DocumentJobPayload{
			JobID:     uuid.New().String(),
			JobType:   "document_job",
			JobStatus: "Not started",
			UserID:    user.ID.String(),
			ChatID:    document.ChatID.String(),
			Document: models.Document{
				ID:        document.ID,
				UserID:    document.UserID,
				ChatID:    document.ChatID,
				CreatedAt: document.CreatedAt,
				UpdatedAt: document.UpdatedAt,
				DeletedAt: document.DeletedAt,
				Bucket:    document.Bucket,
				ObjectKey: document.ObjectKey,
				URL:       document.URL,
				FileName:  document.FileName,
				FileSize:  document.FileSize,
				MimeType:  document.MimeType,
			},
		}

		// Marshal the job payload
		payloadJSON, err := json.Marshal(jobPayload)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not serialize job payload"})
		}

		// Get Redis Cloud client
		rdb := services.GetRedisCloudClient()
		if rdb == nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Redis client not initialized"})
		}

		// Enqueue the job payload to Redis
		queueKey := "document_jobs"
		if err := rdb.LPush(c.Context(), queueKey, payloadJSON).Err(); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not enqueue document job"})
		}

		// Return success response with job details
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"job": jobPayload,
		})
	})
}
