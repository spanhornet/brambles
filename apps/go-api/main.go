package main

import (
	"context"
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

func initRedis() {
	redisURL := os.Getenv("REDIS_URL")

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("Failed to parse Redis URL: %v", err)
	}

	// Initialize Redis client
	rdb = redis.NewClient(opt)

	// Verify connection
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Unable to connect to Redis: %v", err)
	}

	log.Println("Connected to Redis Cloud successfully.")
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, relying on environment")
	}

	// Initialize Redis
	initRedis()

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

	v1.Use(middlewares.AuthMiddleware(db))

	routes.RegisterUserRoutes(v1, db)
	routes.RegisterChatRoutes(v1, db)

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	if err := app.Listen(":8080"); err != nil {
		log.Fatalf("server failed to start: %v", err)
	}
}
