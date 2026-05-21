import argparse
import csv
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User


def import_cas_ids(csv_path: str) -> None:
    db = SessionLocal()
    updated = 0
    skipped = 0
    try:
        with open(csv_path, newline="", encoding="utf-8-sig") as file:
            reader = csv.DictReader(file)
            required = {"email", "sustech_id"}
            if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
                raise ValueError("CSV must include headers: email,sustech_id")

            for row in reader:
                email = (row.get("email") or "").strip()
                sustech_id = (row.get("sustech_id") or "").strip()
                cas_guid = (row.get("cas_guid") or "").strip()
                if not email or not sustech_id:
                    skipped += 1
                    continue

                user = db.query(User).filter(User.email == email).first()
                if not user:
                    skipped += 1
                    continue

                user.sustech_id = sustech_id
                if cas_guid:
                    user.cas_guid = cas_guid
                updated += 1

        db.commit()
    finally:
        db.close()

    print(f"updated={updated} skipped={skipped}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bind existing users to SUSTech CAS IDs.")
    parser.add_argument("csv_path", help="CSV file with email,sustech_id[,cas_guid] columns")
    args = parser.parse_args()
    import_cas_ids(args.csv_path)
