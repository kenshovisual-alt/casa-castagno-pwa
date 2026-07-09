import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader, SourceBadge, StatusBadge, PageSkeleton } from "../components/Ui";
import { CHECKLIST_ITEMS, formatDate, formatMoney, computeFinance, nightsBetween } from "../lib/constants";
import { toast } from "sonner";
import { Pencil, Trash2, FileText, Download, RefreshCw, Plus, X } from "lucide-react";

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
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [addingExperience, setAddingExperience] = useState(false);

  useEffect(() => {
    api.get("bookings", id).then(setB);
    api.list("experiences").then(setExperiences);
    api.list("tasks").then((all) => setTasks(all.filter((t) => t.booking_id === id)));
    api.list("documents").then((all) => setDocuments(all.filter((d) => d.booking_id === id)));
    api.getInvoice(id).then(setInvoice).catch(() => setInvoice(null));
  }, [id]);

  const onGenerateInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const doc = await api.generateInvoice(id);
      setInvoice(doc);
      toast.success(invoice ? "Invoice regenerated" : "Invoice generated");
    } catch {
      toast.error("Could not generate invoice");
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (!b) return <PageSkeleton cards={3} />;

  const fin = computeFinance(b);
  const nights = nightsBetween(b.checkin, b.checkout);

  const toggleChecklist = async (k) => {
    const prev = b;
    const checklist = { ...(b.checklist || {}), [k]: !(b.checklist?.[k]) };
    setB((p) => ({ ...p, checklist })); // optimistic
    try {
      const updated = await api.update("bookings", b.id, { checklist });
      setB(updated);
    } catch {
      setB(prev);
      toast.error("Could not update checklist");
    }
  };

  const linkExperience = async (experienceId) => {
    if (!experienceId || (b.experience_ids || []).includes(experienceId)) {
      setAddingExperience(false);
      return;
    }
    const experience_ids = [...(b.experience_ids || []), experienceId];
    try {
      const updated = await api.update("bookings", b.id, { experience_ids });
      setB(updated);
      toast.success("Experience linked");
    } catch {
      toast.error("Could not link experience");
    } finally {
      setAddingExperience(false);
    }
  };

  const unlinkExperience = async (experienceId) => {
    const experience_ids = (b.experience_ids || []).filter((eid) => eid !== experienceId);
    try {
      const updated = await api.update("bookings", b.id, { experience_ids });
      setB(updated);
      toast.success("Experience unlinked");
    } catch {
      toast.error("Could not unlink experience");
    }
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
            <div className="cc-overline mb-3">Stay</div>
            <Row label="Check-in" value={`${formatDate(b.checkin)} · ${b.arrival_time || "—"}`} />
            <Row label="Check-out" value={`${formatDate(b.checkout)} · ${b.departure_time || "—"}`} />
            <Row label="Nights" value={nights} />
            <Row label="Guests" value={`${b.adults} adults · ${b.children} children`} />
            <Row label="Country" value={b.country} />
            <Row label="Email" value={b.guest_email} />
            <Row label="Phone" value={b.guest_phone} />
          </section>

          <section className="cc-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="cc-overline">Finance</div>
              <div className="flex items-center gap-2">
                {invoice ? (
                  <>
                    <a
                      href={api.fileUrl(invoice.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="cc-btn-ghost inline-flex items-center gap-2 text-xs"
                      data-testid="btn-download-invoice"
                    >
                      <Download size={13} /> Download invoice
                    </a>
                    <button
                      onClick={onGenerateInvoice}
                      disabled={invoiceLoading}
                      className="cc-btn-ghost inline-flex items-center gap-2 text-xs"
                      data-testid="btn-regenerate-invoice"
                      title="Regenerate invoice"
                    >
                      <RefreshCw size={13} className={invoiceLoading ? "animate-spin" : ""} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onGenerateInvoice}
                    disabled={invoiceLoading}
                    className="cc-btn-ghost inline-flex items-center gap-2 text-xs"
                    data-testid="btn-generate-invoice"
                  >
                    <FileText size={13} /> {invoiceLoading ? "Generating…" : "Generate invoice"}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div><div className="cc-overline">Gross</div><div className="serif text-2xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(b.gross_amount, b.currency)}</div></div>
              <div><div className="cc-overline">Commission</div><div className="serif text-2xl" style={{ color: "var(--cc-terracotta)" }}>{formatMoney(fin.commission, b.currency)}</div></div>
              <div><div className="cc-overline">Net owner</div><div className="serif text-2xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(fin.net, b.currency)}</div></div>
              <div><div className="cc-overline">Balance due</div><div className="serif text-2xl" style={{ color: "var(--cc-forest)" }}>{formatMoney(fin.balance, b.currency)}</div></div>
            </div>
            <Row label="Deposit" value={`${formatMoney(b.deposit_amount, b.currency)} · ${b.deposit_paid ? "paid" : "not paid"}`} />
            <Row label="Cleaning fee" value={formatMoney(b.cleaning_fee, b.currency)} />
            <Row label="Extras revenue" value={formatMoney(b.extras_revenue, b.currency)} />
            <Row label="Experience revenue" value={formatMoney(b.experience_revenue, b.currency)} />
            <Row label="Balance paid" value={b.balance_paid ? "yes" : "no"} />
          </section>

          <section className="cc-card p-6">
            <div className="cc-overline mb-3">Requests & notes</div>
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
            <div className="cc-overline mb-3">Operational checklist</div>
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
            <div className="flex items-center justify-between mb-3">
              <div className="cc-overline">Linked experiences</div>
              {!addingExperience && (
                <button
                  className="cc-btn-ghost inline-flex items-center gap-1 text-xs"
                  onClick={() => setAddingExperience(true)}
                  data-testid="btn-add-experience-link"
                >
                  <Plus size={13} /> Add
                </button>
              )}
            </div>
            {addingExperience && (
              <select
                className="cc-input mb-3"
                autoFocus
                defaultValue=""
                onChange={(e) => linkExperience(e.target.value)}
                onBlur={() => setAddingExperience(false)}
                data-testid="select-link-experience"
              >
                <option value="">Select an experience…</option>
                {experiences
                  .filter((e) => !(b.experience_ids || []).includes(e.id))
                  .map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
            {(b.experience_ids || []).length === 0 ? (
              <p className="text-sm" style={{ color: "var(--cc-muted)" }}>No experiences linked.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(b.experience_ids || []).map((eid) => {
                  const e = experiences.find((x) => x.id === eid);
                  return (
                    <li key={eid} className="flex items-center justify-between gap-2 py-1">
                      <span>{e?.name || eid}</span>
                      <button
                        className="cc-btn-ghost p-1"
                        onClick={() => unlinkExperience(eid)}
                        data-testid={`unlink-experience-${eid}`}
                        title="Unlink experience"
                      >
                        <X size={13} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="cc-card p-6">
            <div className="cc-overline mb-3">Linked tasks</div>
            {tasks.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--cc-muted)" }}>No tasks linked to this booking.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span style={{ textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.title}</span>
                    <span className="text-xs" style={{ color: "var(--cc-muted)" }}>{t.status.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="cc-card p-6">
            <div className="cc-overline mb-3">Linked documents</div>
            {documents.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--cc-muted)" }}>No documents linked to this booking.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    {d.file_url ? (
                      <a href={d.file_url} target="_blank" rel="noreferrer" style={{ color: "var(--cc-olive)" }}>{d.title}</a>
                    ) : (
                      <span>{d.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
