from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user, require_university
from app.models import Conversation, Event, EventRSVP, Listing, ListingReport, Message, University, User
from app.schemas import (
    AuthResponse,
    ConversationRead,
    EventCreate,
    EventRead,
    EventUpdate,
    LocationCheckRead,
    LocationCheckRequest,
    ListingCreate,
    ListingRead,
    ListingReportCreate,
    ListingUpdate,
    LoginRequest,
    MessageCreate,
    MessageRead,
    PaginatedListings,
    RegisterRequest,
    UniversityRead,
    UniversitySelectRequest,
    UserRead,
)
from app.security import create_access_token, hash_password, verify_password


router = APIRouter()


def domain_matches(email: str, university: University | None) -> bool:
    if university is None:
        return False
    domain = email.rpartition("@")[2].lower()
    return any(domain == allowed.lower().lstrip("@") for allowed in university.email_domains)


def user_read(user: User) -> UserRead:
    return UserRead(
        id=user.id,
        name=user.name,
        email=user.email,
        university=user.university,
        student_verified=domain_matches(user.email, user.university),
        created_at=user.created_at,
    )


def listing_read(listing: Listing) -> ListingRead:
    return ListingRead(
        id=listing.id,
        university=listing.university,
        seller={
            "id": listing.seller.id,
            "name": listing.seller.name,
            "university": listing.university,
            "joined_at": listing.seller.created_at,
            "student_verified": domain_matches(listing.seller.email, listing.university),
        },
        title=listing.title,
        price=listing.price,
        description=listing.description,
        category=listing.category,
        condition=listing.condition,
        image_url=listing.image_url,
        location=listing.location,
        status=listing.status,
        created_at=listing.created_at,
        updated_at=listing.updated_at,
    )


def scoped_listing(db: Session, listing_id: int, university_id: int) -> Listing:
    listing = db.scalar(
        select(Listing).where(Listing.id == listing_id, Listing.university_id == university_id)
    )
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


def scoped_event(db: Session, event_id: int, university_id: int) -> Event:
    event = db.scalar(select(Event).where(Event.id == event_id, Event.university_id == university_id))
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


def event_read(db: Session, event: Event, user_id: int) -> EventRead:
    attendee_count = db.scalar(
        select(func.count()).select_from(EventRSVP).where(EventRSVP.event_id == event.id)
    ) or 0
    attending = db.scalar(
        select(EventRSVP.id).where(EventRSVP.event_id == event.id, EventRSVP.user_id == user_id)
    ) is not None
    return EventRead(
        id=event.id,
        organization_name=event.organization_name,
        title=event.title,
        starts_at=event.starts_at,
        campus_location=event.campus_location,
        description=event.description,
        attendee_count=attendee_count,
        attending=attending,
        creator_id=event.creator_id,
        created_at=event.created_at,
    )


def get_conversation(db: Session, conversation_id: int, user: User) -> Conversation:
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.university_id == user.university_id,
            or_(Conversation.buyer_id == user.id, Conversation.seller_id == user.id),
        )
    )
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(access_token=create_access_token(user.id), user=user_read(user))


@router.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    return AuthResponse(access_token=create_access_token(user.id), user=user_read(user))


@router.get("/universities", response_model=list[UniversityRead])
def list_universities(db: Session = Depends(get_db)):
    return list(db.scalars(select(University).order_by(University.name)).all())


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user_read(user)


@router.put("/me/university", response_model=UserRead)
def select_university(
    payload: UniversitySelectRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    university = db.get(University, payload.university_id)
    if university is None:
        raise HTTPException(status_code=404, detail="University not found")
    if user.university_id is not None:
        if payload.password is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=403, detail="Re-enter your password to change universities")
    user.university_id = university.id
    db.commit()
    db.refresh(user)
    return user_read(user)


