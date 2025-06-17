package routes

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"github.com/spanhornet/brambles/apps/go-rest-api/controllers"
)

func RegisterChatRoutes(router fiber.Router, db *gorm.DB) {
	chatGroup := router.Group("/chats")
	controllers.RegisterChatRoutes(chatGroup, db)
}
