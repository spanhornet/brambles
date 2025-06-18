import os
import json
import time
import redis
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Redis connection details
REDIS_ADDRESS  = os.getenv("REDIS_ADDRESS")
REDIS_PORT     = int(os.getenv("REDIS_PORT", "6379"))
REDIS_USERNAME = os.getenv("REDIS_USERNAME")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")


def connect_to_redis():
    """Connect to Redis Cloud and return the client, or None on failure."""
    try:
        client = redis.Redis(
            host=REDIS_ADDRESS,
            port=REDIS_PORT,
            username=REDIS_USERNAME,
            password=REDIS_PASSWORD,
            decode_responses=True,
        )
        client.ping()
        print("Redis Cloud client initialized.")
        return client
    except redis.ConnectionError as e:
        print(f"Unable to connect to Redis Cloud: {e}")
    except Exception as e:
        print(f"Redis Cloud connection error: {e}")
    return None


def main():
    print("Python worker started — connecting to Redis Cloud…")

    client = connect_to_redis()
    if not client:
        print("Failed to connect to Redis. Exiting.")
        return

    print("Waiting for document jobs on 'document_jobs' queue (Ctrl-C to stop).")

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
                client = connect_to_redis()
                if not client:
                    print("Failed to reconnect. Exiting.")
                    break

    except KeyboardInterrupt:
        print("\nWorker interrupted — shutting down gracefully.")
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == "__main__":
    main()
