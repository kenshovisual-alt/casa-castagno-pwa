import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader } from "../components/Ui";
import { EXPERIENCE_CATEGORIES } from "../lib/constants";
import { toast } from "sonner";

const empty = {
  name: "", category: "on_estate", short_description: "", internal_notes: "", guest_notes: "",
  location: "", distance_km: 0, duration: "", best_season: "",
  min_guests: 1, max_guests: 12, cost_owner: 0, price_guest: 0, commission: 0,
  provider_name: "", provider_contact: "", lead_time: "", cancellation_terms: "", status: "active",
};

const Field = ({ label, children }) => (
  <div><label className="cc-label">{label}</label>{children}</div>
);

export default function ExperienceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [e, setE] = useState(empty);

  useEffect(() => { if (id) api.get("experiences", id).then((d) => setE({ ...empty, ...d })); }, [id]);
  const set = (k, v) => setE((p) => ({ ...p, [k]: v }));

  const margin = Number(e.price_guest || 0) - Number(e.cost_owner || 0);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const payload = { ...e, distance_km: Number(e.distance_km), min_guests: Number(e.min_guests),
      max_guests: Number(e.max_guests), cost_owner: Number(e.cost_owner), price_guest: Number(e.price_guest),
      commission: Number(e.commission) };
    if (id) await api.update("experiences", id, payload);
    else await api.create("experiences", payload);
    toast.success("Saved");
    navigate("/experiences");
  };

  return (
    <form onSubmit={onSubmit} className="px-6 md:px-10 lg:px-14 py-10 max-w-[900px]" data-testid="exp-form">
      <PageHeader overline={id ? "Edit" : "New"} title={id ? "Edit experience" : "New experience"} />
      <section className="cc-card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name"><input className="cc-input" value={e.name} onChange={(ev) => set("name", ev.target.value)} data-testid="exp-f-name" /></Field>
          <Field label="Category">
            <select className="cc-input" value={e.category} onChange={(ev) => set("category", ev.target.value)}>
              {EXPERIENCE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Short description"><textarea className="cc-input" rows={2} value={e.short_description} onChange={(ev) => set("short_description", ev.target.value)} /></Field>
          <Field label="Guest-facing notes"><textarea className="cc-input" rows={2} value={e.guest_notes} onChange={(ev) => set("guest_notes", ev.target.value)} /></Field>
          <Field label="Internal notes"><textarea className="cc-input" rows={2} value={e.internal_notes} onChange={(ev) => set("internal_notes", ev.target.value)} /></Field>
          <Field label="Location"><input className="cc-input" value={e.location} onChange={(ev) => set("location", ev.target.value)} /></Field>
          <Field label="Distance (km)"><input className="cc-input" type="number" value={e.distance_km} onChange={(ev) => set("distance_km", ev.target.value)} /></Field>
          <Field label="Duration"><input className="cc-input" value={e.duration} onChange={(ev) => set("duration", ev.target.value)} /></Field>
          <Field label="Best season"><input className="cc-input" value={e.best_season} onChange={(ev) => set("best_season", ev.target.value)} /></Field>
          <Field label="Min guests"><input className="cc-input" type="number" value={e.min_guests} onChange={(ev) => set("min_guests", ev.target.value)} /></Field>
          <Field label="Max guests"><input className="cc-input" type="number" value={e.max_guests} onChange={(ev) => set("max_guests", ev.target.value)} /></Field>
          <Field label="Cost to owner"><input className="cc-input" type="number" value={e.cost_owner} onChange={(ev) => set("cost_owner", ev.target.value)} /></Field>
          <Field label="Price to guest"><input className="cc-input" type="number" value={e.price_guest} onChange={(ev) => set("price_guest", ev.target.value)} /></Field>
          <Field label="Provider name"><input className="cc-input" value={e.provider_name} onChange={(ev) => set("provider_name", ev.target.value)} /></Field>
          <Field label="Provider contact"><input className="cc-input" value={e.provider_contact} onChange={(ev) => set("provider_contact", ev.target.value)} /></Field>
          <Field label="Booking lead time"><input className="cc-input" value={e.lead_time} onChange={(ev) => set("lead_time", ev.target.value)} /></Field>
          <Field label="Cancellation terms"><input className="cc-input" value={e.cancellation_terms} onChange={(ev) => set("cancellation_terms", ev.target.value)} /></Field>
          <Field label="Status">
            <select className="cc-input" value={e.status} onChange={(ev) => set("status", ev.target.value)}>
              {["active", "draft", "needs_confirmation", "paused"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-3 text-sm" style={{ color: "var(--cc-muted)" }}>Margin: <strong style={{ color: "var(--cc-forest)" }}>€{margin}</strong></div>
      </section>
      <div className="flex justify-end gap-2">
        <button type="button" className="cc-btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        <button type="submit" className="cc-btn-primary" data-testid="btn-save-exp">Save</button>
      </div>
    </form>
  );
}
