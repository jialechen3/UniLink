from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Event, Listing, University, User
from app.security import hash_password


def university(slug, name, short_name, city, state, latitude, longitude, domain, brand_color, initials):
    return {
        "slug": slug,
        "name": name,
        "short_name": short_name,
        "city": city,
        "state": state,
        "latitude": latitude,
        "longitude": longitude,
        "email_domains": [domain],
        "brand_color": brand_color,
        "initials": initials,
    }


UNIVERSITIES = [
    university("university-at-buffalo", "University at Buffalo", "UB", "Buffalo", "NY", 42.9990, -78.7890, "buffalo.edu", "#005BBB", "UB"),
    university("brooklyn-college", "Brooklyn College", "Brooklyn", "Brooklyn", "NY", 40.6309, -73.9526, "brooklyn.cuny.edu", "#7A0019", "BC"),
    university("nyu", "New York University", "NYU", "New York", "NY", 40.7295, -73.9965, "nyu.edu", "#57068C", "NYU"),
    university("columbia-university", "Columbia University", "Columbia", "New York", "NY", 40.8075, -73.9626, "columbia.edu", "#1D4F91", "CU"),
    university("cornell-university", "Cornell University", "Cornell", "Ithaca", "NY", 42.4534, -76.4735, "cornell.edu", "#B31B1B", "CU"),
    university("syracuse-university", "Syracuse University", "Syracuse", "Syracuse", "NY", 43.0392, -76.1351, "syr.edu", "#F76900", "SU"),
    university("binghamton-university", "Binghamton University", "Binghamton", "Vestal", "NY", 42.0896, -75.9695, "binghamton.edu", "#005A43", "BU"),
    university("stony-brook-university", "Stony Brook University", "Stony Brook", "Stony Brook", "NY", 40.9126, -73.1235, "stonybrook.edu", "#990000", "SBU"),
    university("university-of-rochester", "University of Rochester", "Rochester", "Rochester", "NY", 43.1288, -77.6290, "rochester.edu", "#003B71", "UR"),
    university("city-college-of-new-york", "The City College of New York", "CCNY", "New York", "NY", 40.8200, -73.9496, "ccny.cuny.edu", "#0039A6", "CCNY"),
    university("harvard-university", "Harvard University", "Harvard", "Cambridge", "MA", 42.3770, -71.1167, "harvard.edu", "#A51C30", "HU"),
    university("yale-university", "Yale University", "Yale", "New Haven", "CT", 41.3163, -72.9223, "yale.edu", "#00356B", "YU"),
    university("princeton-university", "Princeton University", "Princeton", "Princeton", "NJ", 40.3431, -74.6551, "princeton.edu", "#E77500", "PU"),
    university("stanford-university", "Stanford University", "Stanford", "Stanford", "CA", 37.4275, -122.1697, "stanford.edu", "#8C1515", "SU"),
    university("massachusetts-institute-of-technology", "Massachusetts Institute of Technology", "MIT", "Cambridge", "MA", 42.3601, -71.0942, "mit.edu", "#750014", "MIT"),
    university("california-institute-of-technology", "California Institute of Technology", "Caltech", "Pasadena", "CA", 34.1377, -118.1253, "caltech.edu", "#FF6C0C", "CIT"),
    university("university-of-pennsylvania", "University of Pennsylvania", "Penn", "Philadelphia", "PA", 39.9522, -75.1932, "upenn.edu", "#011F5B", "UPenn"),
    university("dartmouth-college", "Dartmouth College", "Dartmouth", "Hanover", "NH", 43.7044, -72.2887, "dartmouth.edu", "#00693E", "DU"),
    university("brown-university", "Brown University", "Brown", "Providence", "RI", 41.8268, -71.4025, "brown.edu", "#4E3629", "BU"),
    university("duke-university", "Duke University", "Duke", "Durham", "NC", 36.0014, -78.9382, "duke.edu", "#012169", "DU"),
    university("northwestern-university", "Northwestern University", "Northwestern", "Evanston", "IL", 42.0565, -87.6753, "northwestern.edu", "#4E2A84", "NU"),
    university("university-of-chicago", "University of Chicago", "UChicago", "Chicago", "IL", 41.7886, -87.5987, "uchicago.edu", "#800000", "UChi"),
    university("johns-hopkins-university", "Johns Hopkins University", "Johns Hopkins", "Baltimore", "MD", 39.3299, -76.6205, "jhu.edu", "#68ACE5", "JHU"),
    university("vanderbilt-university", "Vanderbilt University", "Vanderbilt", "Nashville", "TN", 36.1447, -86.8027, "vanderbilt.edu", "#866D4B", "VU"),
    university("rice-university", "Rice University", "Rice", "Houston", "TX", 29.7174, -95.4018, "rice.edu", "#00205B", "RU"),
    university("university-of-notre-dame", "University of Notre Dame", "Notre Dame", "Notre Dame", "IN", 41.7056, -86.2353, "nd.edu", "#0C2340", "ND"),
    university("georgetown-university", "Georgetown University", "Georgetown", "Washington", "DC", 38.9076, -77.0723, "georgetown.edu", "#041E42", "GU"),
    university("university-of-southern-california", "University of Southern California", "USC", "Los Angeles", "CA", 34.0224, -118.2851, "usc.edu", "#990000", "USC"),
    university("university-of-california-los-angeles", "University of California, Los Angeles", "UCLA", "Los Angeles", "CA", 34.0689, -118.4452, "ucla.edu", "#2774AE", "UCLA"),
    university("university-of-california-berkeley", "University of California, Berkeley", "UC Berkeley", "Berkeley", "CA", 37.8719, -122.2585, "berkeley.edu", "#003262", "Cal"),
    university("university-of-michigan", "University of Michigan", "Michigan", "Ann Arbor", "MI", 42.2780, -83.7382, "umich.edu", "#00274C", "UM"),
    university("university-of-north-carolina-chapel-hill", "University of North Carolina at Chapel Hill", "UNC Chapel Hill", "Chapel Hill", "NC", 35.9049, -79.0469, "unc.edu", "#4B9CD3", "UNC"),
    university("university-of-texas-austin", "University of Texas at Austin", "UT Austin", "Austin", "TX", 30.2849, -97.7341, "utexas.edu", "#BF5700", "UT"),
    university("georgia-institute-of-technology", "Georgia Institute of Technology", "Georgia Tech", "Atlanta", "GA", 33.7756, -84.3963, "gatech.edu", "#B3A369", "GT"),
    university("university-at-albany", "University at Albany, SUNY", "SUNY Albany", "Albany", "NY", 42.6873, -73.8230, "albany.edu", "#46166B", "UA"),
    university("suny-new-paltz", "SUNY New Paltz", "SUNY New Paltz", "New Paltz", "NY", 41.7476, -74.0868, "newpaltz.edu", "#006747", "NP"),
    university("suny-geneseo", "SUNY Geneseo", "SUNY Geneseo", "Geneseo", "NY", 42.7959, -77.8197, "geneseo.edu", "#1E4D2B", "GEN"),
    university("suny-cortland", "SUNY Cortland", "SUNY Cortland", "Cortland", "NY", 42.6021, -76.1794, "cortland.edu", "#C8102E", "SC"),
    university("suny-oswego", "SUNY Oswego", "SUNY Oswego", "Oswego", "NY", 43.4535, -76.5442, "oswego.edu", "#F58426", "OSU"),
    university("buffalo-state-university", "Buffalo State University", "Buffalo State", "Buffalo", "NY", 42.9337, -78.8904, "buffalostate.edu", "#00583C", "BSU"),
    university("purchase-college-suny", "Purchase College, SUNY", "SUNY Purchase", "Purchase", "NY", 41.0474, -73.7145, "purchase.edu", "#003DA5", "PC"),
    university("suny-fredonia", "SUNY Fredonia", "SUNY Fredonia", "Fredonia", "NY", 42.4507, -79.3320, "fredonia.edu", "#0033A0", "FSU"),
    university("suny-brockport", "SUNY Brockport", "SUNY Brockport", "Brockport", "NY", 43.2137, -77.9395, "brockport.edu", "#006341", "BPORT"),
    university("farmingdale-state-college", "Farmingdale State College", "SUNY Farmingdale", "Farmingdale", "NY", 40.7526, -73.4257, "farmingdale.edu", "#007A53", "FSC"),
    university("hunter-college", "Hunter College", "CUNY Hunter", "New York", "NY", 40.7687, -73.9647, "hunter.cuny.edu", "#007A33", "HC"),
    university("baruch-college", "Baruch College", "CUNY Baruch", "New York", "NY", 40.7402, -73.9838, "baruch.cuny.edu", "#006747", "BC"),
    university("queens-college", "Queens College", "CUNY Queens College", "Queens", "NY", 40.7365, -73.8163, "qc.cuny.edu", "#005A9C", "QC"),
    university("lehman-college", "Lehman College", "CUNY Lehman", "Bronx", "NY", 40.8731, -73.8930, "lehman.cuny.edu", "#00539B", "LC"),
    university("john-jay-college", "John Jay College of Criminal Justice", "CUNY John Jay", "New York", "NY", 40.7704, -73.9887, "jjay.cuny.edu", "#C8102E", "JJ"),
    university("rensselaer-polytechnic-institute", "Rensselaer Polytechnic Institute", "RPI", "Troy", "NY", 42.7298, -73.6789, "rpi.edu", "#C8102E", "RPI"),
]

