"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { AdminSection } from "../../lib/admin-page-types";
import "./admin-navigation.css";

const groups: { title: string; links: { section: AdminSection; href: string; label: string }[] }[] = [
  { title: "Overview", links: [
    { section: "stats", href: "/", label: "Stats" },
    { section: "users", href: "/users", label: "Users" },
  ] },
  { title: "Content", links: [
    { section: "excuses", href: "/excuses", label: "Excuses" },
    { section: "ratings", href: "/ratings", label: "Ratings" },
    { section: "terms", href: "/terms", label: "Terms" },
    { section: "examples", href: "/generation-examples", label: "Generation examples" },
  ] },
  { title: "Observability", links: [
    { section: "requests", href: "/generation-requests", label: "Generation requests" },
    { section: "responses", href: "/llm-responses", label: "LLM responses" },
  ] },
  { title: "Configuration", links: [
    { section: "providers", href: "/llm-providers", label: "LLM providers" },
    { section: "models", href: "/llm-models", label: "LLM models" },
    { section: "chains", href: "/prompt-chains", label: "Prompt chains" },
    { section: "steps", href: "/prompt-chain-steps", label: "Chain steps" },
    { section: "mix", href: "/prompt-chain-mix", label: "Chain mix" },
  ] },
  { title: "Signup access", links: [
    { section: "domains", href: "/signup-domains", label: "Allowed domains" },
    { section: "emails", href: "/whitelisted-emails", label: "Whitelisted emails" },
  ] },
];

export default function AdminNavigation({ active }: { active: AdminSection }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  function closeMenu() { setOpen(false); }

  return (
    <aside className="admin-sidebar" data-open={open} onKeyDown={event => {
      if (event.key === "Escape" && open) {
        closeMenu();
        toggle.current?.focus();
      }
    }}>
      <div className="sidebar-header">
        <Link className="brand" href="/" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true">e.</span>
          Excuse Queue
        </Link>
        <button ref={toggle} className="sidebar-toggle" type="button"
          aria-expanded={open} aria-controls="admin-sidebar-navigation"
          onClick={() => setOpen(!open)}>
          {open ? "Close menu" : "Menu"}
        </button>
      </div>
      <nav id="admin-sidebar-navigation" className="admin-nav" aria-label="Admin navigation">
        {groups.map(group => <div className="sidebar-group" key={group.title}>
          <p className="sidebar-group-title">{group.title}</p>
          {group.links.map(link => (
            <Link key={link.section} href={link.href} onClick={closeMenu}
              aria-current={active === link.section ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </div>)}
        <div className="sidebar-group">
          <p className="sidebar-group-title">Tools</p>
          <a href="https://humor-prompt-chain-tool-three.vercel.app/" onClick={closeMenu}>
            Prompt Chain Tool <span aria-hidden="true">↗</span>
          </a>
        </div>
      </nav>
      <p className="sidebar-footer">Excuse Queue / Admin</p>
    </aside>
  );
}
