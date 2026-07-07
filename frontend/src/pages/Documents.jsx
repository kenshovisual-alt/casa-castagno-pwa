import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { PageHeader } from "../components/Ui";
import { DOCUMENT_CATEGORIES, DOC_CAT_LABEL, formatDate } from "../lib/constants";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const empty = { title: "", category: "other", file_url: "", notes: "", booking_id: "", provider_id: "", experience_id: "" };

export default function Documents() {
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(empty);
  const load = () => api.list("documents").then(setItems);
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((d) =>
    (cat === "all" || d.category === cat) &&
    (!q || `${d.title} ${d.notes}`.toLowerCase().includes(q.toLowerCase()))
  ), [items, cat, q]);

  const add = async () => {
    if (!draft.title) return toast.error("Title required");
    await api.create("documents", draft);
    setDraft(empty); setShowForm(false); load(); toast.success("Document added");
  };
  const del = async (id) => {
    if (!window.confirm("Delete?")) return;
    await api.remove("documents", id); load();
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="cc-input" placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} data-testid="doc-f-title" />
            <select className="cc-input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {DOCUMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input className="cc-input md:col-span-2" placeholder="File URL / link" value={draft.file_url} onChange={(e) => setDraft({ ...draft, file_url: e.target.value })} />
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
              {["Title", "Category", "Notes", "Added", ""].map((h) => (
                <th key={h} className="cc-table-header text-left px-5 py-4 border-b" style={{ borderColor: "var(--cc-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b" style={{ borderColor: "var(--cc-border)" }} data-testid={`doc-row-${d.id}`}>
                <td className="px-5 py-3">
                  <div className="serif text-lg" style={{ color: "var(--cc-forest)" }}>{d.title}</div>
                  {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1" style={{ color: "var(--cc-olive)" }}>Open <ExternalLink size={11} /></a>}
                </td>
                <td className="px-5 py-3 text-xs">{DOC_CAT_LABEL[d.category]}</td>
                <td className="px-5 py-3 text-sm" style={{ color: "var(--cc-muted)" }}>{d.notes || "—"}</td>
                <td className="px-5 py-3 text-xs">{formatDate(d.created_at)}</td>
                <td className="px-5 py-3 text-right"><button className="cc-btn-ghost" onClick={() => del(d.id)} data-testid={`doc-del-${d.id}`}><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-sm" style={{ color: "var(--cc-muted)" }}>No documents.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
