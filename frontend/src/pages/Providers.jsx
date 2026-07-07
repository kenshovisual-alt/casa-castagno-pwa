import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader } from "../components/Ui";
import { PROVIDER_TYPES, PROVIDER_TYPE_LABEL } from "../lib/constants";
import { Plus, Pencil, Trash2, Phone, Mail, Star } from "lucide-react";
import { toast } from "sonner";

export default function Providers() {
  const [items, setItems] = useState([]);
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const load = () => api.list("providers").then(setItems);
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((p) =>
    (type === "all" || p.type === type) &&
    (!q || `${p.name} ${p.company} ${p.role} ${p.location}`.toLowerCase().includes(q.toLowerCase()))
  ), [items, type, q]);

  const del = async (id) => {
    if (!window.confirm("Delete this contact?")) return;
    await api.remove("providers", id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[1400px]">
      <PageHeader overline="Network" title="Contacts & providers" action={
        <Link to="/contacts/new" className="cc-btn-primary inline-flex items-center gap-2" data-testid="btn-new-provider">
          <Plus size={16} /> New contact
        </Link>
      } />

      <div className="cc-card p-4 mb-4 flex flex-wrap gap-3">
        <input className="cc-input flex-1 min-w-[220px]" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="prov-search" />
        <select className="cc-input w-auto" value={type} onChange={(e) => setType(e.target.value)} data-testid="prov-filter-type">
          <option value="all">All types</option>
          {PROVIDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div key={p.id} className="cc-card p-5" data-testid={`prov-card-${p.id}`}>
            <div className="overline mb-2">{PROVIDER_TYPE_LABEL[p.type]}</div>
            <div className="serif text-2xl" style={{ color: "var(--cc-forest)" }}>{p.name}</div>
            <div className="text-sm" style={{ color: "var(--cc-muted)" }}>{p.company} · {p.role}</div>
            <div className="mt-3 space-y-1 text-sm">
              {p.phone && <div className="flex items-center gap-2"><Phone size={12} /> {p.phone}</div>}
              {p.email && <div className="flex items-center gap-2"><Mail size={12} /> {p.email}</div>}
              {p.location && <div style={{ color: "var(--cc-muted)" }}>{p.location} · {p.languages}</div>}
            </div>
            <div className="mt-3 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={13} fill={i < p.reliability ? "#A86848" : "none"} stroke="#A86848" />
              ))}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Link to={`/contacts/${p.id}/edit`} className="cc-btn-ghost" data-testid={`prov-edit-${p.id}`}><Pencil size={14} /></Link>
              <button className="cc-btn-ghost" onClick={() => del(p.id)} data-testid={`prov-del-${p.id}`}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
