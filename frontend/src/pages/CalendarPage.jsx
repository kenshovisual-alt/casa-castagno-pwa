import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader } from "../components/Ui";
import { SOURCE_MAP, SOURCES, formatMoney } from "../lib/constants";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoDay(d) { return d ? d.toISOString().slice(0, 10) : ""; }

export default function CalendarPage() {
  const [bookings, setBookings] = useState([]);
  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const [filterSource, setFilterSource] = useState("all");

  useEffect(() => { api.list("bookings").then(setBookings); }, []);

  const filtered = useMemo(
    () => bookings.filter((b) => filterSource === "all" || b.source === filterSource),
    [bookings, filterSource]
  );

  const cells = monthMatrix(cursor.y, cursor.m);
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const bookingsOnDay = (d) => {
    if (!d) return [];
    const iso = isoDay(d);
    return filtered.filter((b) => b.checkin && b.checkout && iso >= b.checkin && iso < b.checkout);
  };

  const prev = () => setCursor((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: c.m === 0 ? 11 : c.m - 1 }));
  const next = () => setCursor((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: c.m === 11 ? 0 : c.m + 1 }));
  const today = () => { const t = new Date(); setCursor({ y: t.getFullYear(), m: t.getMonth() }); };

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[1400px]">
      <PageHeader
        overline="Availability"
        title="Calendar"
        action={
          <Link to="/bookings/new" className="cc-btn-primary inline-flex items-center gap-2" data-testid="cal-add-booking">
            <Plus size={16} /> Add booking
          </Link>
        }
      />

      <div className="cc-card p-5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="cc-btn-ghost" onClick={prev} data-testid="cal-prev"><ChevronLeft size={16} /></button>
          <button className="cc-btn-ghost" onClick={today} data-testid="cal-today">Today</button>
          <button className="cc-btn-ghost" onClick={next} data-testid="cal-next"><ChevronRight size={16} /></button>
          <div className="serif text-2xl ml-3" style={{ color: "var(--cc-forest)" }}>{monthLabel}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="overline">Filter</span>
          <select
            className="cc-input w-auto"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            data-testid="cal-filter-source"
          >
            <option value="all">All sources</option>
            {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="cc-card p-3">
        <div className="grid grid-cols-7 gap-2 text-center overline pb-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((d, i) => {
            const items = bookingsOnDay(d);
            return (
              <div
                key={i}
                className="min-h-[110px] rounded-md p-2 border"
                style={{ background: d ? "var(--cc-bg)" : "transparent", borderColor: "var(--cc-border)" }}
                data-testid={d ? `cal-cell-${isoDay(d)}` : undefined}
              >
                {d && (
                  <>
                    <div className="text-xs mb-1 font-medium" style={{ color: "var(--cc-muted)" }}>
                      {d.getDate()}
                    </div>
                    <div className="space-y-1">
                      {items.slice(0, 2).map((b) => {
                        const s = SOURCE_MAP[b.source] || SOURCE_MAP.direct;
                        return (
                          <Link
                            key={b.id}
                            to={`/bookings/${b.id}`}
                            className="block text-[10px] leading-tight rounded px-1.5 py-1 truncate"
                            style={{ background: s.color, color: "#F5F1E8" }}
                            title={`${b.guest_name} · ${b.adults + b.children} guests · ${formatMoney(b.gross_amount)}`}
                            data-testid={`cal-booking-${b.id}`}
                          >
                            {b.guest_name || "Blocked"}
                          </Link>
                        );
                      })}
                      {items.length > 2 && (
                        <div className="text-[10px]" style={{ color: "var(--cc-muted)" }}>+{items.length - 2} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-4">
        {SOURCES.map((s) => (
          <span key={s.value} className="flex items-center gap-2 text-xs" style={{ color: "var(--cc-forest)" }}>
            <span className="w-3 h-3 rounded" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
