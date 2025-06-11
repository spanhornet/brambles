package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"

	"github.com/spanhornet/brambles/packages/database"
	"github.com/spanhornet/brambles/packages/database/models"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, relying on environment")
	}

	dsn := os.Getenv("SUPABASE_DATABASE_CONNECTION_STRING")
	if dsn == "" {
		log.Fatal("`SUPABASE_DATABASE_CONNECTION_STRING` is not set")
	}

	// Connect to database
	db, err := database.ConnectToDatabase(dsn)
	if err != nil {
		log.Fatalf("error connecting to database: %v", err)
	}

	// Insert a new user
	newUser := models.User{
		FirstName:       "John",
		LastName:        "Doe",
		Email:           "john.doe@example.com",
		IsEmailVerified: false,
		Phone:           "(123) 456-7890",
		IsPhoneVerified: false,
		Password:        "password",
	}
	if err := db.Create(&newUser).Error; err != nil {
		log.Fatalf("error creating user: %v", err)
	}
	log.Printf("created user with ID: %s\n", newUser.ID)

	// Start server
	app := fiber.New()
	app.Use(logger.New(logger.Config{
		Format: "[${ip}]:${port} ${status} - ${method} ${path}\n",
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	if err := app.Listen(":8080"); err != nil {
		log.Fatalf("server failed to start: %v", err)
	}
}
