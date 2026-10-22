import Link from "next/link";
import type { AdminSection } from "../../lib/admin-page-types";
import "./admin-navigation.css";

const links: { section: AdminSection; href: string; label: string }[] = [
  { section: "stats", href: "/", label: "Stats" },
  { section: "users", href: "/users", label: "Users" },
  { section: "excuses", href: "/excuses", label: "Excuses" },
  { section: "ratings", href: "/ratings", label: "Rating" },
];

export default function AdminNavigation({ active }: { active: AdminSection }) {
  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      {links.map((link) => (
        <Link key={link.section} href={link.href}
          aria-current={active === link.section ? "page" : undefined}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
