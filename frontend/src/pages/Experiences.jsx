import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { deleteWithUndo } from "../lib/deleteWithUndo";
import { PageHeader, EmptyState } from "../components/Ui";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { EXPERIENCE_CATEGORIES, EXP_CAT_LABEL, formatMoney } from "../lib/constants";
import { Plus, Pencil, Trash2, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";

const Row = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b" style={{ borderColor: "var(--cc-border)" }}>
    <span className="text-xs uppercase tracking-widest" style={{ color: "var(--cc-muted)" }}>{label}</span>
    <span className="text-sm text-right" style={{ color: "var(--cc-forest)" }}>{value ?? "—"}</span>
  </div>
);

export default function Experiences() {
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const load = () => api.list("experiences").then(setItems);
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((e) =>
    (cat === "all" || e.category === cat) &&
    (!q || `${e.name} ${e.location} ${e.short_description}`.toLowerCase().includes(q.toLowerCase()))
  ), [items, cat, q]);

  const openIndex = filtered.findIndex((e) => e.id === openId);
  const open = openIndex >= 0 ? filtered[openIndex] : null;
  const goNext = () => setOpenId(filtered[(openIndex + 1) % filtered.length].id);
  const goPrev = () => setOpenId(filtered[(openIndex - 1 + filtered.length) % filtered.length].id);

  const del = (experience) => {
    setItems((prev) => prev.filter((e) => e.id !== experience.id));
    deleteWithUndo({ resource: "experiences", record: experience, label: "Experience", onSettled: load });
  };

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[1400px]">
      <PageHeader overline="Guest offer" title="Experiences" action={
        <Link to="/experiences/new" className="cc-btn-primary inline-flex items-center gap-2" data-testid="btn-new-experience">
          <Plus size={16} /> New experience
        </Link>
      } />

      <div className="cc-card p-4 mb-4 flex flex-wrap gap-3">
        <input className="cc-input flex-1 min-w-[220px]" placeholder="Search experiences…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="exp-search" />
        <select className="cc-input w-auto" value={cat} onChange={(e) => setCat(e.target.value)} data-testid="exp-filter">
          <option value="all">All categories</option>
          {EXPERIENCE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No experiences yet"
          hint={items.length === 0 ? "Add your first guest experience to start building the offer." : "No experiences match your search or filter."}
          action={items.length === 0 && (
            <Link to="/experiences/new" className="cc-btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> New experience
            </Link>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => {
            const margin = Number(e.price_guest || 0) - Number(e.cost_owner || 0);
            return (
              <div
                key={e.id}
                className="cc-card p-5 flex flex-col text-left cursor-pointer transition-shadow hover:shadow-md"
                data-testid={`exp-card-${e.id}`}
                onClick={() => setOpenId(e.id)}
              >
                <div className="cc-overline mb-2">{EXP_CAT_LABEL[e.category]}</div>
                <div className="serif text-2xl mb-2" style={{ color: "var(--cc-forest)" }}>{e.name}</div>
                <p className="text-sm mb-3" style={{ color: "var(--cc-muted)" }}>{e.short_description}</p>
                <div className="text-xs space-y-1" style={{ color: "var(--cc-muted)" }}>
                  {e.location && <div className="flex items-center gap-1"><MapPin size={12} /> {e.location} {e.distance_km ? `· ${e.distance_km} km` : ""}</div>}
                  {e.duration && <div className="flex items-center gap-1"><Clock size={12} /> {e.duration}</div>}
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <div>
                    <div className="cc-overline">Guest price</div>
                    <div className="serif text-xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(e.price_guest)}</div>
                  </div>
                  <div className="text-right">
                    <div className="cc-overline">Margin</div>
                    <div className="serif text-xl" style={{ color: "var(--cc-olive)" }}>{formatMoney(margin)}</div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2" onClick={(ev) => ev.stopPropagation()}>
                  <Link to={`/experiences/${e.id}/edit`} className="cc-btn-ghost" data-testid={`exp-edit-${e.id}`}><Pencil size={14} /></Link>
                  <button className="cc-btn-ghost" onClick={() => del(e)} data-testid={`exp-del-${e.id}`}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="exp-detail-dialog">
          {open && (
            <>
              <div className="flex items-start justify-between gap-4 pr-6">
                <div>
                  <div className="cc-overline mb-1">{EXP_CAT_LABEL[open.category]}</div>
                  <DialogTitle className="serif text-3xl" style={{ color: "var(--cc-forest)" }}>{open.name}</DialogTitle>
                </div>
              </div>

              {open.short_description && (
                <p className="text-sm mt-2" style={{ color: "var(--cc-muted)" }}>{open.short_description}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
                <div>
                  <div className="cc-overline">Guest price</div>
                  <div className="serif text-2xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(open.price_guest)}</div>
                </div>
                <div>
                  <div className="cc-overline">Cost to owner</div>
                  <div className="serif text-2xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(open.cost_owner)}</div>
                </div>
                <div>
                  <div className="cc-overline">Margin</div>
                  <div className="serif text-2xl" style={{ color: "var(--cc-olive)" }}>
                    {formatMoney(Number(open.price_guest || 0) - Number(open.cost_owner || 0))}
                  </div>
                </div>
                <div>
                  <div className="cc-overline">Commission</div>
                  <div className="serif text-2xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(open.commission)}</div>
                </div>
              </div>

              <Row label="Location" value={open.location ? `${open.location}${open.distance_km ? ` · ${open.distance_km} km` : ""}` : "—"} />
              <Row label="Duration" value={open.duration} />
              <Row label="Best season" value={open.best_season} />
              <Row label="Guests" value={`${open.min_guests}–${open.max_guests}`} />
              <Row label="Provider" value={open.provider_name} />
              <Row label="Provider contact" value={open.provider_contact} />
              <Row label="Booking lead time" value={open.lead_time} />
              <Row label="Cancellation terms" value={open.cancellation_terms} />
              <Row label="Status" value={open.status} />
              {open.guest_notes && <Row label="Guest notes" value={open.guest_notes} />}
              {open.internal_notes && <Row label="Internal notes" value={open.internal_notes} />}

              <div className="flex items-center justify-between mt-6">
                <div className="flex gap-2">
                  <button className="cc-btn-ghost inline-flex items-center gap-1" onClick={goPrev} data-testid="exp-detail-prev">
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button className="cc-btn-ghost inline-flex items-center gap-1" onClick={goNext} data-testid="exp-detail-next">
                    Next <ChevronRight size={16} />
                  </button>
                </div>
                <Link to={`/experiences/${open.id}/edit`} className="cc-btn-primary inline-flex items-center gap-2" data-testid="exp-detail-edit">
                  <Pencil size={14} /> Edit
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
