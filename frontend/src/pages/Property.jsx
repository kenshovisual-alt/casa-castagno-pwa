import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PageHeader } from "../components/Ui";
import { toast } from "sonner";
import { Save } from "lucide-react";

const FIELDS = [
  ["house_notes", "House notes"],
  ["bedroom_notes", "Bedroom notes"],
  ["cleaning_notes", "Cleaning notes"],
  ["maintenance_notes", "Maintenance notes"],
  ["checkin_instructions", "Check-in instructions"],
  ["checkout_instructions", "Check-out instructions"],
  ["emergency_notes", "Emergency notes"],
  ["wifi_info", "WiFi info"],
  ["house_rules", "House rules"],
  ["owner_notes", "Owner notes"],
];

const FACTS = [
  "Private Tuscan estate", "Full-property rental only", "Up to 12 guests",
  "3 houses · 6 bedrooms", "Pool · Gardens · Olive groves",
  "Woodland · Nature reserve context", "Private chef on request",
  "Curated experiences on request",
];

export default function Property() {
  const [p, setP] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.singleton("property").then(setP); }, []);
  const set = (k, v) => setP((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    await api.updateSingleton("property", p);
    toast.success("Property info saved");
    setSaving(false);
  };

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[1100px]">
      <PageHeader overline="The estate" title="Casa Castagno" action={
        <button className="cc-btn-primary inline-flex items-center gap-2" onClick={save} disabled={saving} data-testid="btn-save-property">
          <Save size={16} /> {saving ? "Saving…" : "Save"}
        </button>
      }>
        <p className="mt-2 text-base" style={{ color: "var(--cc-muted)" }}>
          Between Arezzo and Anghiari · Tuscany
        </p>
      </PageHeader>

      <section className="cc-card p-6 mb-6">
        <div className="cc-overline mb-3">At a glance</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FACTS.map((f) => (
            <div key={f} className="p-3 rounded-md text-sm border" style={{ borderColor: "var(--cc-border)", background: "var(--cc-bg)", color: "var(--cc-forest)" }}>{f}</div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(([k, label]) => (
          <div key={k} className="cc-card p-5">
            <label className="cc-label">{label}</label>
            <textarea
              className="cc-input"
              rows={5}
              value={p[k] || ""}
              onChange={(e) => set(k, e.target.value)}
              data-testid={`prop-f-${k}`}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
