import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'zhixin.db')

def upgrade_db():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("PRAGMA table_info(events)")
        columns = [info[1] for info in cursor.fetchall()]
        
        new_columns = [
            ("detail", "TEXT"),
            ("approval_status", "VARCHAR(20) NOT NULL DEFAULT 'approved'"),
            ("creator_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
            ("credit_certified", "BOOLEAN NOT NULL DEFAULT 0"),
            ("credit_course", "VARCHAR(255)"),
            ("registration_deadline", "DATETIME"),
        ]
        
        for col_name, col_type in new_columns:
            if col_name not in columns:
                print(f"Adding {col_name} column to events table...")
                cursor.execute(f'ALTER TABLE events ADD COLUMN {col_name} {col_type};')
                print(f"Column {col_name} added successfully.")
            else:
                print(f"Column {col_name} already exists.")
                
    except Exception as e:
        print("Error modifying database:", e)
        
    conn.commit()
    conn.close()
    print("Database upgrade complete.")

if __name__ == "__main__":
    upgrade_db()
