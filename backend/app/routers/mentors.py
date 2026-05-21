from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, require_roles
from app.models import MentorProfile, User
from app.schemas import MentorOut, MentorProfileCreate, MentorProfileUpdate

router = APIRouter()


def _display_name(user: User) -> str:
    return user.display_name or user.email


def _mentor_out(user: User, profile: MentorProfile | None) -> MentorOut:
    return MentorOut(
        id=user.id,
        display_name=_display_name(user),
        avatar_url=user.avatar_url,
        title=profile.title if profile else None,
        bio=profile.bio if profile else None,
        tags=profile.tags if profile else [],
        major=profile.major if profile else None,
        graduation_year=profile.graduation_year if profile else None,
        status=profile.status if profile else None,
    )


@router.get("/", response_model=list[MentorOut])
def list_mentors(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[MentorOut]:
    """List all approved mentors."""
    rows = (
        db.query(User, MentorProfile)
        .outerjoin(MentorProfile, MentorProfile.user_id == User.id)
        .filter(User.role == "mentor")
        .filter(MentorProfile.status == "approved")
        .order_by(User.id)
        .all()
    )

    return [_mentor_out(user, profile) for user, profile in rows]


@router.post("/apply", response_model=MentorOut)
def apply_mentor(
    payload: MentorProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MentorOut:
    """Submit a mentor application. Creates a pending MentorProfile."""
    # Check if user already has a profile
    existing = db.query(MentorProfile).filter(MentorProfile.user_id == current_user.id).first()
    if existing:
        if existing.status == "approved":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already a mentor")
        if existing.status == "pending":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Application already pending")
        # If rejected, allow re-application by updating
        existing.title = payload.title
        existing.bio = payload.bio
        existing.tags = payload.tags
        existing.major = payload.major
        existing.graduation_year = payload.graduation_year
        existing.status = "pending"
        db.commit()
        db.refresh(existing)
        return _mentor_out(current_user, existing)

    profile = MentorProfile(
        user_id=current_user.id,
        title=payload.title,
        bio=payload.bio,
        tags=payload.tags,
        major=payload.major,
        graduation_year=payload.graduation_year,
        status="pending",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _mentor_out(current_user, profile)


@router.get("/my-profile", response_model=MentorOut | None)
def get_my_mentor_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's mentor profile (if any)."""
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == current_user.id).first()
    if not profile:
        return None
    return _mentor_out(current_user, profile)


@router.put("/profile", response_model=MentorOut)
def update_mentor_profile(
    payload: MentorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MentorOut:
    """Update the current mentor's profile."""
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No mentor profile found")

    if profile.status != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only approved mentors can update their profile")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return _mentor_out(current_user, profile)


@router.get("/pending", response_model=list[MentorOut], dependencies=[Depends(require_roles(["admin"]))])
def list_pending_mentors(db: Session = Depends(get_db)) -> list[MentorOut]:
    """List all pending mentor applications (admin only)."""
    rows = (
        db.query(User, MentorProfile)
        .join(MentorProfile, MentorProfile.user_id == User.id)
        .filter(MentorProfile.status == "pending")
        .order_by(MentorProfile.created_at.desc())
        .all()
    )
    return [_mentor_out(user, profile) for user, profile in rows]


@router.put("/{user_id}/approve", response_model=MentorOut, dependencies=[Depends(require_roles(["admin"]))])
def approve_mentor(
    user_id: int,
    action: str,
    db: Session = Depends(get_db),
) -> MentorOut:
    """Approve or reject a mentor application (admin only)."""
    if action not in ("approved", "rejected"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="action must be 'approved' or 'rejected'")

    profile = db.query(MentorProfile).filter(MentorProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor profile not found")

    profile.status = action

    # If approved, promote user role to mentor
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if action == "approved":
        user.role = "mentor"
    # If rejected, revert to member (only if currently still member/pending)
    elif action == "rejected" and user.role != "admin":
        user.role = "member"

    db.commit()
    db.refresh(profile)
    db.refresh(user)
    return _mentor_out(user, profile)
