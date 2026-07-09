from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, Session, create_engine, select
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import json
import logging
from enum import Enum
from pathlib import Path
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
import uuid
from datetime import datetime, timezone, date, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
DB_PATH = Path(os.environ["DB_PATH"]) if os.environ.get("DB_PATH") else ROOT_DIR / "casa_castagno.db"
INVOICES_DIR = Path(os.environ["INVOICES_DIR"]) if os.environ.get("INVOICES_DIR") else ROOT_DIR / "invoices"
INVOICES_DIR.mkdir(exist_ok=True)
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


# ---------- Enums (mirrors frontend/src/lib/constants.js) ----------
class BookingSource(str, Enum):
    direct = "direct"
    tuscany_now = "tuscany_now"
    other_agency = "other_agency"
    referral = "referral"
    blocked = "blocked"


class BookingStatus(str, Enum):
    enquiry = "enquiry"
    tentative = "tentative"
    confirmed = "confirmed"
    deposit_paid = "deposit_paid"
    fully_paid = "fully_paid"
    checked_in = "checked_in"
    checked_out = "checked_out"
    cancelled = "cancelled"
    blocked = "blocked"


class ExperienceCategory(str, Enum):
    on_estate = "on_estate"
    off_estate = "off_estate"
    cultural = "cultural"
    day_trip = "day_trip"
    wellness = "wellness"
    food_wine = "food_wine"
    outdoor = "outdoor"
    custom = "custom"


class ExperienceStatus(str, Enum):
    active = "active"
    inactive = "inactive"


class ProviderType(str, Enum):
    experience_provider = "experience_provider"
    chef = "chef"
    cleaning = "cleaning"
    maintenance = "maintenance"
    driver = "driver"
    wine_partner = "wine_partner"
    wellness_provider = "wellness_provider"
    farm_producer = "farm_producer"
    agency_contact = "agency_contact"
    emergency_contact = "emergency_contact"
    other = "other"


class DocumentCategory(str, Enum):
    booking_documents = "booking_documents"
    guest_documents = "guest_documents"
    invoices = "invoices"
    contracts = "contracts"
    agency_documents = "agency_documents"
    property_documents = "property_documents"
    experience_documents = "experience_documents"
    provider_documents = "provider_documents"
    maintenance_documents = "maintenance_documents"
    house_manuals = "house_manuals"
    photos = "photos"
    other = "other"


class TaskType(str, Enum):
    booking = "booking"
    guest = "guest"
    property = "property"
    experience = "experience"
    provider = "provider"
    finance = "finance"
    maintenance = "maintenance"
    other = "other"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TaskStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    done = "done"


# ---------- Models ----------
class Booking(SQLModel, table=True):
    id: str = Field(default_factory=_new_id, primary_key=True)
    guest_name: str = ""
    guest_email: str = ""
    guest_phone: str = ""
    country: str = ""
    source: str = "direct"  # direct, tuscany_now, other_agency, referral, blocked
    agency_id: str = ""  # set when source == "other_agency" and a specific Agency record applies
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
    # linked (stored as JSON text)
    experience_ids: str = "[]"
    document_ids: str = "[]"
    checklist: str = "{}"
    created_at: str = Field(default_factory=_now_iso)
    updated_at: str = Field(default_factory=_now_iso)


class Experience(SQLModel, table=True):
    id: str = Field(default_factory=_new_id, primary_key=True)
    name: str = ""
    category: str = "on_estate"
    short_description: str = ""
    internal_notes: str = ""
    guest_notes: str = ""
    location: str = ""
    distance_km: float = 0
    duration: str = ""
    best_season: str = ""
    available_months: str = "[]"  # JSON text
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
    created_at: str = Field(default_factory=_now_iso)


class Provider(SQLModel, table=True):
    id: str = Field(default_factory=_new_id, primary_key=True)
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
    created_at: str = Field(default_factory=_now_iso)


class Agency(SQLModel, table=True):
    id: str = Field(default_factory=_new_id, primary_key=True)
    name: str = ""
    commission_pct: float = 25
    contact_name: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    website: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=_now_iso)


