import React from "react";
import { SOURCE_MAP, STATUS_LABEL } from "../lib/constants";

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
  return (
    <span className="cc-badge" data-testid={`status-badge-${status}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export function PageHeader({ overline, title, action, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {overline && <div className="overline mb-2">{overline}</div>}
        <h1 className="serif text-4xl md:text-5xl leading-tight" style={{ color: "var(--cc-forest)" }}>
          {title}
        </h1>
        {children}
      </div>
      {action}
    </div>
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
