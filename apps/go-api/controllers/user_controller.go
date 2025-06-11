package controllers

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"github.com/spanhornet/brambles/packages/database/models"
)

func RegisterUserRoutes(group fiber.Router, db *gorm.DB) {
	// Fetch all users (GET /)
	group.Get("/", func(c *fiber.Ctx) error {
		var users []models.User
		if err := db.Find(&users).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to fetch users"})
		}
		return c.Status(200).JSON(users)
	})

	// Create a new user (POST /)
	group.Post("/", func(c *fiber.Ctx) error {
		var user models.User
		if err := c.BodyParser(&user); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
		}
		if err := db.Create(&user).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to create user"})
		}
		return c.Status(201).JSON(user)
	})

	// Fetch a user by ID (GET /:id)
	group.Get("/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		var user models.User
		if err := db.First(&user, "id = ?", id).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "user not found"})
		}
		return c.Status(200).JSON(user)
	})

	// Update a user by ID (PUT /:id)
	group.Put("/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		var user models.User
		if err := db.First(&user, "id = ?", id).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "user not found"})
		}
		if err := c.BodyParser(&user); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid input"})
		}
		if err := db.Save(&user).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to update user"})
		}
		return c.Status(200).JSON(user)
	})

	// Delete a user by ID (DELETE /:id)
	group.Delete("/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		if err := db.Delete(&models.User{}, "id = ?", id).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to delete user"})
		}
		return c.SendStatus(204)
	})
}
