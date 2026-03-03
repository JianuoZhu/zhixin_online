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
        # Check if column exists
        cursor.execute("PRAGMA table_info(events)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'group_id' not in columns:
            print("Adding group_id column to events table...")
            cursor.execute('ALTER TABLE events ADD COLUMN group_id VARCHAR(50);')
            cursor.execute('CREATE INDEX ix_events_group_id ON events (group_id);')
            print("Column added successfully.")
        else:
            print("Column group_id already exists.")
            
    except Exception as e:
        print("Error modifying database:", e)
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    upgrade_db()
