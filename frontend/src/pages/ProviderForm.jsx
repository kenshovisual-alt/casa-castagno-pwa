import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader } from "../components/Ui";
import { PROVIDER_TYPES } from "../lib/constants";
import { toast } from "sonner";

const empty = {
  name: "", company: "", role: "", type: "other", phone: "", whatsapp: "", email: "",
  website: "", address: "", location: "", languages: "", price_notes: "",
  availability_notes: "", reliability: 5, internal_notes: "",
};

const Field = ({ label, children }) => (
  <div><label className="cc-label">{label}</label>{children}</div>
);

export default function ProviderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(empty);
  useEffect(() => { if (id) api.get("providers", id).then((d) => setP({ ...empty, ...d })); }, [id]);
  const set = (k, v) => setP((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...p, reliability: Number(p.reliability) };
    if (id) await api.update("providers", id, payload);
    else await api.create("providers", payload);
    toast.success("Saved");
    navigate("/contacts");
  };

  return (
    <form onSubmit={onSubmit} className="px-6 md:px-10 lg:px-14 py-10 max-w-[900px]" data-testid="prov-form">
      <PageHeader overline={id ? "Edit" : "New"} title={id ? "Edit contact" : "New contact"} onClose={() => navigate(-1)} />
      <section className="cc-card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name"><input className="cc-input" value={p.name} onChange={(e) => set("name", e.target.value)} data-testid="prov-f-name" /></Field>
          <Field label="Company"><input className="cc-input" value={p.company} onChange={(e) => set("company", e.target.value)} /></Field>
          <Field label="Role"><input className="cc-input" value={p.role} onChange={(e) => set("role", e.target.value)} /></Field>
          <Field label="Type">
            <select className="cc-input" value={p.type} onChange={(e) => set("type", e.target.value)}>
              {PROVIDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Phone"><input className="cc-input" value={p.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="WhatsApp"><input className="cc-input" value={p.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
          <Field label="Email"><input className="cc-input" type="email" value={p.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Website"><input className="cc-input" value={p.website} onChange={(e) => set("website", e.target.value)} /></Field>
          <Field label="Address"><input className="cc-input" value={p.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <Field label="Location"><input className="cc-input" value={p.location} onChange={(e) => set("location", e.target.value)} /></Field>
          <Field label="Languages"><input className="cc-input" value={p.languages} onChange={(e) => set("languages", e.target.value)} /></Field>
          <Field label="Reliability (1–5)"><input className="cc-input" type="number" min="1" max="5" value={p.reliability} onChange={(e) => set("reliability", e.target.value)} /></Field>
          <Field label="Price notes"><textarea className="cc-input" rows={2} value={p.price_notes} onChange={(e) => set("price_notes", e.target.value)} /></Field>
          <Field label="Availability notes"><textarea className="cc-input" rows={2} value={p.availability_notes} onChange={(e) => set("availability_notes", e.target.value)} /></Field>
          <Field label="Internal notes"><textarea className="cc-input" rows={2} value={p.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} /></Field>
        </div>
      </section>
      <div className="flex justify-end gap-2">
        <button type="button" className="cc-btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        <button type="submit" className="cc-btn-primary" data-testid="btn-save-prov">Save</button>
      </div>
    </form>
  );
}
