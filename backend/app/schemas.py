from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, model_validator


class UniversityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    short_name: str
    city: str
    state: str
    latitude: float
    longitude: float
    email_domains: list[str]
    brand_color: str
    initials: str
    logo_url: str | None


class UserRead(BaseModel):
    id: int
    name: str
    email: EmailStr
    university: UniversityRead | None
    student_verified: bool
    created_at: datetime


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class UniversitySelectRequest(BaseModel):
    university_id: int
    password: str | None = None


class LocationCheckRequest(BaseModel):
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    demo_on_campus: bool = False
    unavailable: bool = False

    @model_validator(mode="after")
    def validate_coordinates(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be supplied together")
        if not self.demo_on_campus and not self.unavailable and self.latitude is None:
            raise ValueError("Coordinates are required unless location is unavailable")
        return self


class LocationCheckRead(BaseModel):
    available: bool
    distance_miles: float | None
    near_campus: bool
    simulated: bool
    message: str


class ListingCreate(BaseModel):
    title: str = Field(min_length=4, max_length=180)
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    description: str = Field(min_length=10, max_length=5000)
    category: str = Field(min_length=2, max_length=60)
    condition: str = Field(min_length=2, max_length=60)
    image_url: HttpUrl
    location: str = Field(min_length=2, max_length=160)


class ListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=4, max_length=180)
    price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    description: str | None = Field(default=None, min_length=10, max_length=5000)
    category: str | None = Field(default=None, min_length=2, max_length=60)
    condition: str | None = Field(default=None, min_length=2, max_length=60)
    image_url: HttpUrl | None = None
    location: str | None = Field(default=None, min_length=2, max_length=160)
    status: str | None = Field(default=None, pattern="^(available|sold)$")


class ListingSellerRead(BaseModel):
    id: int
    name: str
    university: UniversityRead
    joined_at: datetime
    student_verified: bool


class ListingRead(BaseModel):
    id: int
    university: UniversityRead
    seller: ListingSellerRead
    title: str
    price: Decimal
    description: str
    category: str
    condition: str
    image_url: str
    location: str
    status: str
    created_at: datetime
    updated_at: datetime


class ListingReportCreate(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


class EventCreate(BaseModel):
    organization_name: str = Field(min_length=2, max_length=160)
    title: str = Field(min_length=4, max_length=180)
    starts_at: datetime
    campus_location: str = Field(min_length=2, max_length=180)
    description: str = Field(min_length=10, max_length=5000)


class EventUpdate(BaseModel):
    organization_name: str | None = Field(default=None, min_length=2, max_length=160)
    title: str | None = Field(default=None, min_length=4, max_length=180)
    starts_at: datetime | None = None
    campus_location: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, min_length=10, max_length=5000)


class EventRead(BaseModel):
    id: int
    organization_name: str
    title: str
    starts_at: datetime
    campus_location: str
    description: str
    attendee_count: int
    attending: bool
    creator_id: int
    created_at: datetime


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class MessageRead(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    body: str
    created_at: datetime


class ConversationRead(BaseModel):
    id: int
    listing_id: int
    listing_title: str
    other_user_id: int
    other_user_name: str
    created_at: datetime


class PaginatedListings(BaseModel):
    items: list[ListingRead]
    page: int
    page_size: int
    total: int