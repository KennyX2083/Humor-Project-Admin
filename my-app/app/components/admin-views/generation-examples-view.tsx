import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminViewProps } from "../../../lib/admin-page-types";
import { exampleGames, type GenerationExample, type ExampleGame } from "../../../lib/generation-example";
import GenerationExampleForm from "../generation-example-form";
import "./model-config.css";
import "./terms.css";

export default async function GenerationExamplesView({ supabase, params }: AdminViewProps) {
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const game = typeof params.game === "string" && Object.hasOwn(exampleGames, params.game) ? params.game as ExampleGame : "";
  const rawPage = Number(typeof params.page === "string" ? params.page : "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1;
  let query = supabase.from("ai_generation_examples").select("id,title,game,character_name,situation,example_excuse", { count: "exact" });
  if (q) query = query.ilike("title", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  if (game) query = query.eq("game", game);
  const { data, error, count } = await query.order("id", { ascending: false })
    .range((page - 1) * 12, page * 12 - 1).returns<GenerationExample[]>();
  function href(nextPage: number) {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (game) next.set("game", game);
    if (nextPage > 1) next.set("page", String(nextPage));
    return next.size ? `/generation-examples?${next}` : "/generation-examples";
  }
  if (page > 1 && (error?.code === "PGRST103" || (!error && !data?.length))) redirect(href(1));
  const pages = Math.max(1, Math.ceil((count ?? 0) / 12));
  return <section className="admin-section" aria-labelledby="examples-heading">
    <div className="collection-heading"><h2 id="examples-heading">AI generation examples</h2><p>{count ?? 0} records</p></div>
    <p className="config-help">Maintain example situations and excuses for each game.</p>
    <details className="config-create" open><summary>Create example</summary><GenerationExampleForm /></details>
    <form action="/generation-examples" className="config-filters">
      <label htmlFor="example-search">Search titles<input id="example-search" name="q" defaultValue={q} maxLength={100} /></label>
      <label htmlFor="example-game">Game<select id="example-game" name="game" defaultValue={game}>
        <option value="">All games</option>{Object.entries(exampleGames).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <button type="submit">Search / Refresh</button><Link href="/generation-examples">Reset</Link>
    </form>
    {error ? <p role="alert">Could not load examples. Refresh to try again.</p> : !data?.length ? <p className="empty-state">{q || game ? "No matching examples. Try clearing the filters." : "No examples yet. Create your first example above."}</p> : <>
      <div className="config-grid">{data.map(record => <article className="config-card" key={record.id}>
        <h3>{record.title} <span>#{record.id}</span></h3>
        <p>{exampleGames[record.game]}{record.character_name ? ` · ${record.character_name}` : ""}</p>
        <h4>Situation</h4><p className="term-definition">{record.situation}</p>
        <h4>Example excuse</h4><p className="term-definition">{record.example_excuse}</p>
        <details><summary>Edit / Delete example</summary><GenerationExampleForm record={record} /></details>
      </article>)}</div>
      <nav className="config-pagination" aria-label="Generation example pages">
        {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span>Previous</span>}
        <span>Page {page} of {pages}</span>
        {page < pages ? <Link href={href(page + 1)}>Next</Link> : <span>Next</span>}
      </nav>
    </>}
  </section>;
}
