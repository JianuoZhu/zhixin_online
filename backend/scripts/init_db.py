import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    print("database schema is ready")


if __name__ == "__main__":
    init_db()
