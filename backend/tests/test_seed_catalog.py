from scripts.seed import EVENTS, LISTINGS, UNIVERSITIES, UNIVERSITY_LOGOS


def test_seed_has_50_complete_universities():
    assert len(UNIVERSITIES) == 50
    assert len({university["slug"] for university in UNIVERSITIES}) == 50
    assert len(UNIVERSITY_LOGOS) == 37
    assert all(
        university["name"]
        and university["short_name"]
        and university["city"]
        and university["state"]
        and -90 <= university["latitude"] <= 90
        and -180 <= university["longitude"] <= 180
        and university["email_domains"]
        and len(university["brand_color"]) == 7
        and university["initials"]
        for university in UNIVERSITIES
    )
    short_names = {university["short_name"] for university in UNIVERSITIES}
    assert {
        "Harvard", "Yale", "Princeton", "Stanford", "MIT", "Caltech", "University of Pennsylvania",
        "Dartmouth", "Brown", "Duke", "Northwestern", "University of Chicago", "Johns Hopkins",
        "Vanderbilt", "Rice", "Notre Dame", "Georgetown", "USC", "UCLA", "UC Berkeley",
        "University of Michigan", "UNC Chapel Hill", "UT Austin", "Georgia Tech",
        "SUNY Albany", "SUNY New Paltz", "SUNY Geneseo", "SUNY Cortland", "SUNY Oswego",
        "SUNY Purchase", "SUNY Fredonia", "SUNY Brockport", "SUNY Farmingdale",
        "CUNY Hunter", "CUNY Baruch", "CUNY Queens College", "CUNY Lehman", "CUNY John Jay",
    } <= short_names | {university["name"] for university in UNIVERSITIES}


def test_seeded_content_is_limited_to_ub_and_brooklyn():
    seeded_schools = {"university-at-buffalo", "brooklyn-college"}
    assert {listing[0] for listing in LISTINGS} == seeded_schools
    assert {event[0] for event in EVENTS} == seeded_schools
    assert len(LISTINGS) == 12
    assert len(EVENTS) == 6