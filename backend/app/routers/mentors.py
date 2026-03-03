from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models import MentorProfile, User
from app.schemas import MentorOut

router = APIRouter()


@router.get("/", response_model=list[MentorOut])
def list_mentors(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[MentorOut]:
    rows = (
        db.query(User, MentorProfile)
        .outerjoin(MentorProfile, MentorProfile.user_id == User.id)
        .filter(User.role == "mentor")
        .order_by(User.id)
        .all()
    )

    results: list[MentorOut] = []
    for user, profile in rows:
        results.append(
            MentorOut(
                id=user.id,
                display_name=user.display_name or user.email,
                avatar_url=user.avatar_url,
                title=profile.title if profile else None,
                bio=profile.bio if profile else None,
                tags=profile.tags if profile else [],
            )
        )

    return results
