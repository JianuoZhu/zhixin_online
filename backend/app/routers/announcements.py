from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_roles
from app.models import Announcement, AnnouncementRead
from app.schemas import AnnouncementCreate, AnnouncementOut, AnnouncementUpdate

router = APIRouter()


@router.get("/", response_model=list[AnnouncementOut])
def list_announcements(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[AnnouncementOut]:
    announcements = db.query(Announcement).order_by(Announcement.date.desc()).all()
    reads = (
        db.query(AnnouncementRead)
        .filter(AnnouncementRead.user_id == current_user.id)
        .all()
    )
    read_ids = {read.announcement_id for read in reads}

    results: list[AnnouncementOut] = []
    for announcement in announcements:
        ann_out = AnnouncementOut.model_validate(announcement)
        results.append(AnnouncementOut(**{**ann_out.model_dump(), "read": announcement.id in read_ids}))
    return results


@router.get("/{announcement_id}", response_model=AnnouncementOut)
def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> AnnouncementOut:
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    read = (
        db.query(AnnouncementRead)
        .filter(
            AnnouncementRead.announcement_id == announcement_id,
            AnnouncementRead.user_id == current_user.id,
        )
        .first()
    )
    ann_out = AnnouncementOut.model_validate(announcement)
    return AnnouncementOut(**{**ann_out.model_dump(), "read": bool(read)})


@router.post("/{announcement_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> None:
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    existing = (
        db.query(AnnouncementRead)
        .filter(
            AnnouncementRead.announcement_id == announcement_id,
            AnnouncementRead.user_id == current_user.id,
        )
        .first()
    )
    if not existing:
        db.add(AnnouncementRead(announcement_id=announcement_id, user_id=current_user.id))
        db.commit()


@router.post("/", response_model=AnnouncementOut, dependencies=[Depends(require_roles(["admin"]))])
def create_announcement(payload: AnnouncementCreate, db: Session = Depends(get_db)) -> AnnouncementOut:
    announcement = Announcement(**payload.model_dump())
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return AnnouncementOut.model_validate(announcement)


@router.put("/{announcement_id}", response_model=AnnouncementOut, dependencies=[Depends(require_roles(["admin"]))])
def update_announcement(
    announcement_id: int,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
) -> AnnouncementOut:
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(announcement, key, value)

    db.commit()
    db.refresh(announcement)
    return AnnouncementOut.model_validate(announcement)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles(["admin"]))])
def delete_announcement(announcement_id: int, db: Session = Depends(get_db)) -> None:
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    db.delete(announcement)
    db.commit()
