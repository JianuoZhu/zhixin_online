from datetime import date as date_type, datetime, time, timedelta
from pathlib import Path
import re
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.dependencies import get_db, get_current_user, require_roles
from app.models import Event, EventCheckin, EventRegistration, User
from app.schemas import EventCreate, EventOut, EventUpdate, EventRegistrationAdminOut

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "checkins"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def _is_checkin_window(event: Event) -> bool:
    if event.date != date_type.today():
        return False

    match = re.match(r"^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$", event.time or "")
    if not match:
        return True

    end = time(int(match.group(3)), int(match.group(4)))
    now = datetime.now().time()
    return now <= end


@router.get("", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[EventOut]:
    events = db.query(Event).order_by(Event.date.asc()).all()
    registrations = (
        db.query(EventRegistration)
        .filter(EventRegistration.user_id == current_user.id)
        .all()
    )
    registered_ids = {registration.event_id for registration in registrations}
    checkins = (
        db.query(EventCheckin)
        .filter(EventCheckin.user_id == current_user.id)
        .all()
    )
    checkin_ids = {checkin.event_id for checkin in checkins}

    results: list[EventOut] = []
    for event in events:
        event_out = EventOut.model_validate(event)
        can_check_in = event.id in registered_ids and _is_checkin_window(event)
        results.append(
            EventOut(
                **{
                    **event_out.model_dump(),
                    "registered": event.id in registered_ids,
                    "checked_in": event.id in checkin_ids,
                    "can_check_in": can_check_in,
                }
            )
        )
    return results


@router.get("/mine", response_model=list[EventOut])
def list_my_events(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[EventOut]:
    registrations = (
        db.query(EventRegistration)
        .filter(EventRegistration.user_id == current_user.id)
        .all()
    )
    event_ids = [registration.event_id for registration in registrations]
    events = db.query(Event).filter(Event.id.in_(event_ids)).order_by(Event.date.asc()).all()
    checkins = (
        db.query(EventCheckin)
        .filter(EventCheckin.user_id == current_user.id)
        .all()
    )
    checkin_ids = {checkin.event_id for checkin in checkins}
    return [
        EventOut(
            **{
                **EventOut.model_validate(event).model_dump(),
                "registered": True,
                "checked_in": event.id in checkin_ids,
                "can_check_in": _is_checkin_window(event),
            }
        )
        for event in events
    ]


@router.post("", response_model=EventOut | list[EventOut], dependencies=[Depends(require_roles(["admin"]))])
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    if payload.spots_left > payload.total_spots:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="spots_left cannot exceed total_spots")

    import copy
    
    if payload.is_recurring and payload.recurrence_end_date:
        if payload.recurrence_end_date < payload.date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="recurrence_end_date must be after start date")
            
        events_to_create = []
        current_date = payload.date
        group_id = uuid4().hex
        idx = 1
        while current_date <= payload.recurrence_end_date:
            event_data = payload.model_dump(exclude={"is_recurring", "recurrence_end_date"})
            event_data["date"] = current_date
            event_data["group_id"] = group_id
            event_data["title"] = f"{event_data['title']} (第{idx}期)"
            events_to_create.append(Event(**event_data))
            current_date += timedelta(days=7)
            idx += 1
            
        db.add_all(events_to_create)
        db.commit()
        for evt in events_to_create:
            db.refresh(evt)
        return [EventOut.model_validate(e) for e in events_to_create]
    else:
        event_data = payload.model_dump(exclude={"is_recurring", "recurrence_end_date"})
        event = Event(**event_data)
        db.add(event)
        db.commit()
        db.refresh(event)
        return EventOut.model_validate(event)


@router.put("/{event_id}", response_model=EventOut, dependencies=[Depends(require_roles(["admin"]))])
def update_event(event_id: int, payload: EventUpdate, db: Session = Depends(get_db)) -> EventOut:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)
    return EventOut.model_validate(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles(["admin"]))])
def delete_event(event_id: int, db: Session = Depends(get_db)) -> None:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    db.delete(event)
    db.commit()


