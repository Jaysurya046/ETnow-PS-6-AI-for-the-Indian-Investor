import type { ReactNode } from "react";

export function PageHeading({ index, title, description, children }: { index: string; title: string; description: string; children?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">ETNOW / WORKSPACE {index}</div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{children}</div></div>;
}

export function PanelHeading({ title, meta, children }: { title: string; meta?: string; children?: ReactNode }) {
  return <div className="panel-heading"><h2>{title}</h2>{meta && <span className="panel-meta">{meta}</span>}<div className="panel-actions">{children}</div></div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state" role="status">{children}</p>;
}

export function signed(value: number, digits = 2) { return `${value > 0 ? "+" : ""}${value.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`; }
export function inr(value: number | null) { return value === null ? "—" : `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export function fixedQuote(value: string) {
  const number = Number(value.replace(/[₹$,]/g, ""));
  if (!Number.isFinite(number)) return value;
  const currency = value.startsWith("$") ? "$" : value.startsWith("₹") ? "₹" : "";
  return currency + number.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
