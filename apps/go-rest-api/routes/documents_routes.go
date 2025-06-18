package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/spanhornet/brambles/apps/go-rest-api/controllers"
	"gorm.io/gorm"
)

func RegisterDocumentRoutes(router fiber.Router, db *gorm.DB) {
	docsGroup := router.Group("/documents")
	controllers.RegisterDocumentRoutes(docsGroup, db)
}
