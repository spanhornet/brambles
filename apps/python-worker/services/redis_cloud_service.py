import redis
from config.settings import settings

def connect_to_redis_cloud():
    """Connect to Redis Cloud and return the client, or None on failure."""
    try:
        client = redis.Redis(
            host=settings.REDIS_ADDRESS,
            port=settings.REDIS_PORT,
            username=settings.REDIS_USERNAME,
            password=settings.REDIS_PASSWORD,
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