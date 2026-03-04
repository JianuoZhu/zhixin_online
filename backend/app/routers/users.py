import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.dependencies import get_db, get_current_user, require_roles
from app.models import User
from app.schemas import PasswordChange, UserAdminOut, UserCreate, UserOut, UserUpdate

router = APIRouter()


@router.get("/", response_model=list[UserAdminOut], dependencies=[Depends(require_roles(["admin"]))])
def list_users(db: Session = Depends(get_db)) -> list[UserAdminOut]:
    users = db.query(User).order_by(User.id).all()
    return [UserAdminOut.model_validate(user) for user in users]


@router.post("/", response_model=UserOut, dependencies=[Depends(require_roles(["admin"]))])
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> UserOut:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        display_name=payload.display_name,
        avatar_url=payload.avatar_url,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.put("/me", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserOut:
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()


@router.put("/{user_id}/role", response_model=UserOut, dependencies=[Depends(require_roles(["admin"]))])
def change_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
) -> UserOut:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if role not in {"member", "mentor", "admin"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    user.role = role
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/import", dependencies=[Depends(require_roles(["admin"]))])
def import_users(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV files are supported")
    
    content = file.file.read()
    try:
        # Decode using utf-8-sig to automatically strip Excel's BOM if present
        decoded = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV must be UTF-8 encoded")
        
    reader = csv.DictReader(io.StringIO(decoded))
    
    # Validation
    if not reader.fieldnames or "email" not in reader.fieldnames or "password" not in reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="CSV header is missing required columns: 'email', 'password'"
        )

    added_count = 0
    skipped_count = 0
    
    # Load all existing emails to batch validation into sets (optimizing memory load)
    existing_emails = {email[0] for email in db.query(User.email).all()}
    
    for row in reader:
        email = row.get("email", "").strip()
        password = row.get("password", "").strip()
        
        # Skip blanks or existing elements
        if not email or not password or email in existing_emails:
            skipped_count += 1
            continue
            
        role = row.get("role", "member").strip()
        if role not in {"member", "mentor", "admin"}:
            role = "member"
            
        display_name = row.get("display_name", "").strip()
        
        new_user = User(
            email=email,
            hashed_password=hash_password(password),
            role=role,
            display_name=display_name if display_name else None
        )
        db.add(new_user)
        existing_emails.add(email) # Prevent duplicates across rows within the same spreadsheet
        added_count += 1
        
    db.commit()
    
    return {"added": added_count, "skipped": skipped_count}

