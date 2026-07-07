import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PageHeader } from "../components/Ui";
import { toast } from "sonner";
import { Save, RefreshCw } from "lucide-react";

const Field = ({ label, children }) => (
  <div><label className="cc-label">{label}</label>{children}</div>
);

export default function Settings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.singleton("settings").then(setS); }, []);

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
    if (!window.confirm("This will replace all bookings, experiences, providers, tasks and documents with sample data. Continue?")) return;
    await api.seed();
    toast.success("Sample data reloaded");
  };

  if (!s) return <div className="p-8">Loading…</div>;

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[900px]">
      <PageHeader overline="Configuration" title="Settings" action={
        <div className="flex gap-2">
          <button className="cc-btn-ghost inline-flex items-center gap-2" onClick={reseed} data-testid="btn-reseed"><RefreshCw size={14} /> Reload sample data</button>
          <button className="cc-btn-primary inline-flex items-center gap-2" onClick={save} disabled={saving} data-testid="btn-save-settings"><Save size={16} /> Save</button>
        </div>
      } />

      <section className="cc-card p-6 mb-6">
        <div className="overline mb-4">Defaults</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Default agency commission %"><input className="cc-input" type="number" value={s.default_commission} onChange={(e) => set("default_commission", e.target.value)} data-testid="set-commission" /></Field>
          <Field label="Agency name"><input className="cc-input" value={s.agency_name} onChange={(e) => set("agency_name", e.target.value)} /></Field>
          <Field label="Default currency"><input className="cc-input" value={s.currency} onChange={(e) => set("currency", e.target.value)} /></Field>
          <Field label="Property capacity"><input className="cc-input" type="number" value={s.property_capacity} onChange={(e) => set("property_capacity", e.target.value)} /></Field>
          <Field label="Default check-in time"><input className="cc-input" value={s.default_checkin_time} onChange={(e) => set("default_checkin_time", e.target.value)} /></Field>
          <Field label="Default check-out time"><input className="cc-input" value={s.default_checkout_time} onChange={(e) => set("default_checkout_time", e.target.value)} /></Field>
        </div>
      </section>

      <section className="cc-card p-6">
        <div className="overline mb-4">Owner access</div>
        <p className="text-sm" style={{ color: "var(--cc-muted)" }}>
          Owner mode is enabled by default in this prototype. Login and multi-user permissions can be added later.
        </p>
      </section>
    </div>
  );
}
