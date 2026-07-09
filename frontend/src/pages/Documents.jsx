import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { deleteWithUndo } from "../lib/deleteWithUndo";
import { PageHeader } from "../components/Ui";
import { DOCUMENT_CATEGORIES, DOC_CAT_LABEL, formatDate } from "../lib/constants";
import { Plus, Trash2, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

const empty = { title: "", category: "other", file_url: "", notes: "", booking_id: "", provider_id: "", experience_id: "" };

export default function Documents() {
  const [items, setItems] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [providers, setProviders] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(empty);
  const load = () => api.list("documents").then(setItems);
  useEffect(() => {
    load();
    api.list("bookings").then(setBookings);
    api.list("providers").then(setProviders);
    api.list("experiences").then(setExperiences);
  }, []);

  const filtered = useMemo(() => items.filter((d) =>
    (cat === "all" || d.category === cat) &&
    (!q || `${d.title} ${d.notes}`.toLowerCase().includes(q.toLowerCase()))
  ), [items, cat, q]);

  const add = async () => {
    if (!draft.title) return toast.error("Title required");
    await api.create("documents", draft);
    setDraft(empty); setShowForm(false); load(); toast.success("Document added");
  };
  const del = (document) => {
    setItems((prev) => prev.filter((d) => d.id !== document.id));
    deleteWithUndo({ resource: "documents", record: document, label: "Document", onSettled: load });
  };

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[1400px]">
      <PageHeader overline="Archive" title="Documents" action={
        <button className="cc-btn-primary inline-flex items-center gap-2" onClick={() => setShowForm(!showForm)} data-testid="btn-new-doc">
          <Plus size={16} /> New document
        </button>
      } />

      {showForm && (
        <div className="cc-card p-5 mb-6" data-testid="doc-form">
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Cancel"
              data-testid="btn-cancel-top-doc"
              className="flex items-center justify-center w-9 h-9 rounded-full border transition-colors"
              style={{ borderColor: "var(--cc-border)", color: "var(--cc-forest)" }}
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="cc-input" placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} data-testid="doc-f-title" />
            <select className="cc-input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {DOCUMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input className="cc-input md:col-span-2" placeholder="File URL / link" value={draft.file_url} onChange={(e) => setDraft({ ...draft, file_url: e.target.value })} />
            <select className="cc-input" value={draft.booking_id} onChange={(e) => setDraft({ ...draft, booking_id: e.target.value })} data-testid="doc-f-booking">
              <option value="">Link to booking (optional)…</option>
              {bookings.map((b) => <option key={b.id} value={b.id}>{b.guest_name || "Blocked"} · {b.checkin}</option>)}
            </select>
            <select className="cc-input" value={draft.provider_id} onChange={(e) => setDraft({ ...draft, provider_id: e.target.value })} data-testid="doc-f-provider">
              <option value="">Link to provider (optional)…</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="cc-input" value={draft.experience_id} onChange={(e) => setDraft({ ...draft, experience_id: e.target.value })} data-testid="doc-f-experience">
              <option value="">Link to experience (optional)…</option>
              {experiences.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <textarea className="cc-input md:col-span-2" rows={2} placeholder="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button className="cc-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="cc-btn-primary" onClick={add} data-testid="btn-save-doc">Save</button>
          </div>
        </div>
      )}

      <div className="cc-card p-4 mb-4 flex flex-wrap gap-3">
        <input className="cc-input flex-1 min-w-[220px]" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="cc-input w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {DOCUMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="cc-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {["Title", "Category", "Linked to", "Notes", "Added", ""].map((h) => (
                <th key={h} className="cc-table-header text-left px-5 py-4 border-b" style={{ borderColor: "var(--cc-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const linkedBooking = d.booking_id && bookings.find((b) => b.id === d.booking_id);
              const linkedProvider = d.provider_id && providers.find((p) => p.id === d.provider_id);
              const linkedExperience = d.experience_id && experiences.find((e) => e.id === d.experience_id);
              const linkedLabel = linkedBooking?.guest_name || linkedProvider?.name || linkedExperience?.name || null;
              return (
                <tr key={d.id} className="border-b" style={{ borderColor: "var(--cc-border)" }} data-testid={`doc-row-${d.id}`}>
                  <td className="px-5 py-3">
                    <div className="serif text-lg" style={{ color: "var(--cc-forest)" }}>{d.title}</div>
                    {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1" style={{ color: "var(--cc-olive)" }}>Open <ExternalLink size={11} /></a>}
                  </td>
                  <td className="px-5 py-3 text-xs">{DOC_CAT_LABEL[d.category]}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--cc-muted)" }}>
                    {linkedBooking ? (
                      <Link to={`/bookings/${linkedBooking.id}`} style={{ color: "var(--cc-olive)" }}>{linkedLabel}</Link>
                    ) : (linkedLabel || "—")}
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: "var(--cc-muted)" }}>{d.notes || "—"}</td>
                  <td className="px-5 py-3 text-xs">{formatDate(d.created_at)}</td>
                  <td className="px-5 py-3 text-right"><button className="cc-btn-ghost" onClick={() => del(d)} data-testid={`doc-del-${d.id}`}><Trash2 size={14} /></button></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-sm" style={{ color: "var(--cc-muted)" }}>No documents.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
