from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./zhixin.db"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 120
    allowed_origins: str = "http://localhost:5173"
    admin_email: str = "admin@example.com"
    admin_password: str = "ChangeMe123!"
    max_upload_size: int = 5_242_880  # 5 MB

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
