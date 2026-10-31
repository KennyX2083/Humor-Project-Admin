import Link from "next/link";
import type { AdminViewProps } from "../../../lib/admin-page-types";
import type { ChainMixEntry } from "../../../lib/prompt-chain-mix";
import ChainMixForm from "../chain-mix-form";
import "./model-config.css";
import "./generation-logs.css";

export default async function ChainMixView({ supabase }: AdminViewProps) {
  const { data, error, count } = await supabase.from("prompt_chain_mix")
    .select("chain_id,weight,prompt_chains(id,name,slug)", { count: "exact" })
    .order("chain_id").limit(1000).returns<ChainMixEntry[]>();
  if (error || (count ?? 0) > 1000) return <p role="alert">Could not load the complete chain mix. Try refreshing.</p>;
  const rows = data ?? [];
  const total = rows.reduce((sum, row) => sum + (row.prompt_chains ? row.weight : 0), 0);
  return <section className="admin-section" aria-labelledby="mix-heading">
    <div className="collection-heading"><h2 id="mix-heading">Prompt chain mix</h2><p>{rows.length} chains · Read / Update</p></div>
    <p className="config-help">Weights control how often each chain is selected for a new generation. Weights of 3 and 1 give approximately 75% and 25% of requests. Set a weight to 0 to pause that chain. Save each change before generating.</p>
    {!total ? <p role="alert">All chains are paused. Generation will be unavailable until at least one chain has a positive weight.</p> : null}
    {rows.length === 1 ? <p>Only one chain is configured, so any positive weight gives it 100% of requests.</p> : null}
    {!rows.length ? <p className="empty-state">No chains have been added to the mix.</p> : <div className="config-grid">{rows.map(row => <article className="config-card" key={row.chain_id}>
      <h3>{row.prompt_chains?.name ?? `Chain #${row.chain_id}`}</h3>
      <p>{row.weight === 0 ? "Paused" : `Saved selection share: ${total ? (row.weight / total * 100).toFixed(1) : "0"}%`}<br />Saved weight: {row.weight}</p>
      <Link className="admin-action-link" href={`/prompt-chain-steps?chain_id=${row.chain_id}`}>View ordered steps <span aria-hidden="true">→</span></Link>
      <ChainMixForm chainId={row.chain_id} weight={row.weight} />
    </article>)}</div>}
  </section>;
}
