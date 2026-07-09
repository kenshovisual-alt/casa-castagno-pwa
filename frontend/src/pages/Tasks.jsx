import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { deleteWithUndo } from "../lib/deleteWithUndo";
import { PageHeader } from "../components/Ui";
import { TASK_TYPES, formatDate } from "../lib/constants";
import { Plus, Trash2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";

const empty = { title: "", type: "other", priority: "medium", due_date: "", status: "open", notes: "", booking_id: "", provider_id: "", experience_id: "" };
const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["open", "in_progress", "done"];

const isOverdue = (t) => t.due_date && t.status !== "done" && t.due_date < new Date().toISOString().slice(0, 10);

export default function Tasks() {
  const [items, setItems] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [f, setF] = useState({ status: "all", priority: "all" });
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(empty);
  const load = () => api.list("tasks").then(setItems);
  useEffect(() => { load(); api.list("bookings").then(setBookings); }, []);

  const filtered = useMemo(() => items.filter((t) =>
    (f.status === "all" || t.status === f.status) &&
    (f.priority === "all" || t.priority === f.priority)
  ).sort((a, b) => {
    const overdueDiff = Number(isOverdue(b)) - Number(isOverdue(a));
    if (overdueDiff !== 0) return overdueDiff;
    return (a.due_date || "").localeCompare(b.due_date || "");
  }), [items, f]);

  const add = async () => {
    if (!draft.title) return toast.error("Title required");
    await api.create("tasks", draft);
    setDraft(empty); setShowForm(false); load(); toast.success("Task added");
  };
  const update = async (id, patch) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))); // optimistic
    try {
      await api.update("tasks", id, patch);
    } catch {
      toast.error("Could not update task");
      load();
    }
  };
  const del = (task) => {
    setItems((prev) => prev.filter((t) => t.id !== task.id));
    deleteWithUndo({ resource: "tasks", record: task, label: "Task", onSettled: load });
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
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Cancel"
              data-testid="btn-cancel-top-task"
              className="flex items-center justify-center w-9 h-9 rounded-full border transition-colors"
              style={{ borderColor: "var(--cc-border)", color: "var(--cc-forest)" }}
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
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
            <select className="cc-input md:col-span-2" value={draft.booking_id} onChange={(e) => setDraft({ ...draft, booking_id: e.target.value })} data-testid="task-f-booking">
              <option value="">Link to booking (optional)…</option>
              {bookings.map((b) => <option key={b.id} value={b.id}>{b.guest_name || "Blocked"} · {b.checkin}</option>)}
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
        {filtered.map((t) => {
          const overdue = isOverdue(t);
          const linkedBooking = t.booking_id && bookings.find((b) => b.id === t.booking_id);
          return (
            <div
              key={t.id}
              className="cc-card p-4 flex items-center gap-4"
              style={overdue ? { borderColor: "var(--cc-terracotta)" } : undefined}
              data-testid={`task-row-${t.id}`}
            >
              <input type="checkbox" checked={t.status === "done"} onChange={(e) => update(t.id, { status: e.target.checked ? "done" : "open" })} />
              <div className="flex-1">
                <div className="serif text-lg" style={{ color: "var(--cc-forest)", textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.title}</div>
                <div className="text-xs mt-1 flex flex-wrap gap-3 items-center" style={{ color: "var(--cc-muted)" }}>
                  <span className="uppercase tracking-widest">{t.type}</span>
                  <span style={{ color: prioTone(t.priority) }}>● {t.priority}</span>
                  {t.due_date && (
                    <span
                      className="inline-flex items-center gap-1"
                      style={overdue ? { color: "var(--cc-terracotta)", fontWeight: 600 } : undefined}
                      data-testid={overdue ? `task-overdue-${t.id}` : undefined}
                    >
                      {overdue && <AlertCircle size={12} />}
                      {overdue ? "Overdue" : "Due"} {formatDate(t.due_date)}
                    </span>
                  )}
                  <span>{t.status.replace("_", " ")}</span>
                  {linkedBooking && (
                    <Link to={`/bookings/${linkedBooking.id}`} style={{ color: "var(--cc-olive)" }}>{linkedBooking.guest_name || "Blocked"}</Link>
                  )}
                </div>
                {t.notes && <div className="text-xs mt-1" style={{ color: "var(--cc-muted)" }}>{t.notes}</div>}
              </div>
              <button className="cc-btn-ghost" onClick={() => del(t)} data-testid={`task-del-${t.id}`}><Trash2 size={14} /></button>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="cc-surface p-10 text-center text-sm" style={{ color: "var(--cc-muted)" }}>All calm. No tasks.</div>}
      </div>
    </div>
  );
}
