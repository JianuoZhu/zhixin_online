from dataclasses import dataclass
from datetime import datetime, timedelta
from urllib.parse import urlencode
from urllib.request import urlopen
from xml.etree import ElementTree

from jose import JWTError, jwt

from app.core.config import settings


CAS_NS = "{http://www.yale.edu/tp/cas}"
TOKEN_ALGORITHM = "HS256"
REGISTRATION_TOKEN_PURPOSE = "cas_registration"


@dataclass(frozen=True)
class CasIdentity:
    guid: str
    sid: str | None = None
    name: str | None = None
    raw_attributes: dict[str, str] | None = None


class CasValidationError(Exception):
    pass


def cas_service_url() -> str:
    return settings.cas_service_url or f"{settings.api_public_base_url.rstrip('/')}/api/auth/cas/callback"


def cas_login_redirect_url() -> str:
    return f"{settings.cas_login_url}?{urlencode({'service': cas_service_url()})}"


def create_cas_registration_token(identity: CasIdentity) -> str:
    payload = {
        "purpose": REGISTRATION_TOKEN_PURPOSE,
        "guid": identity.guid,
        "sid": identity.sid,
        "name": identity.name,
        "exp": datetime.utcnow() + timedelta(minutes=15),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=TOKEN_ALGORITHM)


def decode_cas_registration_token(token: str) -> CasIdentity:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[TOKEN_ALGORITHM])
    except JWTError as exc:
        raise CasValidationError("Invalid or expired CAS registration token") from exc

    if payload.get("purpose") != REGISTRATION_TOKEN_PURPOSE:
        raise CasValidationError("Invalid CAS registration token purpose")

    guid = payload.get("guid")
    if not guid:
        raise CasValidationError("CAS registration token missing GUID")

    return CasIdentity(
        guid=guid,
        sid=payload.get("sid"),
        name=payload.get("name"),
        raw_attributes={},
    )


def validate_cas_ticket(ticket: str) -> CasIdentity:
    params = urlencode({"service": cas_service_url(), "ticket": ticket})
    validate_url = f"{settings.cas_service_validate_url}?{params}"

    with urlopen(validate_url, timeout=10) as response:
        xml_payload = response.read()

    root = ElementTree.fromstring(xml_payload)
    success = root.find(f"{CAS_NS}authenticationSuccess")
    if success is None:
        failure = root.find(f"{CAS_NS}authenticationFailure")
        reason = failure.text.strip() if failure is not None and failure.text else "CAS validation failed"
        raise CasValidationError(reason)

    user_node = success.find(f"{CAS_NS}user")
    guid = user_node.text.strip() if user_node is not None and user_node.text else ""
    if not guid:
        raise CasValidationError("CAS response did not include GUID")

    attrs: dict[str, str] = {}
    attr_node = success.find(f"{CAS_NS}attributes")
    if attr_node is not None:
        for child in list(attr_node):
            key = child.tag.split("}", 1)[-1]
            if child.text:
                attrs[key] = child.text.strip()

    return CasIdentity(
        guid=guid,
        sid=attrs.get("sid"),
        name=attrs.get("name"),
        raw_attributes=attrs,
    )
