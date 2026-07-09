import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { deleteWithUndo } from "../lib/deleteWithUndo";
import { PageHeader, ThemeToggle, PageSkeleton } from "../components/Ui";
import { toast } from "sonner";
import { Save, RefreshCw, Plus, Pencil, Trash2, Download } from "lucide-react";

const Field = ({ label, children }) => (
  <div><label className="cc-label">{label}</label>{children}</div>
);

const emptyAgency = { name: "", commission_pct: 25, contact_name: "", contact_email: "", contact_phone: "", website: "", notes: "" };

function AgencyForm({ value, onChange, onSave, onCancel, saving }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="cc-card p-5 mb-3" style={{ background: "var(--cc-bg)" }} data-testid="agency-form">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Agency name"><input className="cc-input" value={value.name} onChange={(e) => set("name", e.target.value)} data-testid="agency-name" /></Field>
        <Field label="Commission %"><input className="cc-input" type="number" value={value.commission_pct} onChange={(e) => set("commission_pct", e.target.value)} data-testid="agency-commission" /></Field>
        <Field label="Contact name"><input className="cc-input" value={value.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></Field>
        <Field label="Contact email"><input className="cc-input" type="email" value={value.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></Field>
        <Field label="Contact phone"><input className="cc-input" value={value.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} /></Field>
        <Field label="Website"><input className="cc-input" value={value.website} onChange={(e) => set("website", e.target.value)} /></Field>
        <div className="md:col-span-2"><Field label="Notes"><textarea className="cc-input" rows={2} value={value.notes} onChange={(e) => set("notes", e.target.value)} /></Field></div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="cc-btn-ghost" onClick={onCancel} data-testid="agency-cancel">Cancel</button>
        <button className="cc-btn-primary" onClick={onSave} disabled={saving} data-testid="agency-save">{saving ? "Saving…" : "Save agency"}</button>
      </div>
    </div>
  );
}

export default function Settings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [agencies, setAgencies] = useState([]);
  const [editingId, setEditingId] = useState(null); // agency.id being edited, or "new"
  const [draft, setDraft] = useState(emptyAgency);
  const [agencySaving, setAgencySaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadAgencies = () => api.list("agencies").then(setAgencies);

  useEffect(() => {
    api.singleton("settings").then(setS);
    loadAgencies();
  }, []);

  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    await api.updateSingleton("settings", { ...s,
      default_commission: Number(s.default_commission),
      property_capacity: Number(s.property_capacity) });
    toast.success("Settings saved");
    setSaving(false);
  };

  const reseed = async () => {
    if (!window.confirm("This will replace all bookings, experiences, providers, tasks, documents and agencies with sample data. Continue?")) return;
    await api.seed();
    toast.success("Sample data reloaded");
    loadAgencies();
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await api.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `casa-castagno-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const startNewAgency = () => { setDraft(emptyAgency); setEditingId("new"); };
  const startEditAgency = (a) => { setDraft(a); setEditingId(a.id); };
  const cancelAgency = () => { setEditingId(null); setDraft(emptyAgency); };

  const saveAgency = async () => {
    setAgencySaving(true);
    try {
      const payload = { ...draft, commission_pct: Number(draft.commission_pct) };
      if (editingId === "new") {
        await api.create("agencies", payload);
        toast.success("Agency added");
      } else {
        await api.update("agencies", editingId, payload);
        toast.success("Agency updated");
      }
      setEditingId(null);
      setDraft(emptyAgency);
      loadAgencies();
    } catch {
      toast.error("Could not save agency");
    } finally {
      setAgencySaving(false);
    }
  };

  const deleteAgency = (agency) => {
    setAgencies((prev) => prev.filter((a) => a.id !== agency.id));
    deleteWithUndo({ resource: "agencies", record: agency, label: "Agency", onSettled: loadAgencies });
  };

  if (!s) return <PageSkeleton cards={3} />;

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[900px]">
      <PageHeader overline="Configuration" title="Settings" action={
        <button className="cc-btn-primary inline-flex items-center gap-2" onClick={save} disabled={saving} data-testid="btn-save-settings"><Save size={16} /> Save</button>
      } />

      <section className="cc-card p-6 mb-6">
        <div className="cc-overline mb-4">Owner account</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Owner name"><input className="cc-input" value={s.owner_name} onChange={(e) => set("owner_name", e.target.value)} /></Field>
          <Field label="Owner email"><input className="cc-input" type="email" value={s.owner_email} onChange={(e) => set("owner_email", e.target.value)} /></Field>
          <Field label="Owner phone"><input className="cc-input" value={s.owner_phone} onChange={(e) => set("owner_phone", e.target.value)} /></Field>
        </div>
        <p className="text-xs mt-4" style={{ color: "var(--cc-muted)" }}>
          Owner mode is enabled by default in this prototype. Login and multi-user permissions can be added later.
        </p>
      </section>

      <section className="cc-card p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="cc-overline">Appearance</div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <div className="text-sm" style={{ color: "var(--cc-forest)" }}>Theme</div>
            <p className="text-xs mt-1" style={{ color: "var(--cc-muted)" }}>
              Switch between light and dark mode. Your choice is remembered on this device.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section className="cc-card p-6 mb-6">
        <div className="cc-overline mb-4">Regional</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Language">
            <select className="cc-input" value={s.language} onChange={(e) => set("language", e.target.value)} data-testid="set-language">
              <option value="en">English</option>
              <option value="it">Italiano</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </Field>
          <Field label="Date format">
            <select className="cc-input" value={s.date_format} onChange={(e) => set("date_format", e.target.value)} data-testid="set-date-format">
              <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="cc-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="cc-overline">Agencies</div>
          {editingId === null && (
            <button className="cc-btn-ghost inline-flex items-center gap-2 text-xs" onClick={startNewAgency} data-testid="btn-add-agency">
              <Plus size={14} /> Add agency
            </button>
          )}
        </div>

        {editingId === "new" && (
          <AgencyForm value={draft} onChange={setDraft} onSave={saveAgency} onCancel={cancelAgency} saving={agencySaving} />
        )}

        {agencies.length === 0 && editingId !== "new" && (
          <p className="text-sm" style={{ color: "var(--cc-muted)" }}>No agencies yet. Add one to track bookings from external booking partners.</p>
        )}

        <div className="space-y-3">
          {agencies.map((a) => (
            editingId === a.id ? (
              <AgencyForm key={a.id} value={draft} onChange={setDraft} onSave={saveAgency} onCancel={cancelAgency} saving={agencySaving} />
            ) : (
              <div key={a.id} className="flex items-center justify-between p-4 rounded-md" style={{ background: "var(--cc-bg)" }} data-testid={`agency-row-${a.id}`}>
                <div>
                  <div className="serif text-lg" style={{ color: "var(--cc-forest)" }}>{a.name}</div>
                  <div className="text-xs" style={{ color: "var(--cc-muted)" }}>
                    {a.commission_pct}% commission{a.contact_name ? ` · ${a.contact_name}` : ""}{a.contact_email ? ` · ${a.contact_email}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="cc-btn-ghost" onClick={() => startEditAgency(a)} data-testid={`agency-edit-${a.id}`}><Pencil size={14} /></button>
                  <button className="cc-btn-ghost" onClick={() => deleteAgency(a)} data-testid={`agency-delete-${a.id}`}><Trash2 size={14} /></button>
                </div>
              </div>
            )
          ))}
        </div>
      </section>

      <section className="cc-card p-6">
        <div className="cc-overline mb-4">Data</div>
        <div className="flex flex-wrap gap-2">
          <button className="cc-btn-ghost inline-flex items-center gap-2" onClick={exportData} disabled={exporting} data-testid="btn-export-data">
            <Download size={14} /> {exporting ? "Preparing…" : "Backup / export all data"}
          </button>
          <button className="cc-btn-ghost inline-flex items-center gap-2" onClick={reseed} data-testid="btn-reseed">
            <RefreshCw size={14} /> Reload sample data
          </button>
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--cc-muted)" }}>
          Backup downloads every booking, experience, provider, document, task and agency as a single JSON file.
        </p>
      </section>
    </div>
  );
}
