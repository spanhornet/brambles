package services

import (
	"context"
	"fmt"
	"os"

	"github.com/redis/go-redis/v9"
)

var redisCloudClient *redis.Client

func InitRedisCloudClient() error {
	// Set Redis configuration
	address := os.Getenv("REDIS_ADDRESS")
	username := os.Getenv("REDIS_USERNAME")
	password := os.Getenv("REDIS_PASSWORD")

	// Initialize the Redis client
	client := redis.NewClient(&redis.Options{
		Addr:     address,
		Username: username,
		Password: password,
		DB:       0,
	})

	// Test the connection
	ctx := context.Background()
	_, err := client.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("failed to connect to Redis: %v", err)
	}

	redisCloudClient = client
	return nil
}

func GetRedisCloudClient() *redis.Client {
	return redisCloudClient
}
