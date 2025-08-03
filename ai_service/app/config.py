from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()  

class Settings(BaseSettings):
    api_key: str
    model_path: str = "models/task_model"
    port: int = 8000
    nestjs_url: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()