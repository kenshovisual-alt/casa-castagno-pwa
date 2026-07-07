export const SOURCES = [
  { value: "direct", label: "Direct", color: "#6F7B55" },
  { value: "tuscany_now", label: "Tuscany Now & More", color: "#A86848" },
  { value: "other_agency", label: "Other Agency", color: "#B8AC98" },
  { value: "referral", label: "Referral", color: "#8A9273" },
  { value: "blocked", label: "Blocked", color: "#4A4A4A" },
];

export const SOURCE_MAP = Object.fromEntries(SOURCES.map((s) => [s.value, s]));

export const STATUSES = [
  { value: "enquiry", label: "Enquiry" },
  { value: "tentative", label: "Tentative" },
  { value: "confirmed", label: "Confirmed" },
  { value: "deposit_paid", label: "Deposit paid" },
  { value: "fully_paid", label: "Fully paid" },
  { value: "checked_in", label: "Checked in" },
  { value: "checked_out", label: "Checked out" },
  { value: "cancelled", label: "Cancelled" },
  { value: "blocked", label: "Blocked" },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));

export const EXPERIENCE_CATEGORIES = [
  { value: "on_estate", label: "On the estate" },
  { value: "off_estate", label: "Off the estate" },
  { value: "cultural", label: "Cultural visits" },
  { value: "day_trip", label: "Day trips" },
  { value: "wellness", label: "Wellness" },
  { value: "food_wine", label: "Food & wine" },
  { value: "outdoor", label: "Outdoor" },
  { value: "custom", label: "Custom request" },
];
export const EXP_CAT_LABEL = Object.fromEntries(EXPERIENCE_CATEGORIES.map((c) => [c.value, c.label]));

export const PROVIDER_TYPES = [
  { value: "experience_provider", label: "Experience provider" },
  { value: "chef", label: "Chef" },
  { value: "cleaning", label: "Cleaning" },
  { value: "maintenance", label: "Maintenance" },
  { value: "driver", label: "Driver" },
  { value: "wine_partner", label: "Wine partner" },
  { value: "wellness_provider", label: "Wellness provider" },
  { value: "farm_producer", label: "Farm / food producer" },
  { value: "agency_contact", label: "Agency contact" },
  { value: "emergency_contact", label: "Emergency contact" },
  { value: "other", label: "Other" },
];
export const PROVIDER_TYPE_LABEL = Object.fromEntries(PROVIDER_TYPES.map((t) => [t.value, t.label]));

export const DOCUMENT_CATEGORIES = [
  { value: "booking_documents", label: "Booking documents" },
  { value: "guest_documents", label: "Guest documents" },
  { value: "invoices", label: "Invoices" },
  { value: "contracts", label: "Contracts" },
  { value: "agency_documents", label: "Agency documents" },
  { value: "property_documents", label: "Property documents" },
  { value: "experience_documents", label: "Experience documents" },
  { value: "provider_documents", label: "Provider documents" },
  { value: "maintenance_documents", label: "Maintenance documents" },
  { value: "house_manuals", label: "House manuals" },
  { value: "photos", label: "Photos" },
  { value: "other", label: "Other" },
];
export const DOC_CAT_LABEL = Object.fromEntries(DOCUMENT_CATEGORIES.map((c) => [c.value, c.label]));

export const TASK_TYPES = [
  { value: "booking", label: "Booking" },
  { value: "guest", label: "Guest" },
  { value: "property", label: "Property" },
  { value: "experience", label: "Experience" },
  { value: "provider", label: "Provider" },
  { value: "finance", label: "Finance" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

export const CHECKLIST_ITEMS = [
  { key: "deposit_received", label: "Deposit received" },
  { key: "balance_received", label: "Balance received" },
  { key: "guest_confirmed", label: "Guest details confirmed" },
  { key: "arrival_confirmed", label: "Arrival time confirmed" },
  { key: "house_ready", label: "House ready" },
  { key: "cleaning_arranged", label: "Cleaning arranged" },
  { key: "chef_arranged", label: "Chef arranged" },
  { key: "experiences_arranged", label: "Experiences arranged" },
  { key: "welcome_sent", label: "Welcome message sent" },
  { key: "checkin_completed", label: "Check-in completed" },
  { key: "checkout_completed", label: "Check-out completed" },
];

export function nightsBetween(ci, co) {
  if (!ci || !co) return 0;
  const a = new Date(ci);
  const b = new Date(co);
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function formatMoney(n, currency = "EUR") {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function computeFinance(b) {
  const gross = Number(b.gross_amount || 0);
  const pct = b.source === "direct" ? 0 : Number(b.commission_pct || 0);
  const commission = gross * pct / 100;
  const net = gross - commission;
  const extras = Number(b.extras_revenue || 0);
  const exp = Number(b.experience_revenue || 0);
  const clean = Number(b.cleaning_fee || 0);
  return {
    commission, net, total: net + extras + exp + clean,
    balance: gross - Number(b.deposit_amount || 0),
  };
}
