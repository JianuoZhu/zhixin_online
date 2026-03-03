from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_roles
from app.models import Room, RoomBooking, User
from app.schemas import RoomBookingCreate, RoomBookingOut, RoomCreate, RoomOut

router = APIRouter()


@router.get("/", response_model=list[RoomOut])
def list_rooms(
    date: date | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[RoomOut]:
    rooms = db.query(Room).order_by(Room.id.asc()).all()
    results: list[RoomOut] = []

    for room in rooms:
        bookings: list[RoomBookingOut] = []
        if date:
            booking_rows = (
                db.query(RoomBooking, User)
                .join(User, RoomBooking.user_id == User.id)
                .filter(RoomBooking.room_id == room.id, RoomBooking.date == date)
                .order_by(RoomBooking.start_hour.asc())
                .all()
            )
            for booking, user in booking_rows:
                booking_out = RoomBookingOut.model_validate(booking)
                bookings.append(
                    RoomBookingOut(
                        **{**booking_out.model_dump(), "user_name": user.display_name or user.email}
                    )
                )

        room_out = RoomOut.model_validate(room)
        results.append(RoomOut(**{**room_out.model_dump(), "bookings": bookings}))

    return results


@router.post("/", response_model=RoomOut, dependencies=[Depends(require_roles(["admin"]))])
def create_room(payload: RoomCreate, db: Session = Depends(get_db)) -> RoomOut:
    room = Room(**payload.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return RoomOut.model_validate(room)


@router.post("/{room_id}/bookings", response_model=RoomBookingOut)
def create_booking(
    room_id: int,
    payload: RoomBookingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> RoomBookingOut:
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    if payload.start_hour >= payload.end_hour:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid time range")

    conflict = (
        db.query(RoomBooking)
        .filter(
            RoomBooking.room_id == room_id,
            RoomBooking.date == payload.date,
            RoomBooking.start_hour < payload.end_hour,
            RoomBooking.end_hour > payload.start_hour,
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Time slot already booked")

    booking = RoomBooking(
        room_id=room_id,
        user_id=current_user.id,
        date=payload.date,
        start_hour=payload.start_hour,
        end_hour=payload.end_hour,
        participants=payload.participants,
        reason=payload.reason,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    booking_out = RoomBookingOut.model_validate(booking)
    return RoomBookingOut(
        **{**booking_out.model_dump(), "user_name": current_user.display_name or current_user.email}
    )


@router.delete("/{room_id}/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_booking(
    room_id: int,
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> None:
    booking = (
        db.query(RoomBooking)
        .filter(RoomBooking.id == booking_id, RoomBooking.room_id == room_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot cancel another user's booking")

    db.delete(booking)
    db.commit()


@router.get("/bookings/mine", response_model=list[RoomBookingOut])
def list_my_bookings(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[RoomBookingOut]:
    bookings = (
        db.query(RoomBooking)
        .filter(RoomBooking.user_id == current_user.id)
        .order_by(RoomBooking.date.asc(), RoomBooking.start_hour.asc())
        .all()
    )
    return [
        RoomBookingOut(
            **{**RoomBookingOut.model_validate(booking).model_dump(), "user_name": current_user.display_name or current_user.email}
        )
        for booking in bookings
    ]
