import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings:
    """Centralized configuration settings for the Python worker."""
    
    # Redis Cloud configuration
    REDIS_ADDRESS = os.getenv("REDIS_ADDRESS")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_USERNAME = os.getenv("REDIS_USERNAME")
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
    
    @classmethod
    def validate(cls):
        """Validate that all required environment variables are set."""
        required_vars = [
            ("REDIS_ADDRESS", cls.REDIS_ADDRESS),
            ("REDIS_USERNAME", cls.REDIS_USERNAME),
            ("REDIS_PASSWORD", cls.REDIS_PASSWORD),
        ]
        
        missing_vars = [var_name for var_name, value in required_vars if not value]
        
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        return True

# Create a singleton instance
settings = Settings() 