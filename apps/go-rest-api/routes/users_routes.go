package routes

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"github.com/spanhornet/brambles/apps/go-rest-api/controllers"
)

func RegisterUserRoutes(router fiber.Router, db *gorm.DB) {
	userGroup := router.Group("/users")
	controllers.RegisterUserRoutes(userGroup, db)
}
