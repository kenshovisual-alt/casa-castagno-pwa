import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader } from "../components/Ui";
import { SOURCES, STATUSES, computeFinance, nightsBetween, formatMoney } from "../lib/constants";
import { toast } from "sonner";

const empty = {
  guest_name: "", guest_email: "", guest_phone: "", country: "",
  source: "direct", agency_id: "", status: "enquiry",
  checkin: "", checkout: "", adults: 2, children: 0,
  arrival_time: "16:00", departure_time: "10:00",
  special_requests: "", internal_notes: "", guest_notes: "", cleaning_notes: "",
  food_preferences: "", allergies: "",
  pets: false, private_chef: false, experiences_requested: false,
  gross_amount: 0, currency: "EUR", commission_pct: 0,
  deposit_amount: 0, deposit_paid: false, balance_paid: false,
  cleaning_fee: 0, extras_revenue: 0, experience_revenue: 0,
};

const Field = ({ label, children, testId, span = "" }) => (
  <div className={span}>
    <label className="cc-label">{label}</label>
    {children}
  </div>
);

export default function BookingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [b, setB] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState("");
  const [agencies, setAgencies] = useState([]);
  const [propertyCapacity, setPropertyCapacity] = useState(null);

  useEffect(() => {
    if (id) {
      api.get("bookings", id).then((d) => setB({ ...empty, ...d }));
    } else {
      api.singleton("settings").then((s) => {
        setB((p) => ({ ...p, commission_pct: Number(s.default_commission) || p.commission_pct }));
        setPropertyCapacity(s.property_capacity);
      });
    }
    api.list("agencies").then(setAgencies);
  }, [id]);

  const set = (k, v) => setB((p) => ({ ...p, [k]: v }));
  const setNumber = (k, v) => setB((p) => ({ ...p, [k]: v === "" ? "" : Number(v) }));
  const nights = nightsBetween(b.checkin, b.checkout);
  const fin = computeFinance(b);
  const totalGuests = Number(b.adults || 0) + Number(b.children || 0);
  const overCapacity = propertyCapacity && totalGuests > propertyCapacity;

  const onSubmit = async (e) => {
    e.preventDefault();
    setDateError("");

    if (b.checkin && b.checkout && b.checkout <= b.checkin) {
      setDateError("Check-out date must be after check-in date");
      toast.error("Check-out must be after check-in");
      return;
    }
    if (b.source === "other_agency" && !b.agency_id) {
      toast.error("Select an agency for this booking source");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...b, gross_amount: Number(b.gross_amount), commission_pct: Number(b.commission_pct),
        adults: Number(b.adults), children: Number(b.children), deposit_amount: Number(b.deposit_amount),
        cleaning_fee: Number(b.cleaning_fee), extras_revenue: Number(b.extras_revenue), experience_revenue: Number(b.experience_revenue) };
      if (id) {
        await api.update("bookings", id, payload);
        toast.success("Booking updated");
      } else {
        const created = await api.create("bookings", payload);
        toast.success("Booking created");
        navigate(`/bookings/${created.id}`);
        return;
      }
      navigate(`/bookings/${id}`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const status = err?.response?.status;
      if ((status === 409 || status === 422) && detail) {
        setDateError(detail);
        toast.error(status === 409 ? "Dates conflict with another booking" : detail);
      } else {
        toast.error("Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const isDirect = b.source === "direct" || b.source === "blocked";

  const onAgencyChange = (agencyId) => {
    const agency = agencies.find((a) => a.id === agencyId);
    setB((p) => ({ ...p, agency_id: agencyId, commission_pct: agency ? agency.commission_pct : p.commission_pct }));
  };

  return (
    <form onSubmit={onSubmit} className="px-6 md:px-10 lg:px-14 py-10 max-w-[1100px]" data-testid="booking-form">
      <PageHeader overline={id ? "Edit" : "New"} title={id ? "Edit booking" : "New booking"} />

      <section className="cc-card p-6 mb-6">
        <h3 className="serif text-2xl mb-4" style={{ color: "var(--cc-forest)" }}>Guest & stay</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Guest full name"><input className="cc-input" value={b.guest_name} onChange={(e) => set("guest_name", e.target.value)} data-testid="f-guest-name" /></Field>
          <Field label="Country"><input className="cc-input" value={b.country} onChange={(e) => set("country", e.target.value)} data-testid="f-country" /></Field>
          <Field label="Email"><input className="cc-input" type="email" value={b.guest_email} onChange={(e) => set("guest_email", e.target.value)} data-testid="f-email" /></Field>
          <Field label="Phone / WhatsApp"><input className="cc-input" value={b.guest_phone} onChange={(e) => set("guest_phone", e.target.value)} data-testid="f-phone" /></Field>
          <Field label="Check-in"><input className="cc-input" type="date" value={b.checkin} onChange={(e) => set("checkin", e.target.value)} data-testid="f-checkin" /></Field>
          <Field label="Check-out"><input className="cc-input" type="date" value={b.checkout} onChange={(e) => set("checkout", e.target.value)} data-testid="f-checkout" /></Field>
          <Field label="Adults"><input className="cc-input" type="number" min="0" value={b.adults} onChange={(e) => setNumber("adults", e.target.value)} data-testid="f-adults" /></Field>
          <Field label="Children"><input className="cc-input" type="number" min="0" value={b.children} onChange={(e) => setNumber("children", e.target.value)} data-testid="f-children" /></Field>
          <Field label="Arrival time"><input className="cc-input" value={b.arrival_time} onChange={(e) => set("arrival_time", e.target.value)} /></Field>
          <Field label="Departure time"><input className="cc-input" value={b.departure_time} onChange={(e) => set("departure_time", e.target.value)} /></Field>
        </div>
        <div className="mt-3 text-xs" style={{ color: "var(--cc-muted)" }}>Nights: <strong style={{ color: "var(--cc-forest)" }}>{nights}</strong> · Total guests: <strong style={{ color: "var(--cc-forest)" }}>{totalGuests}</strong></div>
        {overCapacity && (
          <div
            className="mt-3 text-sm px-3 py-2 rounded-md"
            style={{ background: "rgba(168, 104, 72, 0.12)", color: "var(--cc-terracotta)" }}
            data-testid="capacity-warning"
          >
            {totalGuests} guests exceeds the property capacity of {propertyCapacity}.
          </div>
        )}
        {dateError && (
          <div
            className="mt-3 text-sm px-3 py-2 rounded-md"
            style={{ background: "rgba(168, 104, 72, 0.12)", color: "var(--cc-terracotta)" }}
            data-testid="date-conflict-error"
          >
            {dateError}
          </div>
        )}
      </section>

      <section className="cc-card p-6 mb-6">
        <h3 className="serif text-2xl mb-4" style={{ color: "var(--cc-forest)" }}>Source & status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Source">
            <select className="cc-input" value={b.source} onChange={(e) => set("source", e.target.value)} data-testid="f-source">
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="cc-input" value={b.status} onChange={(e) => set("status", e.target.value)} data-testid="f-status">
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          {b.source === "other_agency" && (
            <Field label="Agency">
              <select className="cc-input" value={b.agency_id} onChange={(e) => onAgencyChange(e.target.value)} data-testid="f-agency">
                <option value="">Select an agency…</option>
                {agencies.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.commission_pct}%)</option>)}
              </select>
              {agencies.length === 0 && (
                <p className="text-xs mt-2" style={{ color: "var(--cc-muted)" }}>
                  No agencies yet — add one in Settings.
                </p>
              )}
            </Field>
          )}
        </div>
      </section>

      <section className="cc-card p-6 mb-6">
        <h3 className="serif text-2xl mb-4" style={{ color: "var(--cc-forest)" }}>Finance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Gross amount"><input className="cc-input" type="number" value={b.gross_amount} onChange={(e) => setNumber("gross_amount", e.target.value)} data-testid="f-gross" /></Field>
          <Field label="Currency"><input className="cc-input" value={b.currency} onChange={(e) => set("currency", e.target.value)} /></Field>
          <Field label={`Commission % ${isDirect ? "(direct: 0)" : ""}`}>
            <select className="cc-input" value={b.commission_pct} onChange={(e) => setNumber("commission_pct", e.target.value)} disabled={isDirect} data-testid="f-commission">
              <option value="0">0%</option>
              <option value="20">20%</option>
              <option value="25">25%</option>
              <option value="30">30%</option>
              <option value={b.commission_pct}>{b.commission_pct}% (custom)</option>
            </select>
          </Field>
          <Field label="Deposit amount"><input className="cc-input" type="number" value={b.deposit_amount} onChange={(e) => setNumber("deposit_amount", e.target.value)} data-testid="f-deposit" /></Field>
          <Field label="Cleaning fee"><input className="cc-input" type="number" value={b.cleaning_fee} onChange={(e) => setNumber("cleaning_fee", e.target.value)} /></Field>
          <Field label="Extras revenue"><input className="cc-input" type="number" value={b.extras_revenue} onChange={(e) => setNumber("extras_revenue", e.target.value)} /></Field>
          <Field label="Experience revenue"><input className="cc-input" type="number" value={b.experience_revenue} onChange={(e) => setNumber("experience_revenue", e.target.value)} /></Field>
          <label className="flex items-center gap-2 mt-6 text-sm"><input type="checkbox" checked={b.deposit_paid} onChange={(e) => set("deposit_paid", e.target.checked)} data-testid="f-deposit-paid" /> Deposit paid</label>
          <label className="flex items-center gap-2 mt-6 text-sm"><input type="checkbox" checked={b.balance_paid} onChange={(e) => set("balance_paid", e.target.checked)} /> Balance paid</label>
        </div>
        <hr className="cc-divider my-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="cc-overline">Commission</div><div className="serif text-xl" style={{ color: "var(--cc-terracotta)" }}>{formatMoney(fin.commission, b.currency)}</div></div>
          <div><div className="cc-overline">Net owner</div><div className="serif text-xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(fin.net, b.currency)}</div></div>
          <div><div className="cc-overline">Balance due</div><div className="serif text-xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(fin.balance, b.currency)}</div></div>
          <div><div className="cc-overline">Total revenue</div><div className="serif text-xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(fin.total, b.currency)}</div></div>
        </div>
      </section>

      <section className="cc-card p-6 mb-6">
        <h3 className="serif text-2xl mb-4" style={{ color: "var(--cc-forest)" }}>Guest requests & operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Special requests"><textarea className="cc-input" rows={3} value={b.special_requests} onChange={(e) => set("special_requests", e.target.value)} /></Field>
          <Field label="Food preferences"><textarea className="cc-input" rows={3} value={b.food_preferences} onChange={(e) => set("food_preferences", e.target.value)} /></Field>
          <Field label="Allergies"><textarea className="cc-input" rows={2} value={b.allergies} onChange={(e) => set("allergies", e.target.value)} /></Field>
          <Field label="Guest notes"><textarea className="cc-input" rows={2} value={b.guest_notes} onChange={(e) => set("guest_notes", e.target.value)} /></Field>
          <Field label="Cleaning notes"><textarea className="cc-input" rows={2} value={b.cleaning_notes} onChange={(e) => set("cleaning_notes", e.target.value)} /></Field>
          <Field label="Internal notes"><textarea className="cc-input" rows={2} value={b.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={b.pets} onChange={(e) => set("pets", e.target.checked)} /> Pets</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={b.private_chef} onChange={(e) => set("private_chef", e.target.checked)} /> Private chef</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={b.experiences_requested} onChange={(e) => set("experiences_requested", e.target.checked)} /> Experiences requested</label>
        </div>
      </section>

      <div className="flex gap-3 justify-end">
        <button type="button" className="cc-btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        <button type="submit" className="cc-btn-primary" disabled={saving} data-testid="btn-save-booking">{saving ? "Saving…" : "Save booking"}</button>
      </div>
    </form>
  );
}
