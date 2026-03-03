from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_roles
from app.models import Event, EventCheckin, User
from app.schemas import EventCheckinOut

router = APIRouter()


def _build_checkin(checkin: EventCheckin, event: Event, user: User) -> EventCheckinOut:
    return EventCheckinOut(
        id=checkin.id,
        event_id=checkin.event_id,
        user_id=checkin.user_id,
        event_title=event.title,
        user_email=user.email,
        user_name=user.display_name,
        image_url=checkin.image_url,
        created_at=checkin.created_at,
    )


@router.get("/mine", response_model=list[EventCheckinOut])
def list_my_checkins(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[EventCheckinOut]:
    rows = (
        db.query(EventCheckin, Event, User)
        .join(Event, EventCheckin.event_id == Event.id)
        .join(User, EventCheckin.user_id == User.id)
        .filter(EventCheckin.user_id == current_user.id)
        .order_by(EventCheckin.created_at.desc())
        .all()
    )
    return [_build_checkin(checkin, event, user) for checkin, event, user in rows]


@router.get("/", response_model=list[EventCheckinOut], dependencies=[Depends(require_roles(["admin"]))])
def list_all_checkins(db: Session = Depends(get_db)) -> list[EventCheckinOut]:
    rows = (
        db.query(EventCheckin, Event, User)
        .join(Event, EventCheckin.event_id == Event.id)
        .join(User, EventCheckin.user_id == User.id)
        .order_by(EventCheckin.created_at.desc())
        .all()
    )
    return [_build_checkin(checkin, event, user) for checkin, event, user in rows]
