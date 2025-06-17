package middlewares

import (
	"errors"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"github.com/spanhornet/brambles/packages/database/models"
)

const (
	cookieName   = "session"
	ctxUserKey   = "user"
	bearerPrefix = "Bearer "
)

func SessionsMiddleware(db *gorm.DB, slidingTTL time.Duration) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if c.Path() == "/api/v1/users/sign-in" || c.Path() == "/api/v1/users/sign-up" {
			return c.Next()
		}

		// Extract token
		token := c.Cookies(cookieName)
		if token == "" {
			auth := c.Get("Authorization")
			if len(auth) > len(bearerPrefix) && auth[:len(bearerPrefix)] == bearerPrefix {
				token = auth[len(bearerPrefix):]
			}
		}

		if token == "" {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Validate token
		var session models.Session
		err := db.
			Preload("User").
			Where("token = ? AND expires_at > ?", token, time.Now()).
			First(&session).Error

		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		case err != nil:
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
		}

		// Extend session
		if slidingTTL > 0 {
			newExp := time.Now().Add(slidingTTL)
			_ = db.Model(&session).Update("expires_at", newExp).Error

			c.Cookie(&fiber.Cookie{
				Name:     cookieName,
				Value:    token,
				Expires:  newExp,
				HTTPOnly: true,
				Secure:   c.Protocol() == "https",
				SameSite: "Lax",
			})
		}

		// Attach user to context
		c.Locals(ctxUserKey, session.User)

		return c.Next()
	}
}
