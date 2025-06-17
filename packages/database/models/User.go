package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt time.Time

	FirstName string `gorm:"not null"`
	LastName  string `gorm:"not null"`

	Email           string `gorm:"uniqueIndex;not null"`
	IsEmailVerified bool   `gorm:"default:false"`

	Phone           string `gorm:"uniqueIndex;not null"`
	IsPhoneVerified bool   `gorm:"default:false"`

	Password string `gorm:"not null"`
}