class Document(SQLModel, table=True):
    id: str = Field(default_factory=_new_id, primary_key=True)
    title: str = ""
    category: str = "other"
    booking_id: str = ""
    provider_id: str = ""
    experience_id: str = ""
    guest_name: str = ""
    file_url: str = ""
    notes: str = ""
    invoice_number: str = ""  # set once when an invoice document is first generated; stable across regenerations
    created_at: str = Field(default_factory=_now_iso)


class Task(SQLModel, table=True):
    id: str = Field(default_factory=_new_id, primary_key=True)
    title: str = ""
    type: str = "other"
    priority: str = "medium"
    due_date: str = ""
    status: str = "open"
    booking_id: str = ""
    provider_id: str = ""
    experience_id: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=_now_iso)


class PropertyInfo(SQLModel, table=True):
    id: str = Field(default="singleton", primary_key=True)
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


class Settings(SQLModel, table=True):
    id: str = Field(default="singleton", primary_key=True)
    default_commission: float = 25
    agency_name: str = "Tuscany Now & More"
    currency: str = "EUR"
    property_capacity: int = 12
    default_checkin_time: str = "16:00"
    default_checkout_time: str = "10:00"
    # regional
    language: str = "en"
    date_format: str = "DD/MM/YYYY"
    # owner / account
    owner_name: str = ""
    owner_email: str = ""
    owner_phone: str = ""
    # invoicing
    invoice_prefix: str = "CC"
    last_invoice_number: int = 0


# ---------- Create/Update request schemas ----------
# Separate from the SQLModel table classes so API input is validated (enums, types)
# independently of how rows are stored on disk.
class BookingCreate(BaseModel):
    guest_name: str = ""
    guest_email: str = ""
    guest_phone: str = ""
    country: str = ""
    source: BookingSource = BookingSource.direct
    agency_id: str = ""
    status: BookingStatus = BookingStatus.enquiry
    checkin: str = ""
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
    gross_amount: float = 0
    currency: str = "EUR"
    commission_pct: float = 0
    deposit_amount: float = 0
    deposit_paid: bool = False
    balance_paid: bool = False
    cleaning_fee: float = 0
    extras_revenue: float = 0
    experience_revenue: float = 0
    experience_ids: List[str] = []
    document_ids: List[str] = []
    checklist: Dict[str, bool] = {}


class BookingUpdate(BaseModel):
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    country: Optional[str] = None
    source: Optional[BookingSource] = None
    agency_id: Optional[str] = None
    status: Optional[BookingStatus] = None
    checkin: Optional[str] = None
    checkout: Optional[str] = None
    adults: Optional[int] = None
    children: Optional[int] = None
    arrival_time: Optional[str] = None
    departure_time: Optional[str] = None
    special_requests: Optional[str] = None
    internal_notes: Optional[str] = None
    guest_notes: Optional[str] = None
    cleaning_notes: Optional[str] = None
    food_preferences: Optional[str] = None
    allergies: Optional[str] = None
    pets: Optional[bool] = None
    private_chef: Optional[bool] = None
    experiences_requested: Optional[bool] = None
    gross_amount: Optional[float] = None
    currency: Optional[str] = None
    commission_pct: Optional[float] = None
    deposit_amount: Optional[float] = None
    deposit_paid: Optional[bool] = None
    balance_paid: Optional[bool] = None
    cleaning_fee: Optional[float] = None
    extras_revenue: Optional[float] = None
    experience_revenue: Optional[float] = None
    experience_ids: Optional[List[str]] = None
    document_ids: Optional[List[str]] = None
    checklist: Optional[Dict[str, bool]] = None


class ExperienceCreate(BaseModel):
    name: str = ""
    category: ExperienceCategory = ExperienceCategory.on_estate
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
    status: ExperienceStatus = ExperienceStatus.active


class ExperienceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[ExperienceCategory] = None
    short_description: Optional[str] = None
    internal_notes: Optional[str] = None
    guest_notes: Optional[str] = None
    location: Optional[str] = None
    distance_km: Optional[float] = None
    duration: Optional[str] = None
    best_season: Optional[str] = None
    available_months: Optional[List[str]] = None
    min_guests: Optional[int] = None
    max_guests: Optional[int] = None
    cost_owner: Optional[float] = None
    price_guest: Optional[float] = None
    commission: Optional[float] = None
    provider_id: Optional[str] = None
    provider_name: Optional[str] = None
    provider_contact: Optional[str] = None
    lead_time: Optional[str] = None
    cancellation_terms: Optional[str] = None
    status: Optional[ExperienceStatus] = None


class ProviderCreate(BaseModel):
    name: str = ""
    company: str = ""
    role: str = ""
    type: ProviderType = ProviderType.other
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


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    type: Optional[ProviderType] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    location: Optional[str] = None
    languages: Optional[str] = None
    price_notes: Optional[str] = None
    availability_notes: Optional[str] = None
    reliability: Optional[int] = None
    internal_notes: Optional[str] = None


class AgencyCreate(BaseModel):
    name: str = ""
    commission_pct: float = 25
    contact_name: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    website: str = ""
    notes: str = ""


class AgencyUpdate(BaseModel):
    name: Optional[str] = None
    commission_pct: Optional[float] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None


class DocumentCreate(BaseModel):
    title: str = ""
    category: DocumentCategory = DocumentCategory.other
    booking_id: str = ""
    provider_id: str = ""
    experience_id: str = ""
    guest_name: str = ""
    file_url: str = ""
    notes: str = ""


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[DocumentCategory] = None
    booking_id: Optional[str] = None
    provider_id: Optional[str] = None
    experience_id: Optional[str] = None
    guest_name: Optional[str] = None
    file_url: Optional[str] = None
    notes: Optional[str] = None


class TaskCreate(BaseModel):
    title: str = ""
    type: TaskType = TaskType.other
    priority: TaskPriority = TaskPriority.medium
    due_date: str = ""
    status: TaskStatus = TaskStatus.open
    booking_id: str = ""
    provider_id: str = ""
    experience_id: str = ""
    notes: str = ""


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[TaskType] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[str] = None
    status: Optional[TaskStatus] = None
    booking_id: Optional[str] = None
    provider_id: Optional[str] = None
    experience_id: Optional[str] = None
    notes: Optional[str] = None


CREATE_SCHEMAS = {
    "bookings": BookingCreate,
    "experiences": ExperienceCreate,
    "providers": ProviderCreate,
    "documents": DocumentCreate,
    "tasks": TaskCreate,
    "agencies": AgencyCreate,
}

UPDATE_SCHEMAS = {
    "bookings": BookingUpdate,
    "experiences": ExperienceUpdate,
    "providers": ProviderUpdate,
    "documents": DocumentUpdate,
    "tasks": TaskUpdate,
    "agencies": AgencyUpdate,
}


# Fields that are stored as JSON text and must be encoded/decoded transparently
JSON_FIELDS = {
    "bookings": ["experience_ids", "document_ids", "checklist"],
    "experiences": ["available_months"],
}


def _decode(name: str, doc: dict) -> dict:
    for field in JSON_FIELDS.get(name, []):
        if field in doc and isinstance(doc[field], str):
            try:
                doc[field] = json.loads(doc[field])
            except (json.JSONDecodeError, TypeError):
                pass
    return doc


def _encode_payload(name: str, payload: dict) -> dict:
    payload = dict(payload)
    for field in JSON_FIELDS.get(name, []):
        if field in payload and not isinstance(payload[field], str):
            payload[field] = json.dumps(payload[field])
    return payload