UNIVERSITY_LOGOS = {
    "university-at-buffalo": "/logos/university-at-buffalo.png",
    "brooklyn-college": "/logos/brooklyn-college.png",
    "nyu": "/logos/nyu.svg",
    "columbia-university": "/logos/columbia-university.svg",
    "cornell-university": "/logos/cornell-university.png",
    "syracuse-university": "/logos/syracuse-university.png",
    "binghamton-university": "/logos/binghamton-university.png",
    "stony-brook-university": "/logos/stony-brook-university.png",
    "university-of-rochester": "/logos/university-of-rochester.png",
    "city-college-of-new-york": "/logos/city-college-of-new-york.png",
    "harvard-university": "/logos/harvard-university.png",
    "yale-university": "/logos/yale-university.png",
    "princeton-university": "/logos/princeton-university.png",
    "stanford-university": "/logos/stanford-university.png",
    "university-of-pennsylvania": "/logos/university-of-pennsylvania.png",
    "northwestern-university": "/logos/northwestern-university.png",
    "university-of-notre-dame": "/logos/university-of-notre-dame.png",
    "georgetown-university": "/logos/georgetown-university.png",
    "university-of-southern-california": "/logos/university-of-southern-california.png",
    "university-of-california-los-angeles": "/logos/university-of-california-los-angeles.png",
    "university-of-california-berkeley": "/logos/university-of-california-berkeley.png",
    "university-of-michigan": "/logos/university-of-michigan.png",
    "university-of-north-carolina-chapel-hill": "/logos/university-of-north-carolina-chapel-hill.png",
    "georgia-institute-of-technology": "/logos/georgia-institute-of-technology.png",
    "university-at-albany": "/logos/university-at-albany.png",
    "suny-new-paltz": "/logos/suny-new-paltz.png",
    "suny-geneseo": "/logos/suny-geneseo.png",
    "suny-oswego": "/logos/suny-oswego.png",
    "buffalo-state-university": "/logos/buffalo-state-university.png",
    "purchase-college-suny": "/logos/suny-purchase.png",
    "suny-fredonia": "/logos/suny-fredonia.png",
    "suny-brockport": "/logos/suny-brockport.png",
    "farmingdale-state-college": "/logos/farmingdale.jpg",
    "baruch-college": "/logos/baruch-college.png",
    "queens-college": "/logos/queens-college.png",
    "john-jay-college": "/logos/john-jay-college.png",
    "rensselaer-polytechnic-institute": "/logos/rensselaer-polytechnic-institute.png",
}

