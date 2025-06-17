package controllers

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"github.com/spanhornet/brambles/packages/database/models"
)

func RegisterChatRoutes(group fiber.Router, db *gorm.DB) {
	// GET /chats
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

	// POST /chats
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
}
