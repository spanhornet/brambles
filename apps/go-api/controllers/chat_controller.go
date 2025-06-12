package controllers

import (
	"bufio"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

func RegisterChatRoutes(group fiber.Router) {
	defaultMessage := "Hello there! This is a demonstration of Server-Sent Events streaming words one by one. Each word appears with a slight delay to simulate real-time generation."

	group.Post("/:id/message", func(c *fiber.Ctx) error {
		chatID := c.Params("id")

		type StreamMessageRequest struct {
			Message string `json:"message,omitempty"`
		}
		var req StreamMessageRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "bad request"})
		}

		message := req.Message
		if message == "" {
			message = defaultMessage
		}
		words := strings.Fields(message)

		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Access-Control-Allow-Origin", "*")
		c.Set("Access-Control-Allow-Headers", "Content-Type")

		c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
			fmt.Fprintf(w, "event: start\n")
			fmt.Fprintf(w, "data: {\"chatId\": \"%s\", \"status\": \"streaming\"}\n\n", chatID)
			w.Flush()

			for i, word := range words {
				time.Sleep(300 * time.Millisecond)
				fmt.Fprintf(w, "event: word\n")
				fmt.Fprintf(w, "data: {\"word\": \"%s\", \"index\": %d, \"chatId\": \"%s\"}\n\n", word, i, chatID)
				w.Flush()
			}

			fmt.Fprintf(w, "event: complete\n")
			fmt.Fprintf(w, "data: {\"chatId\": \"%s\", \"status\": \"completed\", \"totalWords\": %d}\n\n", chatID, len(words))
			w.Flush()
		})

		return nil
	})

	group.Post("/:id/resume", func(c *fiber.Ctx) error {
		chatID := c.Params("id")

		type ResumeRequest struct {
			LastSeenIndex int `json:"lastSeenIndex"`
		}
		var req ResumeRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "bad request"})
		}

		words := strings.Fields(defaultMessage)
		startIndex := req.LastSeenIndex + 1
		if startIndex >= len(words) {
			return c.Status(200).SendString("event: complete\ndata: {\"chatId\": \"" + chatID + "\", \"status\": \"completed\", \"totalWords\": " + fmt.Sprintf("%d", len(words)) + "}\n\n")
		}

		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Access-Control-Allow-Origin", "*")
		c.Set("Access-Control-Allow-Headers", "Content-Type")

		c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
			for i := startIndex; i < len(words); i++ {
				time.Sleep(300 * time.Millisecond)
				fmt.Fprintf(w, "event: word\n")
				fmt.Fprintf(w, "data: {\"word\": \"%s\", \"index\": %d, \"chatId\": \"%s\"}\n\n", words[i], i, chatID)
				w.Flush()
			}

			fmt.Fprintf(w, "event: complete\n")
			fmt.Fprintf(w, "data: {\"chatId\": \"%s\", \"status\": \"completed\", \"totalWords\": %d}\n\n", chatID, len(words))
			w.Flush()
		})

		return nil
	})
}
