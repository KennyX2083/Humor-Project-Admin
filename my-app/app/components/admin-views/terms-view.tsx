import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminViewProps } from "../../../lib/admin-page-types";
import TermForm, { type TermRecord } from "../term-form";
import "./model-config.css";
import "./terms.css";

export default async function TermsView({ supabase, params }: AdminViewProps) {
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const rawPage = Number(typeof params.page === "string" ? params.page : "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1;
  const pageSize = 12;
  let query = supabase.from("terms").select("id,term,definition,example", { count: "exact" });
  if (q) query = query.ilike("term", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  const { data, error, count } = await query.order("term").order("id")
    .range((page - 1) * pageSize, page * pageSize - 1).returns<TermRecord[]>();
  function href(nextPage: number) {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (nextPage > 1) next.set("page", String(nextPage));
    return next.size ? `/terms?${next}` : "/terms";
  }
  if (page > 1 && (error?.code === "PGRST103" || (!error && !data?.length))) redirect(href(1));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  return <section className="admin-section" aria-labelledby="terms-heading">
    <div className="collection-heading"><h2 id="terms-heading">Terms</h2><p>{count ?? 0} records</p></div>
    <p className="config-help">Manage gaming terms, definitions, and optional usage examples.</p>
    <details className="config-create" open><summary>Create term</summary><TermForm /></details>
    <form action="/terms" className="config-filters">
      <label htmlFor="term-search">Search terms<input id="term-search" name="q" defaultValue={q} maxLength={100} /></label>
      <button type="submit">Search / Refresh</button><Link href="/terms">Reset</Link>
    </form>
    {error ? <p role="alert">Could not load terms. Refresh to try again.</p> : !data?.length ? (
      <p className="empty-state">{q ? "No matching terms. Clear the search or try another term." : "No terms yet. Create your first term above."}</p>
    ) : <>
      <div className="config-grid">{data.map(record => <article className="config-card term-card" key={record.id}>
        <h3>{record.term} <span>#{record.id}</span></h3>
        <p className="term-definition">{record.definition}</p>
        {record.example ? <><h4>Example</h4><p className="term-example">{record.example}</p></> : null}
        <details><summary>Edit / Delete term</summary><TermForm record={record} /></details>
      </article>)}</div>
      <nav className="config-pagination" aria-label="Term pages">
        {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span>Previous</span>}
        <span>Page {page} of {totalPages}</span>
        {page < totalPages ? <Link href={href(page + 1)}>Next</Link> : <span>Next</span>}
      </nav>
    </>}
  </section>;
}
