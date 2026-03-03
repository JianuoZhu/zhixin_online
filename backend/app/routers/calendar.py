from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models import CalendarItem, Event, EventRegistration, Room, RoomBooking
from app.schemas import CalendarItemCreate, CalendarItemOut

router = APIRouter()


@router.get("/", response_model=list[CalendarItemOut])
def list_calendar_items(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[CalendarItemOut]:
    items: list[CalendarItemOut] = []

    registrations = (
        db.query(EventRegistration, Event)
        .join(Event, EventRegistration.event_id == Event.id)
        .filter(EventRegistration.user_id == current_user.id)
        .all()
    )
    for registration, event in registrations:
        items.append(
            CalendarItemOut(
                id=event.id,
                user_id=current_user.id,
                title=event.title,
                date=event.date,
                color="info",
                source="event",
            )
        )

    bookings = (
        db.query(RoomBooking, Room)
        .join(Room, RoomBooking.room_id == Room.id)
        .filter(RoomBooking.user_id == current_user.id)
        .all()
    )
    for booking, room in bookings:
        items.append(
            CalendarItemOut(
                id=booking.id,
                user_id=current_user.id,
                title=f"Room Booking: {room.name}",
                date=booking.date,
                color="success",
                source="booking",
            )
        )

    custom_items = db.query(CalendarItem).filter(CalendarItem.user_id == current_user.id).all()
    for item in custom_items:
        items.append(CalendarItemOut.model_validate(item))

    return items


@router.post("/", response_model=CalendarItemOut)
def create_calendar_item(
    payload: CalendarItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> CalendarItemOut:
    item = CalendarItem(
        user_id=current_user.id,
        title=payload.title,
        date=payload.date,
        color=payload.color,
        source="custom",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return CalendarItemOut.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calendar_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> None:
    item = db.query(CalendarItem).filter(
        CalendarItem.id == item_id,
        CalendarItem.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar item not found")
    db.delete(item)
    db.commit()
