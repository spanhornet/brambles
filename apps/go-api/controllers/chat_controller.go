package controllers

import (
	"bufio"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

func RegisterChatRoutes(group fiber.Router) {
	// Stream message (POST /:id/message)
	group.Post("/:id/message", func(c *fiber.Ctx) error {
		chatID := c.Params("id")

		// Parse request body
		type StreamMessageRequest struct {
			Message string `json:"message,omitempty"`
		}
		var req StreamMessageRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "bad request",
			})
		}

		// SSE headers
		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Access-Control-Allow-Origin", "*")
		c.Set("Access-Control-Allow-Headers", "Content-Type")

		message := req.Message
		if message == "" {
			message = "Hello there! This is a demonstration of Server-Sent Events streaming words one by one. Each word appears with a slight delay to simulate real-time generation."
		}
		words := strings.Fields(message)

		// Stream response
		c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
			// Start event
			fmt.Fprintf(w, "event: start\n")
			fmt.Fprintf(w, "data: {\"chatId\": \"%s\", \"status\": \"streaming\"}\n\n", chatID)
			w.Flush()

			// Word-by-word streaming
			for i, word := range words {
				time.Sleep(300 * time.Millisecond)
				fmt.Fprintf(w, "event: word\n")
				fmt.Fprintf(w, "data: {\"word\": \"%s\", \"index\": %d, \"chatId\": \"%s\"}\n\n", word, i, chatID)
				w.Flush()
			}

			// Handle completion
			fmt.Fprintf(w, "event: complete\n")
			fmt.Fprintf(w, "data: {\"chatId\": \"%s\", \"status\": \"completed\", \"totalWords\": %d}\n\n", chatID, len(words))
			w.Flush()
		})

		return c.Status(200).JSON(fiber.Map{
			"message": "successfully streamed message",
		})
	})
}
