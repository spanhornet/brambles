package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Chat struct {
	ID     uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`
	UserID uuid.UUID `gorm:"type:uuid;not null"`

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	Name     string    `gorm:"size:255"`
	Messages []Message `gorm:"foreignKey:ChatID;constraint:OnDelete:CASCADE"`
}
