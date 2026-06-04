import argparse
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models import User


def create_admin(update_password: bool = False) -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == settings.admin_email).first()
        if not admin:
            admin = User(
                email=settings.admin_email,
                hashed_password=hash_password(settings.admin_password),
                role="admin",
                display_name="Admin",
            )
            db.add(admin)
            db.commit()
            print(f"created admin user: {settings.admin_email}")
            return

        changed = False
        if admin.role != "admin":
            admin.role = "admin"
            changed = True
        if update_password:
            admin.hashed_password = hash_password(settings.admin_password)
            changed = True

        if changed:
            db.commit()
            print(f"updated admin user: {settings.admin_email}")
        else:
            print(f"admin user already exists: {settings.admin_email}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create the bootstrap admin account.")
    parser.add_argument(
        "--update-password",
        action="store_true",
        help="Reset the admin password from ADMIN_PASSWORD in backend/.env.",
    )
    args = parser.parse_args()
    create_admin(update_password=args.update_password)
