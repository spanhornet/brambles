package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"

	"github.com/joho/godotenv"

	"github.com/spanhornet/brambles/apps/go-rest-api/routes"
	"github.com/spanhornet/brambles/packages/database"
)

const version = "/api/v1"

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, relying on environment")
	}

	// Load environment variables
	dsn := os.Getenv("SUPABASE_DATABASE_CONNECTION_STRING")
	if dsn == "" {
		log.Fatal("`SUPABASE_DATABASE_CONNECTION_STRING` is not set")
	}

	// Connect to database
	db, err := database.ConnectToDatabase(dsn)
	if err != nil {
		log.Fatalf("error connecting to database: %v", err)
	}

	// Migrate to database
	if err := database.Migrate(db); err != nil {
		log.Fatalf("error migrating database: %v", err)
	}

	// Initialize app
	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000",
		AllowCredentials: true,
	}))

	// Request logging
	app.Use(logger.New())

	// GET /health
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	v1 := app.Group(version)

	routes.RegisterUserRoutes(v1, db)
	routes.RegisterChatRoutes(v1, db)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if err := app.Listen(":" + port); err != nil {
		panic(err)
	}
}
