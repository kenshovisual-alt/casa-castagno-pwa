from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, date

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


def _clean(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc


# ---------- Models ----------
class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guest_name: str = ""
    guest_email: str = ""
    guest_phone: str = ""
    country: str = ""
    source: str = "direct"  # direct, tuscany_now, other_agency, referral, blocked
    status: str = "enquiry"  # enquiry, tentative, confirmed, deposit_paid, fully_paid, checked_in, checked_out, cancelled, blocked
    checkin: str = ""  # ISO date
    checkout: str = ""
    adults: int = 0
    children: int = 0
    arrival_time: str = ""
    departure_time: str = ""
    special_requests: str = ""
    internal_notes: str = ""
    guest_notes: str = ""
    cleaning_notes: str = ""
    food_preferences: str = ""
    allergies: str = ""
    pets: bool = False
    private_chef: bool = False
    experiences_requested: bool = False
    # finance
    gross_amount: float = 0
    currency: str = "EUR"
    commission_pct: float = 0
    deposit_amount: float = 0
    deposit_paid: bool = False
    balance_paid: bool = False
    cleaning_fee: float = 0
    extras_revenue: float = 0
    experience_revenue: float = 0
    # linked
    experience_ids: List[str] = []
    document_ids: List[str] = []
    checklist: Dict[str, bool] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Experience(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    category: str = "on_estate"
    short_description: str = ""
    internal_notes: str = ""
    guest_notes: str = ""
    location: str = ""
    distance_km: float = 0
    duration: str = ""
    best_season: str = ""
    available_months: List[str] = []
    min_guests: int = 1
    max_guests: int = 12
    cost_owner: float = 0
    price_guest: float = 0
    commission: float = 0
    provider_id: str = ""
    provider_name: str = ""
    provider_contact: str = ""
    lead_time: str = ""
    cancellation_terms: str = ""
    status: str = "active"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Provider(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    company: str = ""
    role: str = ""
    type: str = "other"
    phone: str = ""
    whatsapp: str = ""
    email: str = ""
    website: str = ""
    address: str = ""
    location: str = ""
    languages: str = ""
    price_notes: str = ""
    availability_notes: str = ""
    reliability: int = 5
    internal_notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    category: str = "other"
    booking_id: str = ""
    provider_id: str = ""
    experience_id: str = ""
    guest_name: str = ""
    file_url: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    type: str = "other"
    priority: str = "medium"
    due_date: str = ""
    status: str = "open"
    booking_id: str = ""
    provider_id: str = ""
    experience_id: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PropertyInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    house_notes: str = ""
    bedroom_notes: str = ""
    cleaning_notes: str = ""
    maintenance_notes: str = ""
    checkin_instructions: str = ""
    checkout_instructions: str = ""
    emergency_notes: str = ""
    wifi_info: str = ""
    house_rules: str = ""
    owner_notes: str = ""


class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    default_commission: float = 25
    agency_name: str = "Tuscany Now & More"
    currency: str = "EUR"
    property_capacity: int = 12
    default_checkin_time: str = "16:00"
    default_checkout_time: str = "10:00"


# ---------- Generic CRUD helper ----------
def crud_routes(name: str, collection: str, model):
    @api_router.get(f"/{name}")
    async def list_all():
        items = await db[collection].find({}, {"_id": 0}).to_list(2000)
        return items

    @api_router.get(f"/{name}/{{item_id}}")
    async def get_one(item_id: str):
        doc = await db[collection].find_one({"id": item_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Not found")
        return doc

    @api_router.post(f"/{name}")
    async def create(payload: dict):
        obj = model(**payload)
        doc = obj.model_dump()
        await db[collection].insert_one(doc)
        return _clean(doc)

    @api_router.put(f"/{name}/{{item_id}}")
    async def update(item_id: str, payload: dict):
        payload.pop("id", None)
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db[collection].update_one({"id": item_id}, {"$set": payload})
        if result.matched_count == 0:
            raise HTTPException(404, "Not found")
        doc = await db[collection].find_one({"id": item_id}, {"_id": 0})
        return doc

    @api_router.delete(f"/{name}/{{item_id}}")
    async def delete(item_id: str):
        r = await db[collection].delete_one({"id": item_id})
        return {"deleted": r.deleted_count}


crud_routes("bookings", "bookings", Booking)
crud_routes("experiences", "experiences", Experience)
crud_routes("providers", "providers", Provider)
crud_routes("documents", "documents", Document)
crud_routes("tasks", "tasks", Task)


# ---------- Property & Settings (singletons) ----------
@api_router.get("/property")
async def get_property():
    doc = await db.property_info.find_one({"id": "singleton"}, {"_id": 0})
    if not doc:
        return PropertyInfo().model_dump()
    return doc


@api_router.put("/property")
async def update_property(payload: dict):
    payload["id"] = "singleton"
    await db.property_info.update_one({"id": "singleton"}, {"$set": payload}, upsert=True)
    doc = await db.property_info.find_one({"id": "singleton"}, {"_id": 0})
    return doc


@api_router.get("/settings")
async def get_settings():
    doc = await db.settings.find_one({"id": "singleton"}, {"_id": 0})
    if not doc:
        return Settings().model_dump()
    return doc


@api_router.put("/settings")
async def update_settings(payload: dict):
    payload["id"] = "singleton"
    await db.settings.update_one({"id": "singleton"}, {"$set": payload}, upsert=True)
    doc = await db.settings.find_one({"id": "singleton"}, {"_id": 0})
    return doc


# ---------- Stats ----------
@api_router.get("/stats/dashboard")
async def stats_dashboard():
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(5000)
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1).date().isoformat()
    next_month = (now.replace(day=28) + __import__("datetime").timedelta(days=4)).replace(day=1).date().isoformat()

    def nights(b):
        try:
            ci = datetime.fromisoformat(b["checkin"]).date()
            co = datetime.fromisoformat(b["checkout"]).date()
            return max(0, (co - ci).days)
        except Exception:
            return 0

    def net(b):
        gross = b.get("gross_amount", 0) or 0
        pct = b.get("commission_pct", 0) or 0
        if b.get("source") == "direct":
            pct = 0
        return gross - (gross * pct / 100)

    active_bookings = [b for b in bookings if b.get("status") not in ("cancelled", "blocked")]
    gross_total = sum((b.get("gross_amount", 0) or 0) for b in active_bookings)
    commission_total = sum(((b.get("gross_amount", 0) or 0) * (b.get("commission_pct", 0) or 0) / 100)
                           for b in active_bookings if b.get("source") != "direct")
    net_total = gross_total - commission_total
    direct_rev = sum((b.get("gross_amount", 0) or 0) for b in active_bookings if b.get("source") == "direct")
    agency_rev = gross_total - direct_rev

    month_gross = 0
    for b in active_bookings:
        ci = b.get("checkin", "")
        if ci and month_start <= ci < next_month:
            month_gross += (b.get("gross_amount", 0) or 0)

    upcoming = sorted(
        [b for b in active_bookings if b.get("checkin", "") >= now.date().isoformat()],
        key=lambda x: x.get("checkin", "")
    )
    arrivals_next = upcoming[:5]
    departures = sorted(
        [b for b in active_bookings if b.get("checkout", "") >= now.date().isoformat()],
        key=lambda x: x.get("checkout", "")
    )[:5]

    current_stay = next((b for b in active_bookings
                         if b.get("checkin", "") <= now.date().isoformat() <= b.get("checkout", "")), None)

    total_nights = sum(nights(b) for b in active_bookings)
    confirmed_count = len([b for b in active_bookings if b.get("status") in ("confirmed", "deposit_paid", "fully_paid", "checked_in", "checked_out")])
    pending_payments = sum((b.get("gross_amount", 0) or 0) for b in active_bookings
                           if not b.get("balance_paid") and b.get("status") not in ("cancelled",))

    # monthly series (last 6 months)
    months_series = []
    from datetime import timedelta
    ref = now.replace(day=1)
    for i in range(5, -1, -1):
        # go back i months
        y = ref.year
        m = ref.month - i
        while m <= 0:
            m += 12
            y -= 1
        start = datetime(y, m, 1, tzinfo=timezone.utc).date().isoformat()
        nm = m + 1
        ny = y
        if nm > 12:
            nm = 1
            ny = y + 1
        end = datetime(ny, nm, 1, tzinfo=timezone.utc).date().isoformat()
        rev = sum((b.get("gross_amount", 0) or 0) for b in active_bookings
                  if start <= b.get("checkin", "") < end)
        months_series.append({"month": datetime(y, m, 1).strftime("%b %Y"), "revenue": rev})

    tasks_all = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    urgent_tasks = [t for t in tasks_all if t.get("priority") == "high" and t.get("status") != "done"]

    return {
        "month_gross": month_gross,
        "gross_total": gross_total,
        "commission_total": commission_total,
        "net_total": net_total,
        "direct_revenue": direct_rev,
        "agency_revenue": agency_rev,
        "confirmed_count": confirmed_count,
        "pending_payments": pending_payments,
        "upcoming_arrivals": arrivals_next,
        "upcoming_departures": departures,
        "current_stay": current_stay,
        "next_bookings": upcoming[:3],
        "total_nights": total_nights,
        "occupancy_pct": round((total_nights / 365) * 100, 1),
        "monthly_series": months_series,
        "source_breakdown": {
            "direct": len([b for b in active_bookings if b.get("source") == "direct"]),
            "tuscany_now": len([b for b in active_bookings if b.get("source") == "tuscany_now"]),
            "other_agency": len([b for b in active_bookings if b.get("source") == "other_agency"]),
            "referral": len([b for b in active_bookings if b.get("source") == "referral"]),
        },
        "urgent_tasks": urgent_tasks[:5],
    }


# ---------- Seed ----------
@api_router.post("/seed")
async def seed_data():
    # Clear existing
    for col in ["bookings", "experiences", "providers", "documents", "tasks"]:
        await db[col].delete_many({})

    from datetime import timedelta
    today = datetime.now(timezone.utc).date()

    providers = [
        {"name": "Marco Rossi", "company": "Cucina di Marco", "role": "Private Chef", "type": "chef",
         "phone": "+39 320 111 2233", "whatsapp": "+39 320 111 2233", "email": "marco@cucinadimarco.it",
         "location": "Arezzo", "languages": "IT, EN", "reliability": 5,
         "internal_notes": "Best chef for large groups. Confirms 48h ahead."},
        {"name": "Elena Bianchi", "company": "Pulizie Toscana", "role": "Head Housekeeper", "type": "cleaning",
         "phone": "+39 333 444 5566", "email": "elena@pulizietoscana.it",
         "location": "Anghiari", "languages": "IT", "reliability": 5,
         "internal_notes": "Available Fridays and Sundays."},
        {"name": "Giovanni Ferri", "company": "Ferri Manutenzioni", "role": "Handyman", "type": "maintenance",
         "phone": "+39 347 222 3344", "email": "gio@ferri.it", "location": "Sansepolcro",
         "languages": "IT", "reliability": 4, "internal_notes": "Pool + electrical issues."},
        {"name": "Luca Verdi", "company": "Verdi Transfer", "role": "Driver", "type": "driver",
         "phone": "+39 348 555 7788", "whatsapp": "+39 348 555 7788", "email": "luca@verditransfer.it",
         "location": "Florence Airport", "languages": "IT, EN, FR", "reliability": 5,
         "internal_notes": "Mercedes V-Class. Book 3 days ahead."},
        {"name": "Sofia Neri", "company": "Cantina Neri", "role": "Wine Guide", "type": "wine_partner",
         "phone": "+39 349 666 8899", "email": "sofia@cantinaneri.it",
         "location": "Montepulciano", "languages": "IT, EN", "reliability": 5,
         "internal_notes": "Private tastings for up to 12."},
        {"name": "Anna Conti", "company": "Wellness Studio Anghiari", "role": "Massage Therapist",
         "type": "wellness_provider", "phone": "+39 380 111 2244", "email": "anna@wellness.it",
         "location": "Anghiari", "languages": "IT, EN", "reliability": 4,
         "internal_notes": "In-house treatments available."},
        {"name": "Pietro Colombo", "company": "Fattoria San Michele", "role": "Farmer",
         "type": "farm_producer", "phone": "+39 331 222 3355", "email": "pietro@sanmichele.it",
         "location": "Anghiari", "languages": "IT", "reliability": 5,
         "internal_notes": "Prosciutto farm visits + tasting."},
        {"name": "Chiara Moretti", "company": "Tuscany Now & More", "role": "Booking Agent",
         "type": "agency_contact", "phone": "+44 20 7684 8884", "email": "chiara@tuscanynowandmore.com",
         "location": "London / Florence", "languages": "IT, EN", "reliability": 5,
         "internal_notes": "Main agency contact."},
        {"name": "Dott. Alessandro Ricci", "company": "Studio Medico Anghiari", "role": "Emergency Doctor",
         "type": "emergency_contact", "phone": "+39 0575 789 000", "email": "",
         "location": "Anghiari", "languages": "IT", "reliability": 5,
         "internal_notes": "24h emergency line."},
        {"name": "Matteo Galli", "company": "Truffle Hunters Casentino", "role": "Truffle Guide",
         "type": "experience_provider", "phone": "+39 366 888 9911", "email": "matteo@trufflehunt.it",
         "location": "Casentino", "languages": "IT, EN", "reliability": 5,
         "internal_notes": "Fantastic with families. Brings truffle dogs."},
    ]
    provider_docs = [Provider(**p).model_dump() for p in providers]
    await db.providers.insert_many([dict(p) for p in provider_docs])

    experiences = [
        {"name": "Guided Hiking in Casentino Forest", "category": "on_estate",
         "short_description": "Half-day forest hike with a local naturalist. Nature reserve trails.",
         "location": "Casa Castagno + surroundings", "distance_km": 0, "duration": "4h",
         "best_season": "Apr–Oct", "min_guests": 2, "max_guests": 12,
         "cost_owner": 180, "price_guest": 320, "provider_name": "Local Guide", "status": "active"},
        {"name": "Olive Oil Workshop", "category": "on_estate",
         "short_description": "Learn about extra-virgin production, olive varieties, and taste 5 oils.",
         "location": "Casa Castagno olive grove", "distance_km": 0, "duration": "2h",
         "best_season": "All year", "min_guests": 2, "max_guests": 12,
         "cost_owner": 120, "price_guest": 240, "status": "active"},
        {"name": "Tuscan Cooking Class", "category": "food_wine",
         "short_description": "Hands-on pasta and tiramisu class with Chef Marco.",
         "location": "Casa Castagno kitchen", "distance_km": 0, "duration": "3h",
         "best_season": "All year", "min_guests": 2, "max_guests": 12,
         "cost_owner": 350, "price_guest": 600, "provider_name": "Marco Rossi", "status": "active"},
        {"name": "Truffle Hunting Experience", "category": "outdoor",
         "short_description": "Half-day hunt with trained dogs, followed by a truffle lunch.",
         "location": "Casentino forest", "distance_km": 12, "duration": "5h",
         "best_season": "Sep–Dec", "min_guests": 2, "max_guests": 8,
         "cost_owner": 400, "price_guest": 780, "provider_name": "Matteo Galli", "status": "active"},
        {"name": "Wine Tasting at Cantina Neri", "category": "food_wine",
         "short_description": "Private tasting of 6 Montepulciano wines with cheese pairings.",
         "location": "Montepulciano", "distance_km": 68, "duration": "3h",
         "best_season": "All year", "min_guests": 2, "max_guests": 12,
         "cost_owner": 300, "price_guest": 540, "provider_name": "Sofia Neri", "status": "active"},
        {"name": "Anghiari Antique Fair Visit", "category": "cultural",
         "short_description": "Guided visit to the famous antique fair, monthly.",
         "location": "Anghiari", "distance_km": 8, "duration": "3h",
         "best_season": "All year", "min_guests": 2, "max_guests": 12,
         "cost_owner": 100, "price_guest": 200, "status": "active"},
        {"name": "Florence Day Trip", "category": "day_trip",
         "short_description": "Private driver + guided Uffizi and Duomo experience.",
         "location": "Florence", "distance_km": 88, "duration": "10h",
         "best_season": "All year", "min_guests": 2, "max_guests": 8,
         "cost_owner": 600, "price_guest": 1200, "provider_name": "Luca Verdi", "status": "active"},
        {"name": "In-House Yoga Session", "category": "wellness",
         "short_description": "Sunrise yoga in the garden or by the pool.",
         "location": "Casa Castagno", "distance_km": 0, "duration": "1h",
         "best_season": "All year", "min_guests": 1, "max_guests": 12,
         "cost_owner": 80, "price_guest": 160, "status": "active"},
        {"name": "Couples Massage", "category": "wellness",
         "short_description": "Two therapists, 60-min treatment in a private room.",
         "location": "Casa Castagno", "distance_km": 0, "duration": "1h",
         "best_season": "All year", "min_guests": 2, "max_guests": 2,
         "cost_owner": 220, "price_guest": 380, "provider_name": "Anna Conti", "status": "active"},
        {"name": "Horse Riding at Poggio Verde", "category": "outdoor",
         "short_description": "Guided rides through Tuscan countryside for all levels.",
         "location": "Sansepolcro", "distance_km": 15, "duration": "2h",
         "best_season": "Apr–Oct", "min_guests": 2, "max_guests": 8,
         "cost_owner": 200, "price_guest": 360, "status": "active"},
    ]
    exp_docs = [Experience(**e).model_dump() for e in experiences]
    await db.experiences.insert_many([dict(e) for e in exp_docs])

    # Bookings
    def d(days_offset):
        return (today + timedelta(days=days_offset)).isoformat()

    bookings_seed = [
        {"guest_name": "James & Charlotte Fletcher", "guest_email": "j.fletcher@example.com",
         "guest_phone": "+44 7700 900123", "country": "United Kingdom", "source": "direct",
         "status": "confirmed", "checkin": d(-3), "checkout": d(4), "adults": 6, "children": 2,
         "arrival_time": "16:00", "gross_amount": 8400, "commission_pct": 0,
         "deposit_amount": 2500, "deposit_paid": True, "balance_paid": True,
         "cleaning_fee": 300, "special_requests": "Welcome dinner on first night.",
         "internal_notes": "Repeat guests. VIP treatment."},
        {"guest_name": "The Andersen Family", "guest_email": "andersen@example.com",
         "guest_phone": "+45 30 12 34 56", "country": "Denmark", "source": "tuscany_now",
         "status": "confirmed", "checkin": d(10), "checkout": d(24), "adults": 8, "children": 4,
         "gross_amount": 22400, "commission_pct": 30,
         "deposit_amount": 6720, "deposit_paid": True, "balance_paid": False,
         "cleaning_fee": 400, "private_chef": True, "experiences_requested": True,
         "food_preferences": "Vegetarian for 2 adults. Kids gluten free.",
         "internal_notes": "Booked via Chiara. Full property, high service."},
        {"guest_name": "Robertson Group", "guest_email": "robertson@example.com",
         "guest_phone": "+1 917 555 2001", "country": "United States", "source": "tuscany_now",
         "status": "tentative", "checkin": d(45), "checkout": d(52), "adults": 10, "children": 0,
         "gross_amount": 14700, "commission_pct": 25,
         "deposit_amount": 0, "deposit_paid": False, "balance_paid": False,
         "special_requests": "Wine tour on day 3.",
         "internal_notes": "Awaiting deposit. Hold dates until Friday."},
        {"guest_name": "Owner Blocked", "guest_email": "", "guest_phone": "",
         "country": "", "source": "blocked", "status": "blocked",
         "checkin": d(60), "checkout": d(64), "adults": 0, "children": 0,
         "gross_amount": 0, "commission_pct": 0, "internal_notes": "Owner personal stay + maintenance."},
        {"guest_name": "Miller & Friends", "guest_email": "miller@example.com",
         "guest_phone": "+61 400 555 900", "country": "Australia", "source": "direct",
         "status": "deposit_paid", "checkin": d(80), "checkout": d(87), "adults": 8, "children": 2,
         "gross_amount": 9800, "commission_pct": 0,
         "deposit_amount": 2940, "deposit_paid": True, "balance_paid": False,
         "cleaning_fee": 300, "experience_revenue": 840,
         "experiences_requested": True, "private_chef": True,
         "special_requests": "Cooking class + wine tasting confirmed.",
         "internal_notes": "Arrange chef Marco + Cantina Neri visit."},
    ]
    booking_docs = [Booking(**b).model_dump() for b in bookings_seed]
    await db.bookings.insert_many([dict(b) for b in booking_docs])

    tasks_seed = [
        {"title": "Confirm chef Marco for Andersen stay", "type": "booking", "priority": "high",
         "due_date": d(7), "status": "open", "notes": "Menu approval needed."},
        {"title": "Pool maintenance service", "type": "maintenance", "priority": "medium",
         "due_date": d(15), "status": "open", "notes": "Quarterly filter clean."},
        {"title": "Send welcome pack to Robertson group", "type": "guest", "priority": "medium",
         "due_date": d(30), "status": "open"},
        {"title": "Restock olive oil for tastings", "type": "property", "priority": "low",
         "due_date": d(20), "status": "in_progress"},
        {"title": "Invoice reconciliation for TN&M April", "type": "finance", "priority": "high",
         "due_date": d(5), "status": "open"},
    ]
    task_docs = [Task(**t).model_dump() for t in tasks_seed]
    await db.tasks.insert_many([dict(t) for t in task_docs])

    documents_seed = [
        {"title": "Andersen booking contract", "category": "contracts",
         "file_url": "https://example.com/contracts/andersen.pdf", "notes": "Signed 14-day rental."},
        {"title": "House rules PDF", "category": "property_documents",
         "file_url": "https://example.com/house-rules.pdf", "notes": "Shared with each group."},
        {"title": "TN&M agency agreement 2026", "category": "agency_documents",
         "file_url": "https://example.com/tnm-2026.pdf", "notes": "30% base commission."},
        {"title": "Pool maintenance manual", "category": "maintenance_documents",
         "file_url": "https://example.com/pool.pdf", "notes": ""},
    ]
    doc_docs = [Document(**d).model_dump() for d in documents_seed]
    await db.documents.insert_many([dict(d) for d in doc_docs])

    # Settings + property defaults
    await db.settings.update_one(
        {"id": "singleton"},
        {"$set": {**Settings().model_dump(), "id": "singleton"}},
        upsert=True,
    )
    await db.property_info.update_one(
        {"id": "singleton"},
        {"$set": {
            "id": "singleton",
            "house_notes": "Three restored stone houses (Casa Grande, Casa Piccola, Casa del Fienile) around a central courtyard.",
            "bedroom_notes": "6 double bedrooms across 3 houses, all en-suite.",
            "cleaning_notes": "Mid-week refresh + full turnover with Elena's team.",
            "maintenance_notes": "Pool serviced quarterly. Olive harvest late Oct.",
            "checkin_instructions": "Guests welcomed at 16:00. Property tour + welcome drink.",
            "checkout_instructions": "10:00 checkout. Owner or Elena present.",
            "emergency_notes": "Local doctor: Dott. Ricci +39 0575 789 000.",
            "wifi_info": "Network: CasaCastagno_Guest / Password: TuscanRetreat2026",
            "house_rules": "No smoking indoors. Pets allowed on request. Pool 09:00–21:00.",
            "owner_notes": "Estate reserved as one full property only. Never split.",
        }},
        upsert=True,
    )

    return {"seeded": True, "bookings": len(bookings_seed), "experiences": len(experiences),
            "providers": len(providers), "documents": len(documents_seed), "tasks": len(tasks_seed)}


@api_router.get("/")
async def root():
    return {"app": "Casa Castagno Manager", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
