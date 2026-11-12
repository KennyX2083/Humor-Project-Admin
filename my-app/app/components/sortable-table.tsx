"use client";

import { Children, Fragment, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";

type Element = ReactElement<{ children?: ReactNode; "data-sort-value"?: string | number; colSpan?: number }>;

function elements(children: ReactNode): Element[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<Element["props"]>(child)) return [];
    return child.type === Fragment ? elements(child.props.children) : [child];
  });
}

function value(node: ReactNode): string {
  return Children.toArray(node).map(child => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (!isValidElement<Element["props"]>(child)) return "";
    if (child.props["data-sort-value"] !== undefined) return String(child.props["data-sort-value"]);
    // Disclosures and controls must not affect the visible column's sort value.
    if (["details", "button", "form", "meter"].includes(String(child.type))) return "";
    return value(child.props.children);
  }).join(" ").trim();
}

export default function SortableTable({ children, className }: { children: ReactNode; className?: string }) {
  const [sort, setSort] = useState<{ column: number; ascending: boolean } | null>(null);
  const parts = elements(children);
  const head = parts.find(part => part.type === "thead");
  const body = parts.find(part => part.type === "tbody");
  const headerRow = elements(head?.props.children)[0];
  const headers = elements(headerRow?.props.children);
  const rows = elements(body?.props.children);
  const sorted = sort ? [...rows].sort((a, b) => {
    const left = value(elements(a.props.children)[sort.column]);
    const right = value(elements(b.props.children)[sort.column]);
    const numeric = (text: string) => /^-?\d+(?:\.\d+)?%?$/.test(text) ? Number(text.replace("%", "")) : null;
    const l = numeric(left), r = numeric(right);
    const order = l !== null && r !== null ? l - r : left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
    return sort.ascending ? order : -order;
  }) : rows;

  return <table className={className}>
    <caption className="table-sort-hint">Use column arrows to sort the rows displayed on this page.</caption>
    <thead><tr>{headers.map((header, column) => {
      const label = value(header.props.children);
      if (["Actions", "Details"].includes(label)) return header;
      const active = sort?.column === column;
      return <th key={header.key ?? column} scope="col" aria-sort={active ? sort.ascending ? "ascending" : "descending" : "none"}>
        <span className="table-sort-heading">{header.props.children}<span className="table-sort-arrows">
          <button type="button" aria-label={`Sort ${label} ascending`} aria-pressed={active && sort.ascending} onClick={() => setSort({ column, ascending: true })}>↑</button>
          <button type="button" aria-label={`Sort ${label} descending`} aria-pressed={active && !sort.ascending} onClick={() => setSort({ column, ascending: false })}>↓</button>
        </span></span>
      </th>;
    })}</tr></thead>
    {body ? cloneElement(body, {}, sorted) : null}
  </table>;
}
