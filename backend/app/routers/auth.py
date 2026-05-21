from urllib.parse import urlencode
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.cas import (
    CasValidationError,
    cas_login_redirect_url,
    create_cas_registration_token,
    decode_cas_registration_token,
    validate_cas_ticket,
)
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.dependencies import get_db, get_current_user
from app.models import User
from app.schemas import CasRegisterRequest, LoginRequest, TokenResponse, UserOut

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, token_type="bearer", user=UserOut.model_validate(user))


@router.get("/cas/login")
def cas_login() -> RedirectResponse:
    return RedirectResponse(cas_login_redirect_url(), status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/cas/callback")
def cas_callback(ticket: str | None = None, db: Session = Depends(get_db)) -> RedirectResponse:
    frontend_callback = f"{settings.frontend_url.rstrip('/')}/cas/callback"

    if not ticket:
        return _redirect_cas_error(frontend_callback, "CAS未返回ticket，请重新登录。")

    try:
        identity = validate_cas_ticket(ticket)
    except CasValidationError as exc:
        return _redirect_cas_error(frontend_callback, f"CAS认证失败：{exc}")

    filters = [User.cas_guid == identity.guid]
    if identity.sid:
        filters.append(User.sustech_id == identity.sid)
    user = db.query(User).filter(or_(*filters)).first()

    if not user:
        registration_token = create_cas_registration_token(identity)
        return RedirectResponse(
            f"{frontend_callback}#{urlencode({'cas_registration_token': registration_token})}",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    if not user.cas_guid:
        user.cas_guid = identity.guid
    if identity.sid and not user.sustech_id:
        user.sustech_id = identity.sid
    if identity.name and not user.display_name:
        user.display_name = identity.name
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": str(user.id)})
    return RedirectResponse(
        f"{frontend_callback}#{urlencode({'token': access_token})}",
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )


@router.post("/cas/register", response_model=TokenResponse)
def cas_register(payload: CasRegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        identity = decode_cas_registration_token(payload.registration_token)
    except CasValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    existing_filters = [User.cas_guid == identity.guid]
    if identity.sid:
        existing_filters.append(User.sustech_id == identity.sid)
    existing_user = db.query(User).filter(or_(*existing_filters)).first()
    if existing_user:
        access_token = create_access_token({"sub": str(existing_user.id)})
        return TokenResponse(access_token=access_token, token_type="bearer", user=UserOut.model_validate(existing_user))

    email = payload.email.strip().lower()
    display_name = payload.display_name.strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a valid email")
    if not display_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a display name")

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=email,
        hashed_password=hash_password(uuid4().hex),
        role="member",
        display_name=display_name,
        avatar_url=payload.avatar_url,
        sustech_id=identity.sid,
        cas_guid=identity.guid,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, token_type="bearer", user=UserOut.model_validate(user))


@router.post("/cas/logout", status_code=status.HTTP_204_NO_CONTENT)
@router.get("/cas/logout", status_code=status.HTTP_204_NO_CONTENT)
def cas_single_logout() -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


def _redirect_cas_error(frontend_callback: str, message: str) -> RedirectResponse:
    return RedirectResponse(
        f"{frontend_callback}?{urlencode({'cas_error': message})}",
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )
