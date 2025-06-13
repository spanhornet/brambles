package controllers

import (
	"bufio"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/spanhornet/brambles/packages/database/models"
)

func RegisterChatRoutes(group fiber.Router, db *gorm.DB) {
	// Start a chat (POST /:id/message)
	group.Post("/:id/message", func(c *fiber.Ctx) error {
		chatID := c.Params("id")

		// Parse UUID from string
		chatUUID, err := uuid.Parse(chatID)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid chat ID"})
		}

		type StreamMessageRequest struct {
			Message string `json:"message,omitempty"`
			Role    string `json:"role,omitempty"`
		}
		var req StreamMessageRequest

		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "bad request"})
		}

		// Set default role if not provided
		if req.Role == "" {
			req.Role = "user" // Default role
		}

		// Create and save the message
		message := models.Message{
			ChatID:  chatUUID,
			Role:    req.Role,
			Content: req.Message,
			Model:   "", // Can be set if needed
		}

		if err := db.Create(&message).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "could not save message"})
		}

		words := strings.Fields(req.Message)

		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Set("Access-Control-Allow-Headers", "Content-Type")

		c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
			fmt.Fprintf(w, "event: start\n")
			fmt.Fprintf(w, "data: {\"chatId\": \"%s\", \"status\": \"streaming\", \"messageId\": \"%s\"}\n\n", chatID, message.ID)
			w.Flush()

			for i, word := range words {
				time.Sleep(300 * time.Millisecond)
				fmt.Fprintf(w, "event: word\n")
				fmt.Fprintf(w, "data: {\"word\": \"%s\", \"index\": %d, \"chatId\": \"%s\"}\n\n", word, i, chatID)
				w.Flush()
			}

			fmt.Fprintf(w, "event: complete\n")
			fmt.Fprintf(w, "data: {\"chatId\": \"%s\", \"status\": \"completed\", \"totalWords\": %d, \"messageId\": \"%s\"}\n\n", chatID, len(words), message.ID)
			w.Flush()
		})

		return nil
	})

	// Resume a chat (POST /:id/resume)
	group.Post("/:id/resume", func(c *fiber.Ctx) error {
		chatID := c.Params("id")

		type ResumeRequest struct {
			LastSeenIndex int    `json:"lastSeenIndex"`
			Message       string `json:"message,omitempty"`
		}
		var req ResumeRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "bad request"})
		}

		message := req.Message
		words := strings.Fields(message)

		startIndex := req.LastSeenIndex + 1
		if startIndex >= len(words) {
			return c.Status(200).SendString("event: complete\ndata: {\"chatId\": \"" + chatID + "\", \"status\": \"completed\", \"totalWords\": " + fmt.Sprintf("%d", len(words)) + "}\n\n")
		}

		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Set("Access-Control-Allow-Headers", "Content-Type")

		c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
			for i := startIndex; i < len(words); i++ {
				time.Sleep(300 * time.Millisecond)
				fmt.Fprintf(w, "event: word\n")
				fmt.Fprintf(w, "data: {\"word\": \"%s\", \"index\": %d, \"chatId\": \"%s\"}\n\n", words[i], i, chatID)
				w.Flush()
			}

			fmt.Fprintf(w, "event: complete\n")
			fmt.Fprintf(w, "data: {\"chatId\": \"%s\", \"status\": \"completed\", \"totalWords\": %d}\n\n", chatID, len(words))
			w.Flush()
		})

		return nil
	})

	// Create a chat (POST /)
	group.Post("/", func(c *fiber.Ctx) error {
		// Define the form values
		type CreateChatFormValues struct {
			Name string `json:"name"`
		}

		// Parse the form values
		var input CreateChatFormValues

		if err := c.BodyParser(&input); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "bad request"})
		}

		// Get the authenticated user
		user, ok := c.Locals("user").(models.User)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Create a chat
		chat := models.Chat{
			Name:   input.Name,
			UserID: user.ID,
		}

		// Save the chat to the database
		if err := db.Create(&chat).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "could not create chat"})
		}

		// Return the chat
		return c.Status(201).JSON(chat)
	})

	// Get all chats for a user (GET /)
	group.Get("/", func(c *fiber.Ctx) error {
		// Get the authenticated user
		user, ok := c.Locals("user").(models.User)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Retrieve all chats for the user with their messages
		var chats []models.Chat
		if err := db.Preload("Messages").Where("user_id = ?", user.ID).Find(&chats).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "could not retrieve chats"})
		}

		// Return the list of chats
		return c.Status(200).JSON(chats)
	})
}
