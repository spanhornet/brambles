package services

import (
	"fmt"
	"os"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var cloudflareR2Client *minio.Client

func InitCloudflareR2Client() error {
	// Set Cloudflare R2 configuration
	endpoint := os.Getenv("CLOUDFLARE_R2_S3_API")
	accessKey := os.Getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")
	secretKey := os.Getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")

	if accessKey == "" || secretKey == "" || endpoint == "" {
		return fmt.Errorf("missing Cloudflare R2 configuration in environment")
	}

	// Initialize the client
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: true,
		Region: "auto",
	})

	if err != nil {
		return err
	}

	cloudflareR2Client = client
	return nil
}

func GetCloudflareR2Client() *minio.Client {
	return cloudflareR2Client
}
