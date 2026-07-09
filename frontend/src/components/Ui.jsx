import React from "react";
import { SOURCE_MAP, STATUS_MAP } from "../lib/constants";
import { useTheme } from "../hooks/useTheme";
import { Sun, Moon, X } from "lucide-react";

export function SourceBadge({ source }) {
  const s = SOURCE_MAP[source] || SOURCE_MAP.direct;
  return (
    <span
      className="cc-badge"
      data-testid={`source-badge-${source}`}
      style={{ borderColor: s.color, color: s.color }}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const s = STATUS_MAP[status];
  const bg = s?.color || "var(--cc-muted)";
  return (
    <span
      className="cc-badge"
      data-testid={`status-badge-${status}`}
      style={{ background: bg, borderColor: bg, color: "#fff" }}
    >
      {s?.label || status}
    </span>
  );
}

export function PageHeader({ overline, title, action, onClose, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {overline && <div className="cc-overline mb-2">{overline}</div>}
        <h1 className="serif text-4xl md:text-5xl leading-tight" style={{ color: "var(--cc-forest)" }}>
          {title}
        </h1>
        {children}
      </div>
      <div className="flex items-center gap-3">
        {action}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            data-testid="btn-cancel-top"
            className="flex items-center justify-center w-9 h-9 rounded-full border transition-colors"
            style={{ borderColor: "var(--cc-border)", color: "var(--cc-forest)" }}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ThemeToggle({ compact = false }) {
  const { isDark, toggleTheme } = useTheme();
  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center w-9 h-9 rounded-full border transition-colors"
        style={{ borderColor: "var(--cc-border)", color: "var(--cc-forest)" }}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        data-testid="theme-toggle-compact"
      >
        {isDark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
      </button>
    );
  }
  return (
    <button
      onClick={toggleTheme}
      className="cc-btn-ghost inline-flex items-center gap-2 text-sm"
      data-testid="theme-toggle"
    >
      {isDark ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="cc-surface p-10 text-center">
      <div className="serif text-2xl mb-2" style={{ color: "var(--cc-forest)" }}>{title}</div>
      {hint && <p className="text-sm mb-4" style={{ color: "var(--cc-muted)" }}>{hint}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className = "", style }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ background: "var(--cc-border)", ...style }}
    />
  );
}

export function PageSkeleton({ cards = 4 }) {
  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-[1400px]" data-testid="page-skeleton">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-10 w-64 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
