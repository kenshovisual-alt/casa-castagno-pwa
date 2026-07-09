import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader, SourceBadge, PageSkeleton } from "../components/Ui";
import { formatMoney, formatDate, SOURCE_MAP } from "../lib/constants";
import {
  Coins, TrendingUp, CalendarClock, ArrowDown, ArrowUp, Percent,
  Sparkles, Users, FileText, Plus, StickyNote, AlertCircle, BookOpen
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const Card = ({ icon: Icon, label, value, sub, testId, tone = "olive" }) => {
  const color = tone === "terracotta" ? "var(--cc-terracotta)" : "var(--cc-olive)";
  return (
    <div className="cc-card p-5" data-testid={testId}>
      <div className="flex items-center justify-between mb-3">
        <span className="cc-overline">{label}</span>
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

  useEffect(() => {
    load();
    const onFocus = () => load();
    const onVisibility = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const doSeed = async () => {
    await api.seed();
    toast.success("Sample data loaded");
    load();
  };

  if (!stats) return <PageSkeleton cards={8} />;

  const sourceData = Object.entries(stats.source_breakdown || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: SOURCE_MAP[k]?.label || k, value: v, color: SOURCE_MAP[k]?.color || "#B8AC98" }));

  const hasData = (stats.next_bookings || []).length > 0;

  return (
    <div className="max-w-[1400px]">
      <div
        className="relative px-6 md:px-10 lg:px-14 pt-10"
        style={{
          backgroundImage: `linear-gradient(to bottom, transparent 55%, var(--cc-bg) 100%), linear-gradient(to right, var(--cc-bg) 0%, var(--cc-bg) 22%, transparent 70%), url(/imagedashboard.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center 35%",
          backgroundRepeat: "no-repeat",
        }}
      >
        <PageHeader overline="Overview" title="Buongiorno Eren">
          <p className="mt-2 text-base" style={{ color: "var(--cc-muted)" }}>
            A calm view of the estate today.
          </p>
        </PageHeader>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 pb-8">
          {!hasData && (
            <button className="cc-btn-ghost" onClick={doSeed} data-testid="btn-seed">
              Load sample data
            </button>
          )}
          {[
            { to: "/bookings/new", icon: BookOpen, label: "Booking", testId: "qa-add-booking" },
            { to: "/experiences/new", icon: Sparkles, label: "Experience", testId: "qa-experience" },
            { to: "/contacts/new", icon: Users, label: "Provider", testId: "qa-provider" },
            { to: "/documents", icon: FileText, label: "Document", testId: "qa-document" },
            { to: "/tasks", icon: StickyNote, label: "Task", testId: "qa-note" },
          ].map(({ to, icon: Icon, label, testId }) => (
            <Link
              key={testId}
              to={to}
              data-testid={testId}
              className="group flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-lg border transition-all hover:shadow-sm"
              style={{ borderColor: "var(--cc-border)", background: "var(--cc-card)" }}
            >
              <span className="relative flex items-center justify-center w-8 h-8 rounded-full shrink-0">
                <span
                  className="flex items-center justify-center w-full h-full rounded-full transition-colors"
                  style={{ background: "var(--cc-bg)", color: "var(--cc-olive)" }}
                >
                  <Icon size={15} strokeWidth={1.75} className="transition-transform group-hover:scale-110" />
                </span>
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full border"
                  style={{ background: "var(--cc-olive)", borderColor: "var(--cc-card)" }}
                >
                  <Plus size={9} strokeWidth={3} color="var(--cc-bg)" />
                </span>
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--cc-forest)" }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-10 lg:px-14 pb-10">

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card icon={Coins} label="Month revenue" value={formatMoney(stats.month_gross)} testId="kpi-month-revenue" />
        <Card icon={TrendingUp} label="Gross revenue" value={formatMoney(stats.gross_total)} testId="kpi-gross" />
        <Card icon={Percent} label="Agency commission" value={formatMoney(stats.commission_total)} tone="terracotta" testId="kpi-commission" />
        <Card icon={Coins} label="Net owner" value={formatMoney(stats.net_total)} testId="kpi-net" />
        <Card icon={CalendarClock} label="Confirmed bookings" value={stats.confirmed_count} testId="kpi-confirmed" />
        <Card icon={ArrowDown} label="Direct revenue" value={formatMoney(stats.direct_revenue)} testId="kpi-direct" />
        <Card icon={ArrowUp} label="Agency revenue" value={formatMoney(stats.agency_revenue)} tone="terracotta" testId="kpi-agency" />
        <Card icon={Percent} label="Occupancy (this year)" value={`${stats.occupancy_pct}%`} sub={`${stats.nights_this_year} nights booked in ${new Date().getFullYear()}`} testId="kpi-occupancy" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="cc-card p-6 lg:col-span-2" data-testid="chart-monthly">
          <div className="cc-overline mb-4">Revenue · last 6 months</div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={stats.monthly_series}>
                <XAxis dataKey="month" tick={{ fill: "var(--cc-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--cc-stone)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--cc-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--cc-bg)", border: "1px solid var(--cc-stone)", color: "var(--cc-text)" }} formatter={(v) => formatMoney(v)} />
                <Line type="monotone" dataKey="revenue" stroke="var(--cc-olive)" strokeWidth={2} dot={{ r: 3, fill: "var(--cc-terracotta)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="cc-card p-6" data-testid="chart-source">
          <div className="cc-overline mb-4">Booking sources</div>
          {sourceData.length ? (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={sourceData} innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value">
                    {sourceData.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--cc-bg)", border: "1px solid var(--cc-stone)", color: "var(--cc-text)" }} />
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
            <div className="cc-overline">Next arrivals</div>
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
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 border-b last:border-b-0 hover:bg-[color:var(--cc-bg)] transition-colors -mx-2 px-2 rounded-md"
                  style={{ borderColor: "var(--cc-border)" }}
                  data-testid={`next-booking-${b.id}`}
                >
                  <div className="min-w-0">
                    <div className="serif text-xl truncate" style={{ color: "var(--cc-forest)" }}>{b.guest_name || "Unnamed"}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--cc-muted)" }}>
                      {formatDate(b.checkin)} → {formatDate(b.checkout)} · {b.adults + b.children} guests
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <SourceBadge source={b.source} />
                    <div className="text-sm mt-1" style={{ color: "var(--cc-forest)" }}>{formatMoney(b.gross_amount)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="cc-card p-6" data-testid="current-stay">
          <div className="cc-overline mb-3">Current stay</div>
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
          <div className="cc-overline mb-2">Urgent tasks</div>
          {stats.urgent_tasks.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--cc-muted)" }}>All calm.</p>
          ) : (
            <ul className="space-y-2">
              {stats.urgent_tasks.map((t) => {
                const overdue = t.due_date && t.due_date < new Date().toISOString().slice(0, 10);
                return (
                  <li key={t.id} className="text-sm flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5" style={{ color: "var(--cc-terracotta)" }} />
                    <span>
                      {t.title}
                      {overdue && <span className="ml-2 text-xs font-semibold" style={{ color: "var(--cc-terracotta)" }}>Overdue</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
