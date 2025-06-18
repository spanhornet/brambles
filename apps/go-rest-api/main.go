package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
	"gorm.io/gorm"

	"github.com/spanhornet/brambles/apps/go-rest-api/middlewares"
	"github.com/spanhornet/brambles/apps/go-rest-api/routes"
	"github.com/spanhornet/brambles/apps/go-rest-api/services"
	"github.com/spanhornet/brambles/packages/database"
)

const version = "/api/v1"

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("no environment variables found")
	}

	dsn := os.Getenv("SUPABASE_DATABASE_CONNECTION_STRING")
	if dsn == "" {
		log.Fatal("SUPABASE_DATABASE_CONNECTION_STRING is not set")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:3000"
	}

	slidingMinutes := 30
	if v := os.Getenv("SESSION_SLIDING_MINUTES"); v != "" {
		if parsed, err := time.ParseDuration(v + "m"); err == nil {
			slidingMinutes = int(parsed.Minutes())
		}
	}
	slidingTTL := time.Duration(slidingMinutes) * time.Minute

	// Connect to database
	db, err := database.ConnectToDatabase(dsn)
	if err != nil {
		log.Fatalf("error connecting to database: %v", err)
	}
	migrate(db)

	// Initialize R2 client
	if err := services.InitCloudflareR2Client(); err != nil {
		log.Fatalf("error initializing Cloudflare R2 client: %v", err)
	}
	log.Println("Cloudflare R2 client initialized successfully")

	// Create app
	app := fiber.New(fiber.Config{
		Prefork:      false,
		ErrorHandler: fiber.DefaultErrorHandler,
	})

	// Global middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigin,
		AllowCredentials: true,
	}))

	app.Use(logger.New())

	app.Use(middlewares.SessionsMiddleware(db, slidingTTL))

	// Routes
	app.Get("/health", func(c *fiber.Ctx) error { return c.SendString("OK") })

	v1 := app.Group(version)
	routes.RegisterUserRoutes(v1, db)
	routes.RegisterChatRoutes(v1, db)
	routes.RegisterDocumentRoutes(v1, db)

	// Launch server
	go func() {
		if err := app.Listen(":" + port); err != nil {
			log.Fatalf("fiber: %v", err)
		}
	}()
	log.Printf("server listening on http://localhost:%s", port)

	waitForShutdown(app, db)
}

// Migrate database
func migrate(db *gorm.DB) {
	if err := database.Migrate(db); err != nil {
		log.Fatalf("error migrating database: %v", err)
	}
}

func waitForShutdown(app *fiber.App, db *gorm.DB) {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	<-ctx.Done()
	log.Println("shutdown signal received…")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		log.Printf("fiber shutdown: %v", err)
	}

	sqlDB, _ := db.DB()
	_ = sqlDB.Close()

	log.Println("graceful shutdown complete")
}