@router.post("/me/location-check", response_model=LocationCheckRead)
def location_check(
    payload: LocationCheckRequest,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    university = db.get(University, user.university_id)
    if university is None:
        raise HTTPException(status_code=409, detail="University is not available")
    if payload.demo_on_campus:
        return LocationCheckRead(
            available=True,
            distance_miles=0,
            near_campus=True,
            simulated=True,
            message="Demo location: near campus",
        )
    if payload.unavailable or payload.latitude is None or payload.longitude is None:
        return LocationCheckRead(
            available=False,
            distance_miles=None,
            near_campus=False,
            simulated=False,
            message="Location is unavailable. You can continue without it.",
        )
    distance_miles = haversine_miles(
        payload.latitude,
        payload.longitude,
        university.latitude,
        university.longitude,
    )
    near_campus = distance_miles <= 30
    return LocationCheckRead(
        available=True,
        distance_miles=round(distance_miles, 1),
        near_campus=near_campus,
        simulated=False,
        message="Near campus" if near_campus else "You are more than 30 miles from campus; you can still continue.",
    )


def haversine_miles(latitude_a: float, longitude_a: float, latitude_b: float, longitude_b: float) -> float:
    earth_radius_miles = 3958.7613
    delta_lat = radians(latitude_b - latitude_a)
    delta_lon = radians(longitude_b - longitude_a)
    haversine = sin(delta_lat / 2) ** 2 + cos(radians(latitude_a)) * cos(radians(latitude_b)) * sin(delta_lon / 2) ** 2
    return 2 * earth_radius_miles * asin(sqrt(haversine))


@router.get("/public/listings", response_model=PaginatedListings)
def public_listings(
    university_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=48),
    category: str | None = None,
    q: str | None = Query(default=None, max_length=120),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    sort: str = Query(default="newest", pattern="^(newest|price_asc|price_desc)$"),
    db: Session = Depends(get_db),
):
    if db.get(University, university_id) is None:
        raise HTTPException(status_code=404, detail="University not found")
    return listing_page(db, university_id, page, page_size, category, q, min_price, max_price, sort)


@router.get("/public/listings/{listing_id}", response_model=ListingRead)
def public_listing(listing_id: int, university_id: int, db: Session = Depends(get_db)):
    return listing_read(scoped_listing(db, listing_id, university_id))