def _migrate_missing_columns():
    """Add columns declared on SQLModel classes that don't yet exist in the SQLite file.
    SQLModel.metadata.create_all() only creates missing tables, never alters existing ones,
    so this keeps the on-disk schema in sync when a model gains a field after the db was created."""
    sqlite_type = {int: "INTEGER", float: "REAL", bool: "INTEGER", str: "TEXT"}
    with engine.connect() as conn:
        for table in SQLModel.metadata.sorted_tables:
            existing = {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info('{table.name}')").fetchall()}
            if not existing:
                continue  # table itself doesn't exist yet; create_all() will have handled it
            for column in table.columns:
                if column.name in existing:
                    continue
                try:
                    py_type = column.type.python_type
                except NotImplementedError:
                    py_type = str
                col_type = sqlite_type.get(py_type, "TEXT")
                default = column.default.arg if column.default is not None and not callable(column.default.arg) else None
                default_sql = ""
                if isinstance(default, bool):
                    default_sql = f" DEFAULT {1 if default else 0}"
                elif isinstance(default, (int, float)):
                    default_sql = f" DEFAULT {default}"
                elif isinstance(default, str):
                    default_sql = f" DEFAULT '{default}'"
                conn.exec_driver_sql(f"ALTER TABLE '{table.name}' ADD COLUMN '{column.name}' {col_type}{default_sql}")
        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    _migrate_missing_columns()
    yield


app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

MODELS = {
    "bookings": Booking,
    "experiences": Experience,
    "providers": Provider,
    "documents": Document,
    "tasks": Task,
    "agencies": Agency,
}


# ---------- Booking date-conflict check ----------
# "enquiry" is a soft lead that hasn't been held yet, so it must not lock out other
# enquiries/bookings for the same dates; "cancelled" is likewise never a real hold.
NON_BLOCKING_STATUSES = ("enquiry", "cancelled")


def _check_booking_dates(checkin: str, checkout: str):
    if not checkin or not checkout:
        return
    if checkout <= checkin:
        raise HTTPException(422, "Check-out date must be after check-in date")


def _check_booking_conflict(session: Session, checkin: str, checkout: str, exclude_id: Optional[str] = None):
    if not checkin or not checkout:
        return
    existing = session.exec(select(Booking)).all()
    for b in existing:
        if exclude_id and b.id == exclude_id:
            continue
        if b.status in NON_BLOCKING_STATUSES:
            continue
        if not b.checkin or not b.checkout:
            continue
        # Overlap if existing.checkin < new.checkout AND existing.checkout > new.checkin
        if b.checkin < checkout and b.checkout > checkin:
            logger.info(
                "Booking conflict: requested %s→%s overlaps existing booking %s (%s→%s)",
                checkin, checkout, b.id, b.checkin, b.checkout,
            )
            raise HTTPException(
                409,
                f"Dates overlap with existing booking for {b.guest_name or 'Blocked'} "
                f"({b.checkin} → {b.checkout})",
            )


def _validate_booking_fields(checkin: str, checkout: str, source: Optional[str], agency_id: Optional[str]):
    _check_booking_dates(checkin, checkout)
    if source == BookingSource.other_agency.value and not agency_id:
        raise HTTPException(422, "An agency must be selected when source is 'Other Agency'")


# ---------- Generic CRUD helper ----------
def crud_routes(name: str, model, create_schema, update_schema):
    @api_router.get(f"/{name}")
    def list_all(limit: Optional[int] = None, offset: int = 0):
        with Session(engine) as session:
            query = select(model)
            if limit is not None:
                query = query.offset(offset).limit(limit)
            items = session.exec(query).all()
            return [_decode(name, item.model_dump()) for item in items]

    @api_router.get(f"/{name}/{{item_id}}")
    def get_one(item_id: str):
        with Session(engine) as session:
            item = session.get(model, item_id)
            if not item:
                raise HTTPException(404, "Not found")
            return _decode(name, item.model_dump())

    @api_router.post(f"/{name}", response_model=None)
    def create(payload: create_schema):
        data = payload.model_dump(mode="json")
        if name == "bookings":
            _validate_booking_fields(data.get("checkin", ""), data.get("checkout", ""),
                                      data.get("source"), data.get("agency_id"))
        data = _encode_payload(name, data)
        obj = model(**data)
        with Session(engine) as session:
            if name == "bookings":
                _check_booking_conflict(session, obj.checkin, obj.checkout)
            session.add(obj)
            session.commit()
            session.refresh(obj)
            return _decode(name, obj.model_dump())

    @api_router.put(f"/{name}/{{item_id}}", response_model=None)
    def update(item_id: str, payload: update_schema):
        data = payload.model_dump(mode="json", exclude_unset=True)
        with Session(engine) as session:
            item = session.get(model, item_id)
            if not item:
                raise HTTPException(404, "Not found")
            if name == "bookings":
                new_checkin = data.get("checkin", item.checkin)
                new_checkout = data.get("checkout", item.checkout)
                new_source = data.get("source", item.source)
                new_agency_id = data.get("agency_id", item.agency_id)
                _validate_booking_fields(new_checkin, new_checkout, new_source, new_agency_id)
                _check_booking_conflict(session, new_checkin, new_checkout, exclude_id=item_id)
            data = _encode_payload(name, data)
            if "updated_at" in model.model_fields:
                data["updated_at"] = _now_iso()
            for key, value in data.items():
                if key in model.model_fields:
                    setattr(item, key, value)
            session.add(item)
            session.commit()
            session.refresh(item)
            return _decode(name, item.model_dump())

    @api_router.delete(f"/{name}/{{item_id}}")
    def delete(item_id: str):
        with Session(engine) as session:
            item = session.get(model, item_id)
            deleted = 0
            if item:
                session.delete(item)
                session.commit()
                deleted = 1
            return {"deleted": deleted}


for name, model in MODELS.items():
    crud_routes(name, model, CREATE_SCHEMAS[name], UPDATE_SCHEMAS[name])


# ---------- Invoices ----------
def _compute_finance(b: Booking) -> dict:
    """Shared finance formula — mirrors frontend/src/lib/constants.js computeFinance().
    `total` is everything the guest owes (gross rental + cleaning + extras + experiences);
    `balance` is that total minus whatever deposit has already been paid."""
    gross = b.gross_amount or 0
    pct = 0 if b.source == "direct" else (b.commission_pct or 0)
    commission = gross * pct / 100
    net = gross - commission
    extras = b.extras_revenue or 0
    experience = b.experience_revenue or 0
    cleaning = b.cleaning_fee or 0
    total = net + extras + experience + cleaning
    balance = gross + cleaning + extras + experience - (b.deposit_amount or 0)
    return {"commission": commission, "net": net, "total": total, "balance": balance}


def _render_invoice_pdf(b: Booking, settings: Settings, path: Path, invoice_number: str):
    fin = _compute_finance(b)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("InvoiceTitle", parent=styles["Title"], fontSize=22, textColor=colors.HexColor("#2F3A2D"))
    label_style = ParagraphStyle("Label", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#6b6b60"))
    normal_style = ParagraphStyle("Normal2", parent=styles["Normal"], fontSize=11, textColor=colors.HexColor("#1F211B"))

    doc = SimpleDocTemplate(str(path), pagesize=A4, topMargin=25 * mm, bottomMargin=20 * mm,
                             leftMargin=20 * mm, rightMargin=20 * mm)
    elements = []

    elements.append(Paragraph(settings.agency_name or "Casa Castagno", label_style))
    elements.append(Paragraph("Invoice", title_style))
    elements.append(Spacer(1, 4 * mm))
    elements.append(Paragraph(f"Invoice number: {invoice_number}", normal_style))
    elements.append(Paragraph(f"Invoice date: {datetime.now(timezone.utc).date().isoformat()}", normal_style))
    elements.append(Paragraph(f"Booking reference: {b.id[:8]}", normal_style))
    elements.append(Spacer(1, 8 * mm))

    guest_table = Table([
        [Paragraph("Guest", label_style), Paragraph("Stay", label_style)],
        [Paragraph(b.guest_name or "—", normal_style),
         Paragraph(f"{b.checkin} → {b.checkout}", normal_style)],
        [Paragraph(b.guest_email or "", normal_style),
         Paragraph(f"{b.adults} adults, {b.children} children", normal_style)],
    ], colWidths=[85 * mm, 85 * mm])
    guest_table.setStyle(TableStyle([
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(guest_table)
    elements.append(Spacer(1, 8 * mm))

    rows = [["Description", "Amount"]]
    rows.append(["Gross booking amount", f"{b.currency} {b.gross_amount:,.2f}"])
    if fin["commission"]:
        rows.append(["Agency commission", f"- {b.currency} {fin['commission']:,.2f}"])
    if b.cleaning_fee:
        rows.append(["Cleaning fee", f"{b.currency} {b.cleaning_fee:,.2f}"])
    if b.extras_revenue:
        rows.append(["Extras", f"{b.currency} {b.extras_revenue:,.2f}"])
    if b.experience_revenue:
        rows.append(["Experiences", f"{b.currency} {b.experience_revenue:,.2f}"])
    rows.append(["Deposit paid", f"{b.currency} {b.deposit_amount:,.2f}" + (" (paid)" if b.deposit_paid else " (not paid)")])
    rows.append(["Balance due", f"{b.currency} {fin['balance']:,.2f}"])

    fin_table = Table(rows, colWidths=[120 * mm, 50 * mm])
    fin_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, colors.HexColor("#B8AC98")),
        ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.HexColor("#B8AC98")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ]))
    elements.append(fin_table)
    elements.append(Spacer(1, 12 * mm))
    elements.append(Paragraph("Thank you for staying at Casa Castagno.", label_style))

    doc.build(elements)


@api_router.post("/bookings/{booking_id}/invoice")
def generate_invoice(booking_id: str):
    with Session(engine) as session:
        b = session.get(Booking, booking_id)
        if not b:
            raise HTTPException(404, "Booking not found")
        settings = session.get(Settings, "singleton")
        if not settings:
            settings = Settings(id="singleton")
            session.add(settings)
            session.commit()
            session.refresh(settings)

        existing = session.exec(
            select(Document).where(Document.booking_id == b.id, Document.category == "invoices")
        ).first()

        if existing and existing.invoice_number:
            invoice_number = existing.invoice_number
        else:
            settings.last_invoice_number += 1
            invoice_number = f"{settings.invoice_prefix}-{settings.last_invoice_number:05d}"
            session.add(settings)
            session.commit()

        filename = f"invoice-{b.id}.pdf"
        path = INVOICES_DIR / filename
        _render_invoice_pdf(b, settings, path, invoice_number)

        if existing:
            existing.file_url = f"/api/documents/{existing.id}/file"
            existing.title = f"Invoice {invoice_number} — {b.guest_name or 'Booking'}"
            existing.invoice_number = invoice_number
            existing.created_at = _now_iso()
            session.add(existing)
            session.commit()
            session.refresh(existing)
            doc_row = existing
        else:
            doc_row = Document(
                title=f"Invoice {invoice_number} — {b.guest_name or 'Booking'}",
                category="invoices",
                booking_id=b.id,
                guest_name=b.guest_name,
                invoice_number=invoice_number,
                notes="Auto-generated invoice",
            )
            session.add(doc_row)
            session.commit()
            session.refresh(doc_row)
            doc_row.file_url = f"/api/documents/{doc_row.id}/file"
            session.add(doc_row)
            session.commit()
            session.refresh(doc_row)

        # Store the PDF under the document's own id so /file lookup is stable
        final_path = INVOICES_DIR / f"{doc_row.id}.pdf"
        if path != final_path:
            path.replace(final_path)

        logger.info("Invoice %s generated for booking %s (document %s)", invoice_number, b.id, doc_row.id)
        return _decode("documents", doc_row.model_dump())


@api_router.get("/bookings/{booking_id}/invoice")
def get_invoice_for_booking(booking_id: str):
    with Session(engine) as session:
        doc_row = session.exec(
            select(Document).where(Document.booking_id == booking_id, Document.category == "invoices")
        ).first()
        if not doc_row:
            raise HTTPException(404, "No invoice generated yet")
        return _decode("documents", doc_row.model_dump())


@api_router.get("/documents/{document_id}/file")
def get_document_file(document_id: str):
    with Session(engine) as session:
        doc_row = session.get(Document, document_id)
        if not doc_row:
            raise HTTPException(404, "Document not found")
        path = INVOICES_DIR / f"{document_id}.pdf"
        if not path.exists():
            raise HTTPException(404, "File not found on disk")
        filename = f"{(doc_row.title or 'document').replace('/', '-')}.pdf"
        return FileResponse(path, media_type="application/pdf", filename=filename)


# ---------- Property & Settings (singletons) ----------
@api_router.get("/property")
def get_property():
    with Session(engine) as session:
        doc = session.get(PropertyInfo, "singleton")
        if not doc:
            return PropertyInfo().model_dump()
        return doc.model_dump()


@api_router.put("/property")
def update_property(payload: dict):
    payload = dict(payload)
    payload["id"] = "singleton"
    with Session(engine) as session:
        doc = session.get(PropertyInfo, "singleton")
        if not doc:
            doc = PropertyInfo(**payload)
        else:
            for key, value in payload.items():
                if key in PropertyInfo.model_fields:
                    setattr(doc, key, value)
        session.add(doc)
        session.commit()
        session.refresh(doc)
        return doc.model_dump()


@api_router.get("/settings")
def get_settings():
    with Session(engine) as session:
        doc = session.get(Settings, "singleton")
        if not doc:
            return Settings().model_dump()
        return doc.model_dump()


@api_router.put("/settings")
def update_settings(payload: dict):
    payload = dict(payload)
    payload["id"] = "singleton"
    with Session(engine) as session:
        doc = session.get(Settings, "singleton")
        if not doc:
            doc = Settings(**payload)
        else:
            for key, value in payload.items():
                if key in Settings.model_fields:
                    setattr(doc, key, value)
        session.add(doc)
        session.commit()
        session.refresh(doc)
        return doc.model_dump()


# ---------- Stats ----------
@api_router.get("/stats/dashboard")
def stats_dashboard():
    with Session(engine) as session:
        bookings = [_decode("bookings", b.model_dump()) for b in session.exec(select(Booking)).all()]
        tasks_all = [t.model_dump() for t in session.exec(select(Task)).all()]

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1).date().isoformat()
    next_month = (now.replace(day=28) + timedelta(days=4)).replace(day=1).date().isoformat()

    def nights(b):
        try:
            ci = datetime.fromisoformat(b["checkin"]).date()
            co = datetime.fromisoformat(b["checkout"]).date()
            return max(0, (co - ci).days)
        except Exception:
            return 0

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

    def outstanding_balance(b):
        gross = b.get("gross_amount", 0) or 0
        extras = b.get("extras_revenue", 0) or 0
        experience = b.get("experience_revenue", 0) or 0
        cleaning = b.get("cleaning_fee", 0) or 0
        deposit = b.get("deposit_amount", 0) or 0
        return gross + cleaning + extras + experience - deposit

    def nights_in_current_year(b):
        """Nights of a stay that overlap the current calendar year, so occupancy stays
        meaningful (0-100%) instead of accumulating unbounded across multiple years."""
        try:
            ci = datetime.fromisoformat(b["checkin"]).date()
            co = datetime.fromisoformat(b["checkout"]).date()
        except Exception:
            return 0
        year_start = date(now.year, 1, 1)
        year_end = date(now.year + 1, 1, 1)
        overlap_start = max(ci, year_start)
        overlap_end = min(co, year_end)
        return max(0, (overlap_end - overlap_start).days)

    total_nights = sum(nights(b) for b in active_bookings)
    nights_this_year = sum(nights_in_current_year(b) for b in active_bookings)
    days_in_year = 366 if (now.year % 4 == 0 and (now.year % 100 != 0 or now.year % 400 == 0)) else 365
    confirmed_count = len([b for b in active_bookings if b.get("status") in ("confirmed", "deposit_paid", "fully_paid", "checked_in", "checked_out")])
    pending_payments = sum(outstanding_balance(b) for b in active_bookings if not b.get("balance_paid"))

    # monthly series (last 6 months)
    months_series = []
    ref = now.replace(day=1)
    for i in range(5, -1, -1):
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

    today_iso = now.date().isoformat()
    urgent_tasks = sorted(
        [t for t in tasks_all if t.get("status") != "done"
         and (t.get("priority") == "high" or (t.get("due_date") and t.get("due_date") < today_iso))],
        key=lambda t: (t.get("due_date") or "9999-99-99", t.get("priority") != "high"),
    )

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
        "nights_this_year": nights_this_year,
        "occupancy_pct": round((nights_this_year / days_in_year) * 100, 1),
        "monthly_series": months_series,
        "source_breakdown": {
            "direct": len([b for b in active_bookings if b.get("source") == "direct"]),
            "tuscany_now": len([b for b in active_bookings if b.get("source") == "tuscany_now"]),
            "other_agency": len([b for b in active_bookings if b.get("source") == "other_agency"]),
            "referral": len([b for b in active_bookings if b.get("source") == "referral"]),
        },
        "urgent_tasks": urgent_tasks[:5],
    }


