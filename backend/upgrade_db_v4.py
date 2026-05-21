from sqlalchemy import inspect, text

from app.database import engine


def upgrade() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("users")}

    statements: list[str] = []
    if "sustech_id" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN sustech_id VARCHAR(100)")
    if "cas_guid" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN cas_guid VARCHAR(100)")

    if not statements:
        print("users table already has CAS columns")
        return

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))

    print("CAS columns added to users table")


if __name__ == "__main__":
    upgrade()
