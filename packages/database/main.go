package main

import (
	"fmt"
	"log"
	"os"

	"models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/joho/godotenv"
)

func ConnectToDatabase(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	return db, nil
}

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.User{},
		&models.Session{},
	)
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no `.env` file found")
	}

	// Get environment variable
	dsn := os.Getenv("SUPABASE_DATABASE_CONNECTION_STRING")
	if dsn == "" {
		log.Fatalf("`SUPABASE_DATABASE_CONNECTION_STRING` is not set")
	}

	// Connect to database
	db, err := ConnectToDatabase(dsn)
	if err != nil {
		log.Fatalf("error connecting to database: %v", err)
	}

	// Print the database
	fmt.Println(db)

	/*
		// Migrate to database
		if err := Migrate(db); err != nil {
			log.Fatalf("error migrating to database: %v", err)
		}
	*/
}
