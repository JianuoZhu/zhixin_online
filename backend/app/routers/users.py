from fastapi import APIRouter, Depends, HTTPException, status
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
