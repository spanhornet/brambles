package middlewares

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"github.com/spanhornet/brambles/packages/database/models"
)

func AuthMiddleware(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Cookies("session")
		if token == "" {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Find session
		var session models.Session
		if err := db.Preload("User").First(&session, "token = ? AND expires_at > ?", token, time.Now()).Error; err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Attach user to context
		c.Locals("user", session.User)

		return c.Next()
	}
}
