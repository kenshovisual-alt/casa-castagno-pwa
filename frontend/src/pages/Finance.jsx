import React, { useEffect, useMemo } from "react";
import { api } from "../lib/api";
import { PageHeader } from "../components/Ui";
import { formatMoney, formatDate, nightsBetween, computeFinance, SOURCE_MAP } from "../lib/constants";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export default function Finance() {
  const [bookings, setBookings] = React.useState([]);
  useEffect(() => { api.list("bookings").then(setBookings); }, []);

  const stats = useMemo(() => {
    const active = bookings.filter((b) => b.status !== "cancelled" && b.status !== "blocked");
    const gross = active.reduce((s, b) => s + Number(b.gross_amount || 0), 0);
    const commission = active.reduce((s, b) => s + (b.source === "direct" ? 0 : Number(b.gross_amount || 0) * Number(b.commission_pct || 0) / 100), 0);
    const net = gross - commission;
    const nights = active.reduce((s, b) => s + nightsBetween(b.checkin, b.checkout), 0);
    const avgBooking = active.length ? gross / active.length : 0;
    const avgNightly = nights ? gross / nights : 0;
    const direct = active.filter((b) => b.source === "direct").reduce((s, b) => s + Number(b.gross_amount || 0), 0);
    const agency = gross - direct;
    const pending = active.filter((b) => !b.balance_paid).reduce((s, b) => s + Number(b.gross_amount || 0) - Number(b.deposit_amount || 0), 0);
    const paidCount = active.filter((b) => b.balance_paid).length;
    const cancelledValue = bookings.filter((b) => b.status === "cancelled").reduce((s, b) => s + Number(b.gross_amount || 0), 0);

    // monthly bars
    const bymonth = {};
    active.forEach((b) => {
      if (!b.checkin) return;
      const d = new Date(b.checkin);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      bymonth[k] = (bymonth[k] || 0) + Number(b.gross_amount || 0);
    });
    const series = Object.entries(bymonth).sort().map(([k, v]) => ({ month: k, revenue: v }));

    return { active, gross, commission, net, nights, avgBooking, avgNightly, direct, agency, pending, paidCount, cancelledValue, series };
  }, [bookings]);

  const exportCsv = () => {
    const rows = [
      ["Guest", "Country", "Check-in", "Check-out", "Nights", "Source", "Status", "Gross", "Commission %", "Commission", "Net", "Deposit", "Balance"],
      ...bookings.map((b) => {
        const f = computeFinance(b);
        return [b.guest_name, b.country, b.checkin, b.checkout, nightsBetween(b.checkin, b.checkout),
          b.source, b.status, b.gross_amount, b.commission_pct, f.commission.toFixed(2),
          f.net.toFixed(2), b.deposit_amount, f.balance.toFixed(2)];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "casa-castagno-bookings.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const Card = ({ label, value }) => (
    <div className="cc-card p-5">
      <div className="overline mb-2">{label}</div>
      <div className="cc-kpi-value">{value}</div>
    </div>
  );

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[1400px]">
      <PageHeader
        overline="Finance"
        title="Revenue & KPIs"
        action={
          <button className="cc-btn-primary inline-flex items-center gap-2" onClick={exportCsv} data-testid="btn-export-csv">
            <Download size={16} /> Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card label="Gross revenue" value={formatMoney(stats.gross)} />
        <Card label="Commission total" value={formatMoney(stats.commission)} />
        <Card label="Net owner" value={formatMoney(stats.net)} />
        <Card label="Total nights" value={stats.nights} />
        <Card label="Avg booking" value={formatMoney(stats.avgBooking)} />
        <Card label="Avg nightly rate" value={formatMoney(stats.avgNightly)} />
        <Card label="Direct revenue" value={formatMoney(stats.direct)} />
        <Card label="Agency revenue" value={formatMoney(stats.agency)} />
        <Card label="Pending payments" value={formatMoney(stats.pending)} />
        <Card label="Paid bookings" value={stats.paidCount} />
        <Card label="Cancelled value" value={formatMoney(stats.cancelledValue)} />
        <Card label="Occupancy" value={`${Math.round(stats.nights / 365 * 100)}%`} />
      </div>

      <div className="cc-card p-6 mb-8">
        <div className="overline mb-4">Revenue by month</div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={stats.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#B8AC98" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fill: "#6b6b60", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6b6b60", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#F5F1E8", border: "1px solid #B8AC98" }} formatter={(v) => formatMoney(v)} />
              <Bar dataKey="revenue" fill="#6F7B55" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="cc-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {["Guest", "Dates", "Source", "Gross", "Comm %", "Comm", "Net", "Deposit", "Balance", "Status"].map((h) => (
                <th key={h} className="cc-table-header text-left px-4 py-3 border-b" style={{ borderColor: "var(--cc-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const f = computeFinance(b);
              return (
                <tr key={b.id} className="border-b" style={{ borderColor: "var(--cc-border)" }}>
                  <td className="px-4 py-3 text-sm">{b.guest_name || "Blocked"}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(b.checkin)} → {formatDate(b.checkout)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: SOURCE_MAP[b.source]?.color }}>{SOURCE_MAP[b.source]?.label}</td>
                  <td className="px-4 py-3 text-sm">{formatMoney(b.gross_amount, b.currency)}</td>
                  <td className="px-4 py-3 text-sm">{b.source === "direct" ? 0 : b.commission_pct}%</td>
                  <td className="px-4 py-3 text-sm">{formatMoney(f.commission, b.currency)}</td>
                  <td className="px-4 py-3 text-sm">{formatMoney(f.net, b.currency)}</td>
                  <td className="px-4 py-3 text-sm">{formatMoney(b.deposit_amount, b.currency)}</td>
                  <td className="px-4 py-3 text-sm">{formatMoney(f.balance, b.currency)}</td>
                  <td className="px-4 py-3 text-xs">{b.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
