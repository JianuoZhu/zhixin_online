import csv
import io

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_roles
from app.models import Event, EventCheckin, EventRegistration, User

router = APIRouter()


@router.get("/registrations", dependencies=[Depends(require_roles(["admin"]))])
def export_registrations(event_id: int | None = None, db: Session = Depends(get_db)):
    query = (
        db.query(EventRegistration, Event, User)
        .join(Event, EventRegistration.event_id == Event.id)
        .join(User, EventRegistration.user_id == User.id)
    )
    if event_id is not None:
        query = query.filter(Event.id == event_id)
        
    rows = query.order_by(EventRegistration.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Event", "User Email", "User Name", "Registered At"])
    for reg, event, user in rows:
        writer.writerow([reg.id, event.title, user.email, user.display_name or "", str(reg.created_at or "")])

    output.seek(0)
    filename = f"registrations_event_{event_id}.csv" if event_id else "registrations_all.csv"
    
    # Encode natively to bytes with BOM for Excel
    csv_bytes = output.getvalue().encode('utf-8-sig')
    
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/checkins", dependencies=[Depends(require_roles(["admin"]))])
def export_checkins(event_id: int | None = None, db: Session = Depends(get_db)):
    query = (
        db.query(EventCheckin, Event, User)
        .join(Event, EventCheckin.event_id == Event.id)
        .join(User, EventCheckin.user_id == User.id)
    )
    if event_id is not None:
        query = query.filter(Event.id == event_id)
        
    rows = query.order_by(EventCheckin.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Event", "User Email", "User Name", "Image URL", "Checked In At"])
    for checkin, event, user in rows:
        writer.writerow([checkin.id, event.title, user.email, user.display_name or "", checkin.image_url or "", str(checkin.created_at or "")])

    output.seek(0)
    filename = f"checkins_event_{event_id}.csv" if event_id else "checkins_all.csv"
    
    # Encode natively to bytes with BOM for Excel
    csv_bytes = output.getvalue().encode('utf-8-sig')
    
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
