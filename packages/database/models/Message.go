package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Message struct {
	ID uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	ChatID uuid.UUID `gorm:"type:uuid;not null"`

	Model string `gorm:"size:255"`

	Role    string `gorm:"size:50"`
	Content string `gorm:"type:text"`
}
