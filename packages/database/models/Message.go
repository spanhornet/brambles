package models

import (
	"time"

	"gorm.io/gorm"
)

type Message struct {
	ID uint `gorm:"primaryKey"`

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	ChatID uint `gorm:"index"`

	Model string `gorm:"size:255"`

	Role    string `gorm:"size:50"`
	Content string `gorm:"type:text"`
}
