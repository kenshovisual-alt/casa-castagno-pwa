import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader } from "../components/Ui";
import { EXPERIENCE_CATEGORIES, EXP_CAT_LABEL, formatMoney } from "../lib/constants";
import { Plus, Pencil, Trash2, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Experiences() {
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const load = () => api.list("experiences").then(setItems);
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((e) =>
    (cat === "all" || e.category === cat) &&
    (!q || `${e.name} ${e.location} ${e.short_description}`.toLowerCase().includes(q.toLowerCase()))
  ), [items, cat, q]);

  const del = async (id) => {
    if (!window.confirm("Delete this experience?")) return;
    await api.remove("experiences", id);
    toast.success("Deleted");
    load();
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((e) => (
          <div key={e.id} className="cc-card p-5 flex flex-col" data-testid={`exp-card-${e.id}`}>
            <div className="overline mb-2">{EXP_CAT_LABEL[e.category]}</div>
            <div className="serif text-2xl mb-2" style={{ color: "var(--cc-forest)" }}>{e.name}</div>
            <p className="text-sm mb-3" style={{ color: "var(--cc-muted)" }}>{e.short_description}</p>
            <div className="text-xs space-y-1" style={{ color: "var(--cc-muted)" }}>
              {e.location && <div className="flex items-center gap-1"><MapPin size={12} /> {e.location} {e.distance_km ? `· ${e.distance_km} km` : ""}</div>}
              {e.duration && <div className="flex items-center gap-1"><Clock size={12} /> {e.duration}</div>}
            </div>
            <div className="mt-3 flex justify-between items-center">
              <div>
                <div className="overline">Guest price</div>
                <div className="serif text-xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(e.price_guest)}</div>
              </div>
              <div className="flex gap-2">
                <Link to={`/experiences/${e.id}/edit`} className="cc-btn-ghost" data-testid={`exp-edit-${e.id}`}><Pencil size={14} /></Link>
                <button className="cc-btn-ghost" onClick={() => del(e.id)} data-testid={`exp-del-${e.id}`}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-10 text-sm" style={{ color: "var(--cc-muted)" }}>No experiences.</div>}
      </div>
    </div>
  );
}
