package main

import (
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	// Initialize app
	app := fiber.New()

	// Request logging
	app.Use(logger.New())

	// GET /health
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if err := app.Listen(":" + port); err != nil {
		panic(err)
	}
}
