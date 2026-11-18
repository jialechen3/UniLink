import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import get_db
from app.main import app
from app.models import Base, University


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)

    with TestingSession() as db:
        db.add_all([
            University(
                slug="university-at-buffalo",
                name="University at Buffalo",
                short_name="UB",
                city="Buffalo",
                state="NY",
                latitude=43.0008,
                longitude=-78.7890,
                email_domains=["buffalo.edu"],
                brand_color="#005BBB",
                initials="UB",
                logo_url="/logos/university-at-buffalo.png",
            ),
            University(
                slug="brooklyn-college",
                name="Brooklyn College",
                short_name="Brooklyn",
                city="Brooklyn",
                state="NY",
                latitude=40.6309,
                longitude=-73.9526,
                email_domains=["brooklyn.cuny.edu"],
                brand_color="#7A0019",
                initials="BC",
            ),
            University(
                slug="harvard-university",
                name="Harvard University",
                short_name="Harvard",
                city="Cambridge",
                state="MA",
                latitude=42.3770,
                longitude=-71.1167,
                email_domains=["harvard.edu"],
                brand_color="#A51C30",
                initials="HU",
            ),
        ])
        db.commit()

    def override_get_db():
        with TestingSession() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()