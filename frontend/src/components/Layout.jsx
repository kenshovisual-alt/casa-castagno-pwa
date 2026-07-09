import React, { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, BookOpen, Coins, Sparkles,
  Users, FileText, Home, ListChecks, Settings, MoreHorizontal
} from "lucide-react";
import { Toaster } from "sonner";
import { ThemeToggle } from "./Ui";
import GlobalSearch from "./GlobalSearch";
import { useTheme } from "../hooks/useTheme";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";

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

const MOBILE_PRIMARY_COUNT = 4;
const MOBILE_PRIMARY = NAV.slice(0, MOBILE_PRIMARY_COUNT);
const MOBILE_OVERFLOW = NAV.slice(MOBILE_PRIMARY_COUNT);

export default function AppLayout() {
  const { isDark } = useTheme();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const isOverflowActive = MOBILE_OVERFLOW.some((n) => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to));

  return (
    <div className="min-h-screen flex" style={{ background: "var(--cc-bg)" }}>
      {/* Sidebar (desktop) */}
      <aside
        className="hidden md:flex md:flex-col md:w-64 lg:w-72 border-r"
        style={{ borderColor: "var(--cc-border)", background: "var(--cc-bg)" }}
        data-testid="app-sidebar"
      >
        <div className="pl-5 pr-4 pt-10 pb-8">
          <div className="flex items-center gap-2">
            <img
              src={isDark ? "/logo-casa-castagno_white.png" : "/logo-casa-castagno.png"}
              alt="Casa Castagno"
              className="w-20 h-20 lg:w-24 lg:h-24 object-contain shrink-0"
            />
            <div className="min-w-0">
              <div className="serif text-2xl leading-tight whitespace-nowrap" style={{ color: "var(--cc-forest)" }}>
                Casa Castagno
              </div>
              <div className="cc-overline mt-2 whitespace-nowrap">Estate manager</div>
            </div>
          </div>
          <div className="mt-6">
            <GlobalSearch />
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
        <div className="px-6 py-6 flex items-center justify-between text-xs" style={{ color: "var(--cc-muted)" }}>
          <div>
            <div className="cc-overline mb-2">Owner mode</div>
            <div>Signed in as Owner · v1.0</div>
          </div>
          <ThemeToggle compact />
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
          {MOBILE_PRIMARY.map(({ to, label, icon: Icon, testId, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={`m-${testId}`}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2 px-1 min-w-0 text-[10px] ${
                  isActive ? "text-[color:var(--cc-forest)]" : "text-[color:var(--cc-muted)]"
                }`
              }
            >
              <Icon size={18} strokeWidth={1.5} />
              <span className="truncate max-w-full">{label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            data-testid="m-nav-more"
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 min-w-0 text-[10px] ${
              isOverflowActive ? "text-[color:var(--cc-forest)]" : "text-[color:var(--cc-muted)]"
            }`}
          >
            <MoreHorizontal size={18} strokeWidth={1.5} />
            <span className="truncate max-w-full">More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl" style={{ background: "var(--cc-bg)", borderColor: "var(--cc-border)" }}>
          <SheetTitle className="cc-overline mb-2" style={{ color: "var(--cc-muted)" }}>More</SheetTitle>
          <div className="grid grid-cols-3 gap-3 pb-4">
            {MOBILE_OVERFLOW.map(({ to, label, icon: Icon, testId, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMoreOpen(false)}
                data-testid={`m-${testId}`}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-2 py-4 rounded-lg text-xs ${
                    isActive ? "text-[color:var(--cc-forest)]" : "text-[color:var(--cc-muted)]"
                  }`
                }
                style={({ isActive }) => (isActive ? { background: "var(--cc-card)" } : {})}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span className="text-center">{label}</span>
              </NavLink>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
