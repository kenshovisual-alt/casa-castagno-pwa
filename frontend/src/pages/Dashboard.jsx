import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader, SourceBadge } from "../components/Ui";
import { formatMoney, formatDate, SOURCE_MAP } from "../lib/constants";
import {
  Coins, TrendingUp, CalendarClock, ArrowDown, ArrowUp, Percent,
  Sparkles, Users, FileText, Plus, StickyNote, AlertCircle
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const Card = ({ icon: Icon, label, value, sub, testId, tone = "olive" }) => {
  const color = tone === "terracotta" ? "var(--cc-terracotta)" : "var(--cc-olive)";
  return (
    <div className="cc-card p-5" data-testid={testId}>
      <div className="flex items-center justify-between mb-3">
        <span className="overline">{label}</span>
        {Icon && <Icon size={16} strokeWidth={1.5} style={{ color }} />}
      </div>
      <div className="cc-kpi-value">{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: "var(--cc-muted)" }}>{sub}</div>}
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  const load = async () => setStats(await api.stats());

  useEffect(() => { load(); }, []);

  const doSeed = async () => {
    await api.seed();
    toast.success("Sample data loaded");
    load();
  };

  if (!stats) return <div className="p-8">Loading…</div>;

  const sourceData = Object.entries(stats.source_breakdown || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: SOURCE_MAP[k]?.label || k, value: v, color: SOURCE_MAP[k]?.color || "#B8AC98" }));

  const hasData = (stats.next_bookings || []).length > 0;

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[1400px]">
      <PageHeader
        overline="Overview"
        title="Buongiorno."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/bookings/new" className="cc-btn-primary inline-flex items-center gap-2" data-testid="qa-add-booking">
              <Plus size={16} /> Add booking
            </Link>
            {!hasData && (
              <button className="cc-btn-ghost" onClick={doSeed} data-testid="btn-seed">
                Load sample data
              </button>
            )}
          </div>
        }
      >
        <p className="mt-2 text-base" style={{ color: "var(--cc-muted)" }}>
          A calm view of the estate today.
        </p>
      </PageHeader>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card icon={Coins} label="Month revenue" value={formatMoney(stats.month_gross)} testId="kpi-month-revenue" />
        <Card icon={TrendingUp} label="Gross revenue" value={formatMoney(stats.gross_total)} testId="kpi-gross" />
        <Card icon={Percent} label="Agency commission" value={formatMoney(stats.commission_total)} tone="terracotta" testId="kpi-commission" />
        <Card icon={Coins} label="Net owner" value={formatMoney(stats.net_total)} testId="kpi-net" />
        <Card icon={CalendarClock} label="Confirmed bookings" value={stats.confirmed_count} testId="kpi-confirmed" />
        <Card icon={ArrowDown} label="Direct revenue" value={formatMoney(stats.direct_revenue)} testId="kpi-direct" />
        <Card icon={ArrowUp} label="Agency revenue" value={formatMoney(stats.agency_revenue)} tone="terracotta" testId="kpi-agency" />
        <Card icon={Percent} label="Occupancy" value={`${stats.occupancy_pct}%`} sub={`${stats.total_nights} nights booked`} testId="kpi-occupancy" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="cc-card p-6 lg:col-span-2" data-testid="chart-monthly">
          <div className="overline mb-4">Revenue · last 6 months</div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={stats.monthly_series}>
                <XAxis dataKey="month" tick={{ fill: "#6b6b60", fontSize: 11 }} axisLine={{ stroke: "#B8AC98" }} tickLine={false} />
                <YAxis tick={{ fill: "#6b6b60", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#F5F1E8", border: "1px solid #B8AC98" }} formatter={(v) => formatMoney(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#6F7B55" strokeWidth={2} dot={{ r: 3, fill: "#A86848" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="cc-card p-6" data-testid="chart-source">
          <div className="overline mb-4">Booking sources</div>
          {sourceData.length ? (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={sourceData} innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value">
                    {sourceData.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#F5F1E8", border: "1px solid #B8AC98" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--cc-muted)" }}>No bookings yet.</p>
          )}
          <div className="mt-3 space-y-1">
            {sourceData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs" style={{ color: "var(--cc-forest)" }}>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /> {s.name}</span>
                <span>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Next bookings + Current stay + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="cc-card p-6 lg:col-span-2" data-testid="next-bookings">
          <div className="flex items-center justify-between mb-4">
            <div className="overline">Next arrivals</div>
            <Link to="/bookings" className="text-xs" style={{ color: "var(--cc-olive)" }}>View all →</Link>
          </div>
          {stats.next_bookings.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--cc-muted)" }}>Nothing upcoming.</p>
          ) : (
            <div className="space-y-3">
              {stats.next_bookings.map((b) => (
                <Link
                  key={b.id}
                  to={`/bookings/${b.id}`}
                  className="flex items-center justify-between py-3 border-b last:border-b-0 hover:bg-[color:var(--cc-bg)] transition-colors -mx-2 px-2 rounded-md"
                  style={{ borderColor: "var(--cc-border)" }}
                  data-testid={`next-booking-${b.id}`}
                >
                  <div>
                    <div className="serif text-xl" style={{ color: "var(--cc-forest)" }}>{b.guest_name || "Unnamed"}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--cc-muted)" }}>
                      {formatDate(b.checkin)} → {formatDate(b.checkout)} · {b.adults + b.children} guests
                    </div>
                  </div>
                  <div className="text-right">
                    <SourceBadge source={b.source} />
                    <div className="text-sm mt-1" style={{ color: "var(--cc-forest)" }}>{formatMoney(b.gross_amount)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="cc-card p-6" data-testid="current-stay">
          <div className="overline mb-3">Current stay</div>
          {stats.current_stay ? (
            <>
              <div className="serif text-2xl" style={{ color: "var(--cc-forest)" }}>{stats.current_stay.guest_name}</div>
              <div className="text-sm mt-1" style={{ color: "var(--cc-muted)" }}>
                {formatDate(stats.current_stay.checkin)} → {formatDate(stats.current_stay.checkout)}
              </div>
              <div className="mt-3"><SourceBadge source={stats.current_stay.source} /></div>
              <Link to={`/bookings/${stats.current_stay.id}`} className="cc-btn-ghost inline-block mt-4 text-sm">Open details</Link>
            </>
          ) : (
            <p className="text-sm" style={{ color: "var(--cc-muted)" }}>No active stay right now.</p>
          )}
          <hr className="cc-divider my-5" />
          <div className="overline mb-2">Urgent tasks</div>
          {stats.urgent_tasks.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--cc-muted)" }}>All calm.</p>
          ) : (
            <ul className="space-y-2">
              {stats.urgent_tasks.map((t) => (
                <li key={t.id} className="text-sm flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5" style={{ color: "var(--cc-terracotta)" }} />
                  <span>{t.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8 flex flex-wrap gap-2">
        <Link to="/bookings/new" className="cc-btn-ghost inline-flex items-center gap-2" data-testid="qa-booking"><Plus size={14} /> Booking</Link>
        <Link to="/experiences/new" className="cc-btn-ghost inline-flex items-center gap-2" data-testid="qa-experience"><Sparkles size={14} /> Experience</Link>
        <Link to="/contacts/new" className="cc-btn-ghost inline-flex items-center gap-2" data-testid="qa-provider"><Users size={14} /> Provider</Link>
        <Link to="/documents" className="cc-btn-ghost inline-flex items-center gap-2" data-testid="qa-document"><FileText size={14} /> Document</Link>
        <Link to="/tasks" className="cc-btn-ghost inline-flex items-center gap-2" data-testid="qa-note"><StickyNote size={14} /> Note</Link>
      </div>
    </div>
  );
}
