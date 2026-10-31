import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminViewProps } from "../../../lib/admin-page-types";
import { accessLists, type AccessListKind, type AccessListRecord } from "../../../lib/signup-access-list";
import AccessListForm from "../access-list-form";
import "./model-config.css";
import "./terms.css";

export function SignupDomainsView(props: AdminViewProps) { return <AccessListsView {...props} kind="domain" />; }
export function WhitelistedEmailsView(props: AdminViewProps) { return <AccessListsView {...props} kind="email" />; }

async function AccessListsView({ supabase, params, kind }: AdminViewProps & { kind: AccessListKind }) {
  const config = accessLists[kind];
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 254) : "";
  const rawPage = Number(typeof params.page === "string" ? params.page : "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1;
  let query = supabase.from(config.table).select(`id,value:${config.column},notes`, { count: "exact" });
  if (q) query = query.ilike(config.column, `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  const { data, error, count } = await query.order(config.column).order("id")
    .range((page - 1) * 12, page * 12 - 1).returns<AccessListRecord[]>();
  function href(nextPage: number) {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (nextPage > 1) next.set("page", String(nextPage));
    return next.size ? `${config.path}?${next}` : config.path;
  }
  if (page > 1 && (error?.code === "PGRST103" || (!error && !data?.length))) redirect(href(1));
  const pages = Math.max(1, Math.ceil((count ?? 0) / 12));
  return <section className="admin-section" aria-labelledby="access-heading">
    <div className="collection-heading"><h2 id="access-heading">{config.title}</h2><p>{count ?? 0} entries</p></div>
    <p className="config-help">{kind === "domain" ? "Manage domains such as columbia.edu. Enter the exact domain without @, a URL, or a wildcard." : "Manage individual email addresses. Entries are saved in lowercase to prevent duplicates."}</p>
    <p className="config-help">These lists are stored for management. Signup enforcement has not been connected yet.</p>
    <details className="config-create" open><summary>Add {config.label}</summary><AccessListForm kind={kind} /></details>
    <form action={config.path} className="config-filters">
      <label htmlFor="access-search">Search {kind === "domain" ? "domains" : "emails"}<input id="access-search" name="q" defaultValue={q} maxLength={254} /></label>
      <button type="submit">Search / Refresh</button><Link href={config.path}>Reset</Link>
    </form>
    {error ? <p role="alert">Could not load this list. Refresh to try again.</p> : !data?.length ? <p className="empty-state">{q ? "No matching entries. Try clearing the search." : `No entries yet. Add a ${config.label} above.`}</p> : <>
      <div className="config-grid">{data.map(record => <article className="config-card" key={record.id}>
        <h3>{record.value} <span>#{record.id}</span></h3>
        {record.notes ? <p className="term-definition">{record.notes}</p> : null}
        <details><summary>Edit / Delete entry</summary><AccessListForm kind={kind} record={record} /></details>
      </article>)}</div>
      <nav className="config-pagination" aria-label={`${config.title} pages`}>
        {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span>Previous</span>}
        <span>Page {page} of {pages}</span>
        {page < pages ? <Link href={href(page + 1)}>Next</Link> : <span>Next</span>}
      </nav>
    </>}
  </section>;
}