for school in UNIVERSITIES:
    school["logo_url"] = UNIVERSITY_LOGOS.get(school["slug"])

LISTINGS = [
    ("university-at-buffalo", "Campbell Biology, 12th Edition", "89.00", "Biology", "Very good", "Used for BIO 200. No highlighting, spine is intact, access code not included.", "North Campus, Ellicott Complex"),
    ("university-at-buffalo", "Calculus: Early Transcendentals, 9th Edition", "72.00", "Textbooks", "Good", "Light highlighting on 3 pages; all problem sets and diagrams are clean.", "North Campus, Capen Library"),
    ("university-at-buffalo", "TI-84 Plus CE Graphing Calculator", "68.00", "Electronics", "Good", "Screen is clear and every key works. Includes a USB charging cable.", "North Campus, Student Union"),
    ("university-at-buffalo", "IKEA LINNMON Desk, white, 47 inch", "35.00", "Furniture", "Fair", "Sturdy desk with two small surface marks near the back edge. Legs included.", "South Campus, Goodyear Hall"),
    ("university-at-buffalo", "The Norton Anthology of American Literature, Vol. 1", "28.00", "Textbooks", "Good", "Binding is solid. A few pencil notes in the margins of the introduction.", "North Campus, Silverman Library"),
    ("university-at-buffalo", "Patagonia Refugio Daypack 26L", "42.00", "Clothing", "Very good", "Clean, working zippers, no tears. Fits a 15-inch laptop.", "North Campus, Greiner Hall"),
    ("brooklyn-college", "Organic Chemistry, 10th Edition, Klein", "96.00", "Textbooks", "Good", "Light highlighting on 3 pages and a name inside the cover; no missing pages.", "Whitehead Hall, near the chemistry labs"),
    ("brooklyn-college", "Introduction to Psychology, 12th Edition, Myers", "54.00", "Textbooks", "Very good", "Clean copy with a few dog-eared pages. Used for PSYC 1000.", "West Quad Center, lobby"),
    ("brooklyn-college", "Casio fx-991EX ClassWiz Scientific Calculator", "18.00", "Electronics", "Good", "All functions tested. Includes the hard case; solar and battery powered.", "Boylan Hall, main entrance"),
    ("brooklyn-college", "Black metal desk lamp with adjustable arm", "12.00", "Home", "Very good", "Warm LED bulb included. Clamp and joints hold securely.", "Roosevelt Hall, ground floor"),
    ("brooklyn-college", "Molecular Biology of the Cell, 7th Edition", "110.00", "Textbooks", "Good", "Light pencil notes in two chapters, otherwise clean with an intact cover.", "Library Cafe, ground floor"),
    ("brooklyn-college", "North Face Borealis backpack, black", "48.00", "Clothing", "Good", "Recently washed, zippers work smoothly, minor wear on the bottom panel.", "West Quad Center, near the bookstore"),
]

