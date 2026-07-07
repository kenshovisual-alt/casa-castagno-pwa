import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, BookOpen, Coins, Sparkles,
  Users, FileText, Home, ListChecks, Settings, TreePine
} from "lucide-react";
import { Toaster } from "sonner";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard", end: true },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, testId: "nav-calendar" },
  { to: "/bookings", label: "Bookings", icon: BookOpen, testId: "nav-bookings" },
  { to: "/finance", label: "Finance", icon: Coins, testId: "nav-finance" },
  { to: "/experiences", label: "Experiences", icon: Sparkles, testId: "nav-experiences" },
  { to: "/contacts", label: "Contacts", icon: Users, testId: "nav-contacts" },
  { to: "/documents", label: "Documents", icon: FileText, testId: "nav-documents" },
  { to: "/property", label: "Property", icon: Home, testId: "nav-property" },
  { to: "/tasks", label: "Tasks", icon: ListChecks, testId: "nav-tasks" },
  { to: "/settings", label: "Settings", icon: Settings, testId: "nav-settings" },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen flex" style={{ background: "var(--cc-bg)" }}>
      {/* Sidebar (desktop) */}
      <aside
        className="hidden md:flex md:flex-col md:w-64 lg:w-72 border-r"
        style={{ borderColor: "var(--cc-border)", background: "var(--cc-bg)" }}
        data-testid="app-sidebar"
      >
        <div className="px-8 pt-10 pb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "var(--cc-olive)", color: "var(--cc-bg)" }}
            >
              <TreePine size={18} strokeWidth={1.6} />
            </div>
            <div>
              <div className="serif text-xl leading-none" style={{ color: "var(--cc-forest)" }}>
                Casa Castagno
              </div>
              <div className="overline mt-2">Estate manager</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4">
          {NAV.map(({ to, label, icon: Icon, testId, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={testId}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-md mb-1 transition-colors ${
                  isActive
                    ? "text-[color:var(--cc-forest)]"
                    : "text-[color:var(--cc-muted)] hover:text-[color:var(--cc-forest)]"
                }`
              }
              style={({ isActive }) => (isActive ? { background: "var(--cc-card)" } : {})}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span className="text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-6 text-xs" style={{ color: "var(--cc-muted)" }}>
          <div className="overline mb-2">Owner mode</div>
          <div>Signed in as Owner · v1.0</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t z-40"
        style={{ background: "var(--cc-bg)", borderColor: "var(--cc-border)" }}
        data-testid="mobile-nav"
      >
        <div className="grid grid-cols-5">
          {NAV.slice(0, 5).map(({ to, label, icon: Icon, testId, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={`m-${testId}`}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2 text-[10px] ${
                  isActive ? "text-[color:var(--cc-forest)]" : "text-[color:var(--cc-muted)]"
                }`
              }
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