@router.post("/{event_id}/register", response_model=EventOut)
def register_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> EventOut:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if event.group_id:
        group_events = db.query(Event).filter(Event.group_id == event.group_id).all()
        existing_any = db.query(EventRegistration).filter(
            EventRegistration.event_id.in_([e.id for e in group_events]),
            EventRegistration.user_id == current_user.id
        ).first()
        if existing_any:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already registered for this event series")

        registered_any = False
        for e in group_events:
            if e.spots_left > 0:
                e.spots_left -= 1
                if e.spots_left == 0:
                    e.status = "closed"
                db.add(EventRegistration(event_id=e.id, user_id=current_user.id))
                registered_any = True
        
        if not registered_any:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event series is full")
        
        db.commit()
        db.refresh(event)
    else:
        existing = (
            db.query(EventRegistration)
            .filter(EventRegistration.event_id == event_id, EventRegistration.user_id == current_user.id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already registered")

        if event.spots_left <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is full")

        event.spots_left -= 1
        if event.spots_left == 0:
            event.status = "closed"

        registration = EventRegistration(event_id=event_id, user_id=current_user.id)
        db.add(registration)
        db.commit()
        db.refresh(event)

    event_out = EventOut.model_validate(event)
    return EventOut(
        **{
            **event_out.model_dump(),
            "registered": True,
            "checked_in": False,
            "can_check_in": _is_checkin_window(event),
        }
    )


@router.delete("/{event_id}/register", response_model=EventOut)
def cancel_registration(
    event_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> EventOut:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if event.group_id:
        group_events = db.query(Event).filter(Event.group_id == event.group_id).all()
        regs = db.query(EventRegistration).filter(
            EventRegistration.event_id.in_([e.id for e in group_events]),
            EventRegistration.user_id == current_user.id
        ).all()
        
        if not regs:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not registered")
            
        for reg in regs:
            e = next((ev for ev in group_events if ev.id == reg.event_id), None)
            if e:
                e.spots_left += 1
                if e.spots_left > 0 and e.status == "closed":
                    e.status = "open"
            db.delete(reg)
            
        db.query(EventCheckin).filter(
            EventCheckin.event_id.in_([e.id for e in group_events]),
            EventCheckin.user_id == current_user.id
        ).delete(synchronize_session=False)
        
        db.commit()
        db.refresh(event)
    else:
        registration = (
            db.query(EventRegistration)
            .filter(EventRegistration.event_id == event_id, EventRegistration.user_id == current_user.id)
            .first()
        )
        if not registration:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not registered")

        event.spots_left += 1
        if event.spots_left > 0 and event.status == "closed":
            event.status = "open"

        db.delete(registration)
        db.query(EventCheckin).filter(
            EventCheckin.event_id == event_id, 
            EventCheckin.user_id == current_user.id
        ).delete(synchronize_session=False)
        
        db.commit()
        db.refresh(event)

    event_out = EventOut.model_validate(event)
    return EventOut(
        **{
            **event_out.model_dump(),
            "registered": False,
            "checked_in": False,
            "can_check_in": False,
        }
    )


@router.post("/{event_id}/checkins", response_model=EventOut)
async def create_checkin(
    event_id: int,
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> EventOut:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    registration = (
        db.query(EventRegistration)
        .filter(EventRegistration.event_id == event_id, EventRegistration.user_id == current_user.id)
        .first()
    )
    if not registration:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not registered for this event")

    if not _is_checkin_window(event):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Check-in is not available right now")

    existing = (
        db.query(EventCheckin)
        .filter(EventCheckin.event_id == event_id, EventCheckin.user_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already checked in")

    image_url = None
    if file:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only JPEG, PNG, GIF, WebP images are allowed")
        content = await file.read()
        if len(content) > settings.max_upload_size:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size exceeds 5 MB limit")
        suffix = Path(file.filename or "").suffix
        filename = f"{uuid4().hex}{suffix}"
        file_path = UPLOAD_DIR / filename
        file_path.write_bytes(content)
        image_url = f"/uploads/checkins/{filename}"

    checkin = EventCheckin(event_id=event_id, user_id=current_user.id, image_url=image_url)
    db.add(checkin)
    db.commit()

    event_out = EventOut.model_validate(event)
    return EventOut(
        **{
            **event_out.model_dump(),
            "registered": True,
            "checked_in": True,
            "can_check_in": True,
        }
    )


@router.get(
    "/registrations",
    response_model=list[EventRegistrationAdminOut],
    dependencies=[Depends(require_roles(["admin"]))],
)
def list_registrations_admin(db: Session = Depends(get_db)) -> list[EventRegistrationAdminOut]:
    rows = (
        db.query(EventRegistration, Event, User)
        .join(Event, EventRegistration.event_id == Event.id)
        .join(User, EventRegistration.user_id == User.id)
        .order_by(EventRegistration.created_at.desc())
        .all()
    )
    results: list[EventRegistrationAdminOut] = []
    for registration, event, user in rows:
        results.append(
            EventRegistrationAdminOut(
                id=registration.id,
                event_id=registration.event_id,
                user_id=registration.user_id,
                event_title=event.title,
                user_email=user.email,
                user_name=user.display_name,
                created_at=registration.created_at,
            )
        )
    return results
