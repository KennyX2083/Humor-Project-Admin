import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminViewProps } from "../../../lib/admin-page-types";
import "./generation-logs.css";

export function ChainsView(props: AdminViewProps) { return <PromptChainsView {...props} stepsView={false} />; }
export function ChainStepsView(props: AdminViewProps) { return <PromptChainsView {...props} stepsView />; }

async function PromptChainsView({ supabase, params, stepsView }: AdminViewProps & { stepsView: boolean }) {
  const path = stepsView ? "/prompt-chain-steps" : "/prompt-chains";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const chainId = typeof params.chain_id === "string" ? params.chain_id : "";
  const validId = !chainId || (/^[1-9]\d{0,18}$/.test(chainId) && BigInt(chainId) <= BigInt("9223372036854775807"));
  const rawPage = Number(typeof params.page === "string" ? params.page : "1");
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 100000 ? rawPage : 1;
  const title = stepsView ? "Prompt chain steps" : "Prompt chains";
  const filters = <form action={path} className="log-filters">
    <label htmlFor="chain-search">Search name<input id="chain-search" name="q" defaultValue={q} maxLength={100} /></label>
    {stepsView ? <label htmlFor="chain-id">Chain ID<input id="chain-id" name="chain_id" defaultValue={chainId} inputMode="numeric" maxLength={19} /></label> : null}
    <button type="submit">Apply / Refresh</button><Link href={path}>Reset</Link>
  </form>;
  if (stepsView && !validId) return <section className="admin-section">{filters}<p role="alert">Enter a positive numeric chain ID.</p></section>;
  let query = stepsView
    ? supabase.from("prompt_chain_steps").select("id,chain_id,position,name,instructions,prompt_chains(name)", { count: "exact" })
    : supabase.from("prompt_chains").select("id,name,slug,description,created_at", { count: "exact" });
  if (q) query = query.ilike("name", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  if (stepsView && chainId) query = query.eq("chain_id", chainId);
  if (stepsView) query = query.order("chain_id").order("position");
  const { data, error, count } = await query.order("id").range((page - 1) * 20, page * 20 - 1)
    .returns<{ id: number; name: string; slug?: string; description?: string; chain_id?: number; position?: number; instructions?: string; prompt_chains?: { name: string } | null }[]>();
  function href(nextPage: number) {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (stepsView && chainId) next.set("chain_id", chainId);
    if (nextPage > 1) next.set("page", String(nextPage));
    return next.size ? `${path}?${next}` : path;
  }
  if (page > 1 && (error?.code === "PGRST103" || (!error && !data?.length))) redirect(href(1));
  const pages = Math.max(1, Math.ceil((count ?? 0) / 20));
  return <section className="admin-section" aria-labelledby="chains-heading">
    <div className="collection-heading"><h2 id="chains-heading">{title}</h2><p>{count ?? 0} records · Read only</p></div>
    <p>{stepsView ? "Steps run in position order. Each step receives the player details and the previous step's output." : "The generator selects a chain using its saved mix weight. Open a chain to inspect its steps."}</p>
    {filters}
    {error ? <p role="alert">Could not load {title.toLowerCase()}. Try refreshing.</p> : !data?.length ? <p className="empty-state">No matching records.</p> : <>
      <div className="table-scroll" role="region" aria-labelledby="chains-heading" tabIndex={0}>
        <table className="log-table"><thead><tr>
          <th scope="col">ID / Name</th><th scope="col">{stepsView ? "Chain / Position" : "Slug"}</th>
          <th scope="col">{stepsView ? "Instructions" : "Description / Steps"}</th>
        </tr></thead><tbody>{data.map(row => <tr key={row.id}>
          <td>#{row.id}<br />{row.name}{!stepsView ? <><br /><Link className="admin-action-link" href={`/prompt-chain-steps?chain_id=${row.id}`}>View ordered steps <span aria-hidden="true">?</span></Link></> : null}</td>
          <td>{stepsView ? <><Link href={`/prompt-chains?q=${encodeURIComponent(row.prompt_chains?.name ?? "")}`}>{row.prompt_chains?.name ?? `Chain #${row.chain_id}`}</Link><br />Step {row.position}</> : <code>{row.slug}</code>}</td>
          <td>{stepsView ? <details><summary>Read step instructions</summary><pre>{row.instructions}</pre></details> : <>{row.description}</>}</td>
        </tr>)}</tbody></table>
      </div>
      <nav className="log-pagination" aria-label={`${title} pages`}>
        {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span>Previous</span>}
        <span>Page {page} of {pages}</span>
        {page < pages ? <Link href={href(page + 1)}>Next</Link> : <span>Next</span>}
      </nav>
    </>}
  </section>;
}
