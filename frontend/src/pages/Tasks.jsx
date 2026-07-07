import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { PageHeader } from "../components/Ui";
import { TASK_TYPES, formatDate } from "../lib/constants";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const empty = { title: "", type: "other", priority: "medium", due_date: "", status: "open", notes: "" };
const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["open", "in_progress", "done"];

export default function Tasks() {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ status: "all", priority: "all" });
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(empty);
  const load = () => api.list("tasks").then(setItems);
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((t) =>
    (f.status === "all" || t.status === f.status) &&
    (f.priority === "all" || t.priority === f.priority)
  ), [items, f]);

  const add = async () => {
    if (!draft.title) return toast.error("Title required");
    await api.create("tasks", draft);
    setDraft(empty); setShowForm(false); load(); toast.success("Task added");
  };
  const update = async (id, patch) => {
    await api.update("tasks", id, patch); load();
  };
  const del = async (id) => {
    if (!window.confirm("Delete task?")) return;
    await api.remove("tasks", id); load();
  };

  const prioTone = (p) => p === "high" ? "var(--cc-terracotta)" : p === "medium" ? "var(--cc-olive)" : "var(--cc-muted)";

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[1200px]">
      <PageHeader overline="Operations" title="Tasks & notes" action={
        <button className="cc-btn-primary inline-flex items-center gap-2" onClick={() => setShowForm(!showForm)} data-testid="btn-new-task">
          <Plus size={16} /> New task
        </button>
      } />

      {showForm && (
        <div className="cc-card p-5 mb-6" data-testid="task-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="cc-input md:col-span-2" placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} data-testid="task-f-title" />
            <select className="cc-input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select className="cc-input" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" className="cc-input" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} />
            <select className="cc-input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
            <textarea className="cc-input md:col-span-2" rows={2} placeholder="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button className="cc-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="cc-btn-primary" onClick={add} data-testid="btn-save-task">Save</button>
          </div>
        </div>
      )}

      <div className="cc-card p-4 mb-4 flex gap-3">
        <select className="cc-input w-auto" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select className="cc-input w-auto" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((t) => (
          <div key={t.id} className="cc-card p-4 flex items-center gap-4" data-testid={`task-row-${t.id}`}>
            <input type="checkbox" checked={t.status === "done"} onChange={(e) => update(t.id, { status: e.target.checked ? "done" : "open" })} />
            <div className="flex-1">
              <div className="serif text-lg" style={{ color: "var(--cc-forest)", textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.title}</div>
              <div className="text-xs mt-1 flex flex-wrap gap-3" style={{ color: "var(--cc-muted)" }}>
                <span className="uppercase tracking-widest">{t.type}</span>
                <span style={{ color: prioTone(t.priority) }}>● {t.priority}</span>
                {t.due_date && <span>Due {formatDate(t.due_date)}</span>}
                <span>{t.status.replace("_", " ")}</span>
              </div>
              {t.notes && <div className="text-xs mt-1" style={{ color: "var(--cc-muted)" }}>{t.notes}</div>}
            </div>
            <button className="cc-btn-ghost" onClick={() => del(t.id)} data-testid={`task-del-${t.id}`}><Trash2 size={14} /></button>
          </div>
        ))}
        {filtered.length === 0 && <div className="cc-surface p-10 text-center text-sm" style={{ color: "var(--cc-muted)" }}>All calm. No tasks.</div>}
      </div>
    </div>
  );
}