# ---------- Backup / Export ----------
@api_router.get("/export")
def export_all_data():
    with Session(engine) as session:
        data = {}
        for name, model in MODELS.items():
            items = session.exec(select(model)).all()
            data[name] = [_decode(name, item.model_dump()) for item in items]
        property_row = session.get(PropertyInfo, "singleton")
        settings_row = session.get(Settings, "singleton")
        data["property"] = property_row.model_dump() if property_row else PropertyInfo().model_dump()
        data["settings"] = settings_row.model_dump() if settings_row else Settings().model_dump()
        data["exported_at"] = _now_iso()
        return data


# ---------- Seed ----------
@api_router.post("/seed")
def seed_data():
    today = datetime.now(timezone.utc).date()

    def d(days_offset):
        return (today + timedelta(days=days_offset)).isoformat()

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

    agencies_seed = [
        {"name": "Tuscany Now & More", "commission_pct": 30, "contact_name": "Chiara Moretti",
         "contact_email": "chiara@tuscanynowandmore.com", "contact_phone": "+44 20 7684 8884",
         "website": "https://www.tuscanynowandmore.com", "notes": "Main booking agency partner."},
    ]

    with Session(engine) as session:
        # Clear existing
        for model in (Booking, Experience, Provider, Document, Task, Agency):
            for row in session.exec(select(model)).all():
                session.delete(row)
        session.commit()

        for p in providers:
            session.add(Provider(**p))
        for e in experiences:
            session.add(Experience(**e))
        for b in bookings_seed:
            session.add(Booking(**b))
        for t in tasks_seed:
            session.add(Task(**t))
        for doc in documents_seed:
            session.add(Document(**doc))
        for a in agencies_seed:
            session.add(Agency(**a))

        settings_row = session.get(Settings, "singleton")
        if not settings_row:
            session.add(Settings(id="singleton"))
        else:
            for key, value in Settings().model_dump().items():
                if key != "id":
                    setattr(settings_row, key, value)
            session.add(settings_row)

        property_defaults = {
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
        }
        property_row = session.get(PropertyInfo, "singleton")
        if not property_row:
            session.add(PropertyInfo(**property_defaults))
        else:
            for key, value in property_defaults.items():
                if key != "id":
                    setattr(property_row, key, value)
            session.add(property_row)

        session.commit()

    logger.info(
        "Database reseeded: %d bookings, %d experiences, %d providers, %d documents, %d tasks, %d agencies",
        len(bookings_seed), len(experiences), len(providers), len(documents_seed), len(tasks_seed), len(agencies_seed),
    )
    return {"seeded": True, "bookings": len(bookings_seed), "experiences": len(experiences),
            "providers": len(providers), "documents": len(documents_seed), "tasks": len(tasks_seed),
            "agencies": len(agencies_seed)}


@api_router.get("/")
def root():
    return {"app": "Casa Castagno Manager", "status": "ok"}


app.include_router(api_router)

_cors_origins_env = os.environ.get("CORS_ORIGINS")
if not _cors_origins_env:
    logger.warning(
        "CORS_ORIGINS is not set; defaulting to no allowed origins. "
        "Set CORS_ORIGINS in backend/.env (e.g. http://localhost:3000) for the frontend to reach this API."
    )
_cors_origins = [o.strip() for o in _cors_origins_env.split(",")] if _cors_origins_env else []

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
