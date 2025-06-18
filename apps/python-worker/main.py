# Utilities
import os
import json
import time

# Redis
import redis

# Services
from services.redis_cloud_service import connect_to_redis_cloud

# Configuration
from dotenv import load_dotenv
from config.settings import settings

# Load environment variables
load_dotenv()

def main():
    print("Python worker started — connecting to Redis Cloud…")

    client = connect_to_redis_cloud()
    if not client:
        print("Failed to connect to Redis. Exiting.")
        return

    print("Waiting for document jobs on 'document_jobs' queue (Ctrl-C to stop)... \n")

    try:
        while True:
            try:
                result = client.blpop("document_jobs", timeout=1)
                if not result:
                    continue

                _, job_json = result

                try:
                    payload = json.loads(job_json)

                    # Extract common fields
                    print(f"Job Payload Recieved:")
                    print(f"Job ID : {payload.get('JobID', 'Unknown')}")
                    print(f"Job Type : {payload.get('JobType', 'Unknown')}")
                    print(f"User ID : {payload.get('UserId', 'Unknown')}")
                    print(f"Chat ID : {payload.get('ChatId', 'Unknown')}")

                    doc = payload.get("Document", {})
                    print(
                        f"File : {doc.get('FileName', 'Unknown')} "
                        f"({doc.get('FileSize', 0)} bytes, "
                        f"{doc.get('MimeType', 'Unknown')})\n"
                    )

                except json.JSONDecodeError as e:
                    print("Skipping malformed job payload.")
                    print(f"JSON error: {e}\n")

            except redis.ConnectionError as e:
                print(f"Redis connection lost: {e}")
                print("Attempting to reconnect…")
                client = connect_to_redis_cloud()
                if not client:
                    print("Failed to reconnect. Exiting.")
                    break

    except KeyboardInterrupt:
        print("\nWorker interrupted — shutting down gracefully. \n")
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == "__main__":
    main()
