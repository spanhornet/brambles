package controllers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/spanhornet/brambles/packages/database/models"
)

func RegisterUserRoutes(group fiber.Router, db *gorm.DB) {
	// Get current user (GET /me)
	group.Get("/me", func(c *fiber.Ctx) error {
		token := c.Cookies("session")
		if token == "" {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Find session
		var session models.Session
		if err := db.Preload("User").First(&session, "token = ? AND expires_at > ?", token, time.Now()).Error; err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Return user
		user := session.User

		return c.JSON(fiber.Map{
			"id":              user.ID,
			"createdAt":       user.CreatedAt,
			"updatedAt":       user.UpdatedAt,
			"firstName":       user.FirstName,
			"lastName":        user.LastName,
			"email":           user.Email,
			"phone":           user.Phone,
			"isEmailVerified": user.IsEmailVerified,
			"isPhoneVerified": user.IsPhoneVerified,
		})
	})

	// Sign up a user (POST /sign-up)
	group.Post("/sign-up", func(c *fiber.Ctx) error {
		// Define the form values
		type SignUpFormValues struct {
			FirstName string `json:"firstName"`
			LastName  string `json:"lastName"`
			Email     string `json:"email"`
			Phone     string `json:"phone"`
			Password  string `json:"password"`
		}

		// Parse the form values
		var input SignUpFormValues

		if err := c.BodyParser(&input); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "bad request"})
		}

		// Hash the password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "internal server error"})
		}

		// Create the user
		user := models.User{
			FirstName: input.FirstName,
			LastName:  input.LastName,
			Email:     input.Email,
			Phone:     input.Phone,
			Password:  string(hashedPassword),
		}

		if err := db.Create(&user).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "internal server error"})
		}

		// Create a session
		token := uuid.New().String()
		expiresAt := time.Now().Add(24 * time.Hour)

		session := models.Session{
			UserID:    user.ID,
			Token:     token,
			ExpiresAt: expiresAt,
			IPAddress: ptr(c.IP()),
			UserAgent: ptr(c.Get("User-Agent")),
		}
		if err := db.Create(&session).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "internal server error"})
		}

		c.Cookie(&fiber.Cookie{
			Name:     "session",
			Value:    token,
			Expires:  expiresAt,
			Secure:   true,
			HTTPOnly: true,
			SameSite: "Lax",
			Path:     "/",
		})

		return c.Status(200).JSON(fiber.Map{
			"message": "successfully signed up user",
		})
	})

	// Sign in a user (POST /sign-in)
	group.Post("/sign-in", func(c *fiber.Ctx) error {
		// Define the form values
		type SignInFormValues struct {
			Email      string `json:"email"`
			Password   string `json:"password"`
			RememberMe bool   `json:"rememberMe"`
		}

		// Parse the form values
		var input SignInFormValues

		if err := c.BodyParser(&input); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "bad request"})
		}

		// Find the user
		var user models.User
		if err := db.First(&user, "email = ?", input.Email).Error; err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Check the password
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Create a session
		token := uuid.New().String()
		expiresAt := time.Now().Add(24 * time.Hour)
		if input.RememberMe {
			expiresAt = time.Now().Add(30 * 24 * time.Hour)
		}

		session := models.Session{
			UserID:    user.ID,
			Token:     token,
			ExpiresAt: expiresAt,
			IPAddress: ptr(c.IP()),
			UserAgent: ptr(c.Get("User-Agent")),
		}
		if err := db.Create(&session).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "internal server error"})
		}

		c.Cookie(&fiber.Cookie{
			Name:     "session",
			Value:    token,
			Expires:  expiresAt,
			Secure:   true,
			HTTPOnly: true,
			SameSite: "Lax",
			Path:     "/",
		})

		return c.Status(200).JSON(fiber.Map{
			"message": "successfully signed in user",
		})
	})

	// Sign out a user (POST /sign-out)
	group.Post("/sign-out", func(c *fiber.Ctx) error {
		token := c.Cookies("session")
		if token == "" {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		if err := db.Delete(&models.Session{}, "token = ?", token).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "internal server error"})
		}

		c.Cookie(&fiber.Cookie{
			Name:     "session",
			Value:    "",
			Expires:  time.Now().Add(-1 * time.Hour),
			Secure:   true,
			HTTPOnly: true,
			SameSite: "Lax",
			Path:     "/",
		})

		return c.Status(200).JSON(fiber.Map{
			"message": "successfully signed out user",
		})
	})
}

func ptr(s string) *string {
	return &s
}
