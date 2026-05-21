"""
Migration v3: Add mentor profile fields for formal mentor system.
- mentor_profiles.status (pending/approved/rejected)
- mentor_profiles.major
- mentor_profiles.graduation_year
"""
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / "zhixin.db"


def migrate():
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    # Check existing columns in mentor_profiles
    cur.execute("PRAGMA table_info(mentor_profiles)")
    existing_cols = {row[1] for row in cur.fetchall()}

    added = []

    if "status" not in existing_cols:
        cur.execute("ALTER TABLE mentor_profiles ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'approved'")
        added.append("status")

    if "major" not in existing_cols:
        cur.execute("ALTER TABLE mentor_profiles ADD COLUMN major VARCHAR(255)")
        added.append("major")

    if "graduation_year" not in existing_cols:
        cur.execute("ALTER TABLE mentor_profiles ADD COLUMN graduation_year INTEGER")
        added.append("graduation_year")

    conn.commit()

    if added:
        print(f"Added columns: {', '.join(added)}")
        # Ensure all existing mentor profiles are set to 'approved'
        cur.execute("UPDATE mentor_profiles SET status = 'approved' WHERE status IS NULL OR status = ''")
        conn.commit()
        print("Existing mentor profiles set to 'approved' status.")
    else:
        print("All columns already exist, no changes needed.")

    conn.close()
    print("Migration v3 complete.")


if __name__ == "__main__":
    migrate()
