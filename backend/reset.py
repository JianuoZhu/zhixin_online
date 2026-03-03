from app.database import Base, engine
from scripts.seed import seed

def reset_db():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped. Seeding new data...")
    seed()
    print("Database Reset Complete.")

if __name__ == "__main__":
    reset_db()
