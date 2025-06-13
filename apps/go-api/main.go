package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/redis/go-redis/v9"

	"github.com/joho/godotenv"

	"github.com/spanhornet/brambles/apps/go-api/middlewares"
	"github.com/spanhornet/brambles/apps/go-api/routes"
	"github.com/spanhornet/brambles/packages/database"
)

const apiVersion = "/api/v1"

var rdb *redis.Client

func initRedis() error {
	rdb = redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_ADDRESS"),
		Username: os.Getenv("REDIS_USERNAME"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	// Test the connection
	ctx := context.Background()
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("failed to connect to Redis: %v", err)
	}

	log.Println("Successfully connected to Redis")
	return nil
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, relying on environment")
	}

	// Initialize Redis
	if err := initRedis(); err != nil {
		log.Fatal(err)
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

	// Migrate to database
	if err := database.Migrate(db); err != nil {
		log.Fatalf("error migrating database: %v", err)
	}

	// Start server
	app := fiber.New()

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("redis", rdb)
		return c.Next()
	})

	app.Use(logger.New(logger.Config{
		Format: "[${ip}]:${port} ${status} - ${method} ${path}\n",
	}))

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000",
		AllowCredentials: true,
	}))

	v1 := app.Group(apiVersion)

	routes.RegisterUserRoutes(v1, db)

	v1.Use(middlewares.AuthMiddleware(db))

	routes.RegisterChatRoutes(v1, db)

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	if err := app.Listen(":8080"); err != nil {
		log.Fatalf("server failed to start: %v", err)
	}
}