def listing_page(
    db: Session,
    university_id: int,
    page: int,
    page_size: int,
    category: str | None,
    q: str | None,
    min_price: float | None,
    max_price: float | None,
    sort: str,
) -> PaginatedListings:
    filters = [Listing.university_id == university_id, Listing.status == "available"]
    if category:
        filters.append(Listing.category == category)
    if q:
        needle = f"%{q.strip()}%"
        filters.append(or_(Listing.title.ilike(needle), Listing.description.ilike(needle)))
    if min_price is not None:
        filters.append(Listing.price >= min_price)
    if max_price is not None:
        filters.append(Listing.price <= max_price)
    ordering = {
        "newest": Listing.created_at.desc(),
        "price_asc": Listing.price.asc(),
        "price_desc": Listing.price.desc(),
    }[sort]
    total = db.scalar(select(func.count()).select_from(Listing).where(*filters)) or 0
    listings = db.scalars(
        select(Listing).where(*filters).order_by(ordering, Listing.id.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return PaginatedListings(
        items=[listing_read(listing) for listing in listings],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/listings", response_model=PaginatedListings)
def listings(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=48),
    category: str | None = None,
    q: str | None = Query(default=None, max_length=120),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    sort: str = Query(default="newest", pattern="^(newest|price_asc|price_desc)$"),
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    return listing_page(db, user.university_id, page, page_size, category, q, min_price, max_price, sort)


@router.get("/listings/mine", response_model=list[ListingRead])
def my_listings(user: User = Depends(require_university), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Listing).where(
            Listing.university_id == user.university_id,
            Listing.seller_id == user.id,
        ).order_by(Listing.created_at.desc())
    ).all()
    return [listing_read(row) for row in rows]


@router.post("/listings", response_model=ListingRead, status_code=status.HTTP_201_CREATED)
def create_listing(
    payload: ListingCreate,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    listing = Listing(
        **payload.model_dump(exclude={"image_url"}),
        image_url=str(payload.image_url),
        university_id=user.university_id,
        seller_id=user.id,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing_read(listing)


@router.get("/listings/{listing_id}", response_model=ListingRead)
def get_listing(
    listing_id: int,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    return listing_read(scoped_listing(db, listing_id, user.university_id))


@router.patch("/listings/{listing_id}", response_model=ListingRead)
def update_listing(
    listing_id: int,
    payload: ListingUpdate,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    listing = scoped_listing(db, listing_id, user.university_id)
    if listing.seller_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own listing")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(listing, key, str(value) if key == "image_url" and value is not None else value)
    db.commit()
    db.refresh(listing)
    return listing_read(listing)


@router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(
    listing_id: int,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    listing = scoped_listing(db, listing_id, user.university_id)
    if listing.seller_id != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own listing")
    db.delete(listing)
    db.commit()


@router.post("/listings/{listing_id}/reports", status_code=status.HTTP_201_CREATED)
def report_listing(
    listing_id: int,
    payload: ListingReportCreate,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    listing = scoped_listing(db, listing_id, user.university_id)
    if listing.seller_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot report your own listing")
    if db.scalar(select(ListingReport.id).where(
        ListingReport.listing_id == listing.id,
        ListingReport.reporter_id == user.id,
    )) is not None:
        raise HTTPException(status_code=409, detail="You have already reported this listing")
    report = ListingReport(listing_id=listing.id, reporter_id=user.id, reason=payload.reason)
    db.add(report)
    db.commit()
    return {"reported": True}


@router.get("/events", response_model=list[EventRead])
def events(user: User = Depends(require_university), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Event).where(
            Event.university_id == user.university_id,
            Event.starts_at >= datetime.now(timezone.utc),
        ).order_by(Event.starts_at)
    ).all()
    return [event_read(db, row, user.id) for row in rows]


@router.get("/events/mine", response_model=list[EventRead])
def my_events(user: User = Depends(require_university), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Event).where(
            Event.university_id == user.university_id,
            Event.creator_id == user.id,
        ).order_by(Event.starts_at)
    ).all()
    return [event_read(db, row, user.id) for row in rows]


@router.post("/events", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    event = Event(**payload.model_dump(), university_id=user.university_id, creator_id=user.id)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event_read(db, event, user.id)


@router.get("/events/{event_id}", response_model=EventRead)
def get_event(
    event_id: int,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    return event_read(db, scoped_event(db, event_id, user.university_id), user.id)


@router.patch("/events/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    payload: EventUpdate,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    event = scoped_event(db, event_id, user.university_id)
    if event.creator_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own event")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event_read(db, event, user.id)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    event = scoped_event(db, event_id, user.university_id)
    if event.creator_id != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own event")
    db.delete(event)
    db.commit()


@router.put("/events/{event_id}/rsvp", status_code=status.HTTP_204_NO_CONTENT)
def rsvp_event(
    event_id: int,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    event = scoped_event(db, event_id, user.university_id)
    existing = db.scalar(select(EventRSVP).where(EventRSVP.event_id == event.id, EventRSVP.user_id == user.id))
    if existing is None:
        db.add(EventRSVP(event_id=event.id, user_id=user.id))
        db.commit()


@router.delete("/events/{event_id}/rsvp", status_code=status.HTTP_204_NO_CONTENT)
def cancel_rsvp(
    event_id: int,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    event = scoped_event(db, event_id, user.university_id)
    existing = db.scalar(select(EventRSVP).where(EventRSVP.event_id == event.id, EventRSVP.user_id == user.id))
    if existing is not None:
        db.delete(existing)
        db.commit()


@router.post("/listings/{listing_id}/conversation", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
def start_conversation(
    listing_id: int,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    listing = scoped_listing(db, listing_id, user.university_id)
    if listing.seller_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot message yourself")
    conversation = db.scalar(
        select(Conversation).where(Conversation.listing_id == listing.id, Conversation.buyer_id == user.id)
    )
    if conversation is None:
        conversation = Conversation(
            listing_id=listing.id,
            university_id=user.university_id,
            buyer_id=user.id,
            seller_id=listing.seller_id,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    other_user = conversation.seller if conversation.buyer_id == user.id else conversation.buyer
    return ConversationRead(
        id=conversation.id,
        listing_id=listing.id,
        listing_title=listing.title,
        other_user_id=other_user.id,
        other_user_name=other_user.name,
        created_at=conversation.created_at,
    )


@router.get("/conversations", response_model=list[ConversationRead])
def conversations(user: User = Depends(require_university), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Conversation).where(
            Conversation.university_id == user.university_id,
            or_(Conversation.buyer_id == user.id, Conversation.seller_id == user.id),
        ).order_by(Conversation.created_at.desc())
    ).all()
    result = []
    for row in rows:
        other_user = row.seller if row.buyer_id == user.id else row.buyer
        result.append(ConversationRead(
            id=row.id,
            listing_id=row.listing.id,
            listing_title=row.listing.title,
            other_user_id=other_user.id,
            other_user_name=other_user.name,
            created_at=row.created_at,
        ))
    return result


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageRead])
def conversation_messages(
    conversation_id: int,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    conversation = get_conversation(db, conversation_id, user)
    messages = db.scalars(
        select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at, Message.id)
    ).all()
    return [MessageRead(
        id=message.id,
        sender_id=message.sender_id,
        sender_name=message.sender.name,
        body=message.body,
        created_at=message.created_at,
    ) for message in messages]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: int,
    payload: MessageCreate,
    user: User = Depends(require_university),
    db: Session = Depends(get_db),
):
    conversation = get_conversation(db, conversation_id, user)
    message = Message(conversation_id=conversation.id, sender_id=user.id, body=payload.body.strip())
    db.add(message)
    db.commit()
    db.refresh(message)
    return MessageRead(
        id=message.id,
        sender_id=user.id,
        sender_name=user.name,
        body=message.body,
        created_at=message.created_at,
    )