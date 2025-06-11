package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"

	"github.com/spanhornet/brambles/apps/go-api/routes"

	"github.com/spanhornet/brambles/packages/database"
)

const apiVersion = "/api/v1"

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

	// Start server
	app := fiber.New()
	app.Use(logger.New(logger.Config{
		Format: "[${ip}]:${port} ${status} - ${method} ${path}\n",
	}))

	v1 := app.Group(apiVersion)
	routes.RegisterRoutes(v1, db)

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	if err := app.Listen(":8080"); err != nil {
		log.Fatalf("server failed to start: %v", err)
	}
}
