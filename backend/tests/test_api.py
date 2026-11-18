def register_and_choose_school(client, name, email, university_id):
    response = client.post("/api/v1/auth/register", json={
        "name": name,
        "email": email,
        "password": "SecureCampusPass2026",
    })
    assert response.status_code == 201
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    selected = client.put(
        "/api/v1/me/university",
        headers=headers,
        json={"university_id": university_id},
    )
    assert selected.status_code == 200
    return headers


def test_listing_feed_and_detail_are_university_scoped(client):
    schools = {row["slug"]: row["id"] for row in client.get("/api/v1/universities").json()}
    buffalo = register_and_choose_school(client, "Avery Student", "avery@buffalo.edu", schools["university-at-buffalo"])
    brooklyn = register_and_choose_school(client, "Jordan Student", "jordan@brooklyn.cuny.edu", schools["brooklyn-college"])

    created = client.post("/api/v1/listings", headers=buffalo, json={
        "title": "Campbell Biology, 12th Edition",
        "price": "89.00",
        "description": "Clean copy with no highlighting and an intact binding.",
        "category": "Textbooks",
        "condition": "Very good",
        "image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f",
        "location": "Capen Library",
    })
    assert created.status_code == 201
    listing_id = created.json()["id"]

    assert [item["id"] for item in client.get("/api/v1/listings", headers=buffalo).json()["items"]] == [listing_id]
    assert client.get(f"/api/v1/listings/{listing_id}", headers=brooklyn).status_code == 404
    assert client.get(
        f"/api/v1/public/listings/{listing_id}",
        params={"university_id": schools["brooklyn-college"]},
    ).status_code == 404


def test_university_response_includes_picker_metadata(client):
    schools = {row["slug"]: row for row in client.get("/api/v1/universities").json()}
    buffalo = schools["university-at-buffalo"]
    assert buffalo["short_name"] == "UB"
    assert buffalo["city"] == "Buffalo"
    assert buffalo["state"] == "NY"
    assert buffalo["latitude"] == 43.0008
    assert buffalo["email_domains"] == ["buffalo.edu"]
    assert buffalo["brand_color"] == "#005BBB"
    assert buffalo["initials"] == "UB"
    assert buffalo["logo_url"] == "/logos/university-at-buffalo.png"


def test_unseeded_university_has_empty_marketplace_and_events(client):
    schools = {row["slug"]: row["id"] for row in client.get("/api/v1/universities").json()}
    harvard = register_and_choose_school(client, "Casey Student", "casey@harvard.edu", schools["harvard-university"])

    feed = client.get("/api/v1/listings", headers=harvard)
    assert feed.status_code == 200
    assert feed.json()["total"] == 0
    assert feed.json()["items"] == []
    assert client.get("/api/v1/events", headers=harvard).json() == []


def test_event_detail_and_rsvp_are_university_scoped(client):
    schools = {row["slug"]: row["id"] for row in client.get("/api/v1/universities").json()}
    buffalo = register_and_choose_school(client, "Avery Student", "avery@buffalo.edu", schools["university-at-buffalo"])
    brooklyn = register_and_choose_school(client, "Jordan Student", "jordan@brooklyn.cuny.edu", schools["brooklyn-college"])

    created = client.post("/api/v1/events", headers=buffalo, json={
        "organization_name": "UB Robotics Club",
        "title": "Open Lab: Build a Line-Following Robot",
        "starts_at": "2026-12-03T18:00:00Z",
        "campus_location": "Davis Hall, Room 101",
        "description": "Build and test a small robot with parts provided by the club.",
    })
    assert created.status_code == 201
    event_id = created.json()["id"]
    assert client.get(f"/api/v1/events/{event_id}", headers=brooklyn).status_code == 404
    assert client.put(f"/api/v1/events/{event_id}/rsvp", headers=brooklyn).status_code == 404

    assert client.put(f"/api/v1/events/{event_id}/rsvp", headers=buffalo).status_code == 204
    assert client.get(f"/api/v1/events/{event_id}", headers=buffalo).json()["attendee_count"] == 1


def test_location_check_is_a_soft_signal_and_domain_badge_is_derived(client):
    schools = {row["slug"]: row["id"] for row in client.get("/api/v1/universities").json()}
    headers = register_and_choose_school(client, "Avery Student", "avery@buffalo.edu", schools["university-at-buffalo"])

    profile = client.get("/api/v1/me", headers=headers).json()
    assert profile["student_verified"] is True
    far_away = client.post("/api/v1/me/location-check", headers=headers, json={
        "latitude": 40.7128,
        "longitude": -74.0060,
    })
    assert far_away.status_code == 200
    assert far_away.json()["near_campus"] is False
    assert far_away.json()["distance_miles"] > 30

    unavailable = client.post("/api/v1/me/location-check", headers=headers, json={"unavailable": True})
    assert unavailable.status_code == 200
    assert unavailable.json()["available"] is False
    assert unavailable.json()["near_campus"] is False