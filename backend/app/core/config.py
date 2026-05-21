from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./zhixin.db"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 120
    allowed_origins: str = "http://localhost:5173"
    frontend_url: str = "http://localhost:5173"
    api_public_base_url: str = "http://localhost:8000"
    admin_email: str = "admin@example.com"
    admin_password: str = "ChangeMe123!"
    max_upload_size: int = 5_242_880  # 5 MB
    cas_login_url: str = "https://cas.sustech.edu.cn/cas/login"
    cas_logout_url: str = "https://cas.sustech.edu.cn/cas/logout"
    cas_service_validate_url: str = "https://cas.sustech.edu.cn/cas/serviceValidate"
    cas_service_url: str | None = None

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
