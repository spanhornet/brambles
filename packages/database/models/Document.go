package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Document struct {
	ID     uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID uuid.UUID `gorm:"type:uuid;index"`
	ChatID uuid.UUID `gorm:"type:uuid;index"`

	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`

	Bucket    string `gorm:"size:63;not null;uniqueIndex:idx_bucket_key"`
	ObjectKey string `gorm:"size:1024;not null;uniqueIndex:idx_bucket_key"`

	URL string `gorm:"size:2048;not null"`

	FileName string `gorm:"size:255;not null;index"`
	FileSize int64  `gorm:"check:file_size_gt_zero,file_size > 0"`
	MimeType string `gorm:"size:128;not null"`
}
