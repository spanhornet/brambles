package models

import (
	"time"

	"github.com/google/uuid"
)

type Session struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`

	User   User      `gorm:"constraint:OnDelete:CASCADE;"`
	UserID uuid.UUID `gorm:"type:uuid;not null;index"`

	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
	ExpiresAt time.Time `gorm:"not null"`

	Token string `gorm:"type:text;uniqueIndex;not null"`

	IPAddress *string `gorm:"type:text"`
	UserAgent *string `gorm:"type:text"`
}
