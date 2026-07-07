import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader, SourceBadge, StatusBadge } from "../components/Ui";
import { CHECKLIST_ITEMS, formatDate, formatMoney, computeFinance, nightsBetween } from "../lib/constants";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

const Row = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b" style={{ borderColor: "var(--cc-border)" }}>
    <span className="text-xs uppercase tracking-widest" style={{ color: "var(--cc-muted)" }}>{label}</span>
    <span className="text-sm" style={{ color: "var(--cc-forest)" }}>{value ?? "—"}</span>
  </div>
);

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [b, setB] = useState(null);
  const [experiences, setExperiences] = useState([]);

  useEffect(() => {
    api.get("bookings", id).then(setB);
    api.list("experiences").then(setExperiences);
  }, [id]);

  if (!b) return <div className="p-8">Loading…</div>;

  const fin = computeFinance(b);
  const nights = nightsBetween(b.checkin, b.checkout);

  const toggleChecklist = async (k) => {
    const checklist = { ...(b.checklist || {}), [k]: !(b.checklist?.[k]) };
    const updated = await api.update("bookings", b.id, { checklist });
    setB(updated);
  };

  const onDelete = async () => {
    if (!window.confirm("Delete this booking?")) return;
    await api.remove("bookings", b.id);
    toast.success("Booking deleted");
    navigate("/bookings");
  };

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[1200px]">
      <PageHeader
        overline={`Booking · ${b.id.slice(0, 8)}`}
        title={b.guest_name || "Blocked dates"}
        action={
          <div className="flex gap-2">
            <Link to={`/bookings/${b.id}/edit`} className="cc-btn-ghost inline-flex items-center gap-2" data-testid="btn-edit-booking"><Pencil size={14} /> Edit</Link>
            <button onClick={onDelete} className="cc-btn-ghost inline-flex items-center gap-2" data-testid="btn-delete-booking"><Trash2 size={14} /> Delete</button>
          </div>
        }
      >
        <div className="mt-3 flex gap-3"><SourceBadge source={b.source} /><StatusBadge status={b.status} /></div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="cc-card p-6">
            <div className="overline mb-3">Stay</div>
            <Row label="Check-in" value={`${formatDate(b.checkin)} · ${b.arrival_time || "—"}`} />
            <Row label="Check-out" value={`${formatDate(b.checkout)} · ${b.departure_time || "—"}`} />
            <Row label="Nights" value={nights} />
            <Row label="Guests" value={`${b.adults} adults · ${b.children} children`} />
            <Row label="Country" value={b.country} />
            <Row label="Email" value={b.guest_email} />
            <Row label="Phone" value={b.guest_phone} />
          </section>

          <section className="cc-card p-6">
            <div className="overline mb-3">Finance</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div><div className="overline">Gross</div><div className="serif text-2xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(b.gross_amount, b.currency)}</div></div>
              <div><div className="overline">Commission</div><div className="serif text-2xl" style={{ color: "var(--cc-terracotta)" }}>{formatMoney(fin.commission, b.currency)}</div></div>
              <div><div className="overline">Net owner</div><div className="serif text-2xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(fin.net, b.currency)}</div></div>
              <div><div className="overline">Balance due</div><div className="serif text-2xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(fin.balance, b.currency)}</div></div>
            </div>
            <Row label="Deposit" value={`${formatMoney(b.deposit_amount, b.currency)} · ${b.deposit_paid ? "paid" : "not paid"}`} />
            <Row label="Cleaning fee" value={formatMoney(b.cleaning_fee, b.currency)} />
            <Row label="Extras revenue" value={formatMoney(b.extras_revenue, b.currency)} />
            <Row label="Experience revenue" value={formatMoney(b.experience_revenue, b.currency)} />
            <Row label="Balance paid" value={b.balance_paid ? "yes" : "no"} />
          </section>

          <section className="cc-card p-6">
            <div className="overline mb-3">Requests & notes</div>
            <Row label="Special requests" value={b.special_requests} />
            <Row label="Food preferences" value={b.food_preferences} />
            <Row label="Allergies" value={b.allergies} />
            <Row label="Pets" value={b.pets ? "yes" : "no"} />
            <Row label="Private chef" value={b.private_chef ? "yes" : "no"} />
            <Row label="Experiences requested" value={b.experiences_requested ? "yes" : "no"} />
            <Row label="Cleaning notes" value={b.cleaning_notes} />
            <Row label="Internal notes" value={b.internal_notes} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="cc-card p-6">
            <div className="overline mb-3">Operational checklist</div>
            <ul className="space-y-2">
              {CHECKLIST_ITEMS.map((c) => (
                <li key={c.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!b.checklist?.[c.key]}
                    onChange={() => toggleChecklist(c.key)}
                    data-testid={`checklist-${c.key}`}
                  />
                  <span style={{ color: "var(--cc-forest)" }}>{c.label}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="cc-card p-6">
            <div className="overline mb-3">Linked experiences</div>
            {(b.experience_ids || []).length === 0 ? (
              <p className="text-sm" style={{ color: "var(--cc-muted)" }}>No experiences linked.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(b.experience_ids || []).map((eid) => {
                  const e = experiences.find((x) => x.id === eid);
                  return <li key={eid}>{e?.name || eid}</li>;
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