LISTING_IMAGES = [
    "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=960&q=85",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=960&q=85",
    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=960&q=85",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=960&q=85",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=960&q=85",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=960&q=85",
    "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=960&q=85",
    "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=960&q=85",
    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=960&q=85",
    "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=960&q=85",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=960&q=85",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=960&q=85",
]

EVENTS = [
    ("university-at-buffalo", "UB Robotics Club", "Open Lab: Build a Line-Following Robot", "2026-12-03T23:00:00+00:00", "Davis Hall, Room 101", "Bring a laptop if you have one. The club will provide the microcontroller kits and walk through sensor calibration."),
    ("university-at-buffalo", "UB Student Sustainability", "Winter Clothing Repair Workshop", "2026-12-05T21:30:00+00:00", "Student Union, Room 145", "Learn basic mending and patching techniques. Needles, thread, and patches are provided; bring one garment to repair."),
    ("university-at-buffalo", "International Students Organization", "End-of-Semester Potluck", "2026-12-10T22:00:00+00:00", "Student Union, Social Hall", "Share a dish or come to meet people from across campus. Please include ingredient information with homemade food."),
    ("brooklyn-college", "Brooklyn College Computer Science Club", "Student Project Showcase", "2026-12-02T23:30:00+00:00", "Ingersoll Hall, Room 1201", "Short demos from student projects, followed by open networking. Projects at any stage are welcome."),
    ("brooklyn-college", "Brooklyn College Film Society", "Documentary Screening and Discussion", "2026-12-04T22:00:00+00:00", "Whitehead Hall, Room 112", "A campus screening followed by a moderated discussion on documentary storytelling and ethics."),
    ("brooklyn-college", "BC Garden Club", "Community Garden Planning Meet-up", "2026-12-09T21:00:00+00:00", "West Quad Center, Room 211", "Help plan the spring planting calendar, choose seeds, and organize volunteer shifts. New members are welcome."),
]


