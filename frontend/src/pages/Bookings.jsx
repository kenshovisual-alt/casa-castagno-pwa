import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader, SourceBadge, StatusBadge } from "../components/Ui";
import { SOURCES, STATUSES, formatMoney, formatDate, nightsBetween } from "../lib/constants";
import { Plus, Search } from "lucide-react";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("all");
  const [status, setStatus] = useState("all");

  const load = () => api.list("bookings").then(setBookings);
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (src !== "all" && b.source !== src) return false;
      if (status !== "all" && b.status !== status) return false;
      if (q && !`${b.guest_name} ${b.country} ${b.guest_email}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }).sort((a, b) => (a.checkin || "").localeCompare(b.checkin || ""));
  }, [bookings, q, src, status]);

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[1400px]">
      <PageHeader
        overline="Reservations"
        title="Bookings"
        action={
          <Link to="/bookings/new" className="cc-btn-primary inline-flex items-center gap-2" data-testid="btn-new-booking">
            <Plus size={16} /> New booking
          </Link>
        }
      />

      <div className="cc-card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search size={16} style={{ color: "var(--cc-muted)" }} />
          <input
            className="cc-input"
            placeholder="Search guest, country, email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="bookings-search"
          />
        </div>
        <select className="cc-input w-auto" value={src} onChange={(e) => setSrc(e.target.value)} data-testid="bookings-filter-source">
          <option value="all">All sources</option>
          {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="cc-input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="bookings-filter-status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="cc-card overflow-x-auto">
        <table className="w-full" data-testid="bookings-table">
          <thead>
            <tr>
              {["Guest", "Dates", "Nights", "Guests", "Source", "Status", "Gross", ""].map((h) => (
                <th key={h} className="cc-table-header text-left px-5 py-4 border-b" style={{ borderColor: "var(--cc-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-b hover:bg-[color:var(--cc-bg)]" style={{ borderColor: "var(--cc-border)" }} data-testid={`booking-row-${b.id}`}>
                <td className="px-5 py-4">
                  <Link to={`/bookings/${b.id}`} className="serif text-lg" style={{ color: "var(--cc-forest)" }}>
                    {b.guest_name || "Blocked"}
                  </Link>
                  <div className="text-xs" style={{ color: "var(--cc-muted)" }}>{b.country}</div>
                </td>
                <td className="px-5 py-4 text-sm">{formatDate(b.checkin)} → {formatDate(b.checkout)}</td>
                <td className="px-5 py-4 text-sm">{nightsBetween(b.checkin, b.checkout)}</td>
                <td className="px-5 py-4 text-sm">{b.adults + b.children}</td>
                <td className="px-5 py-4"><SourceBadge source={b.source} /></td>
                <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                <td className="px-5 py-4 text-sm">{formatMoney(b.gross_amount, b.currency)}</td>
                <td className="px-5 py-4 text-right">
                  <Link to={`/bookings/${b.id}`} className="text-xs" style={{ color: "var(--cc-olive)" }}>Open →</Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-10 text-center text-sm" style={{ color: "var(--cc-muted)" }}>No bookings match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