def get_or_create_university(db, values):
    university = db.scalar(select(University).where(University.slug == values["slug"]))
    if university is None:
        university = University(**values)
        db.add(university)
        db.flush()
    else:
        for key, value in values.items():
            setattr(university, key, value)
    return university


def main():
    with SessionLocal() as db:
        universities = {values["slug"]: get_or_create_university(db, values) for values in UNIVERSITIES}
        db.flush()

        demo_accounts = [
            ("Maya Chen", "maya.chen@buffalo.edu", "university-at-buffalo"),
            ("Ethan Brooks", "ethan.brooks@buffalo.edu", "university-at-buffalo"),
            ("Leila Hassan", "leila.hassan@brooklyn.cuny.edu", "brooklyn-college"),
            ("Noah Rivera", "noah.rivera@brooklyn.cuny.edu", "brooklyn-college"),
        ]
        users = {}
        for name, email, university_slug in demo_accounts:
            user = db.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(
                    name=name,
                    email=email,
                    password_hash=hash_password("CampusDemo2026!"),
                    university_id=universities[university_slug].id,
                )
                db.add(user)
                db.flush()
            users[email] = user

        listing_sellers = [
            "maya.chen@buffalo.edu", "ethan.brooks@buffalo.edu",
            "maya.chen@buffalo.edu", "ethan.brooks@buffalo.edu",
            "maya.chen@buffalo.edu", "ethan.brooks@buffalo.edu",
            "leila.hassan@brooklyn.cuny.edu", "noah.rivera@brooklyn.cuny.edu",
            "leila.hassan@brooklyn.cuny.edu", "noah.rivera@brooklyn.cuny.edu",
            "leila.hassan@brooklyn.cuny.edu", "noah.rivera@brooklyn.cuny.edu",
        ]
        listing_ages = [2, 4, 8, 24, 18, 30, 3, 7, 12, 22, 36, 48]
        for index, values in enumerate(LISTINGS):
            slug, title, price, category, condition, description, location = values
            posted_at = datetime.now(timezone.utc) - timedelta(hours=listing_ages[index])
            listing = db.scalar(select(Listing).where(Listing.title == title, Listing.university_id == universities[slug].id))
            listing_values = {
                "university_id": universities[slug].id,
                "seller_id": users[listing_sellers[index]].id,
                "title": title,
                "price": Decimal(price),
                "description": description,
                "category": category,
                "condition": condition,
                "image_url": LISTING_IMAGES[index],
                "location": location,
                "status": "available",
                "created_at": posted_at,
                "updated_at": posted_at,
            }
            if listing is None:
                db.add(Listing(**listing_values))
            else:
                for key, value in listing_values.items():
                    setattr(listing, key, value)

        event_creators = [
            "maya.chen@buffalo.edu", "ethan.brooks@buffalo.edu", "maya.chen@buffalo.edu",
            "leila.hassan@brooklyn.cuny.edu", "noah.rivera@brooklyn.cuny.edu", "leila.hassan@brooklyn.cuny.edu",
        ]
        for index, values in enumerate(EVENTS):
            slug, organization_name, title, starts_at, campus_location, description = values
            event = db.scalar(select(Event).where(Event.title == title, Event.university_id == universities[slug].id))
            event_values = {
                "university_id": universities[slug].id,
                "creator_id": users[event_creators[index]].id,
                "organization_name": organization_name,
                "title": title,
                "starts_at": datetime.fromisoformat(starts_at).astimezone(timezone.utc),
                "campus_location": campus_location,
                "description": description,
            }
            if event is None:
                db.add(Event(**event_values))
            else:
                for key, value in event_values.items():
                    setattr(event, key, value)

        db.commit()
        print("Seeded 50 universities, with 12 listings and 6 events at UB and Brooklyn College.")
        print("Demo password for the four seeded accounts: CampusDemo2026!")


if __name__ == "__main__":
    main()