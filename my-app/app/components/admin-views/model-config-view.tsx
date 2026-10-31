import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminViewProps } from "../../../lib/admin-page-types";
import ModelConfigForm from "../model-config-form";
import "./model-config.css";

export function ProvidersView(props: AdminViewProps) {
  return <ModelConfigView {...props} kind="provider" />;
}
export function ModelsView(props: AdminViewProps) {
  return <ModelConfigView {...props} kind="model" />;
}

async function ModelConfigView({ supabase, params, kind }: AdminViewProps & { kind: "provider" | "model" }) {
  const models = kind === "model";
  const path = models ? "/llm-models" : "/llm-providers";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const rawPage = Number(typeof params.page === "string" ? params.page : "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1;
  const enabled = params.enabled === "true" || params.enabled === "false" ? params.enabled : "";
  const pageSize = 12;
  let query = supabase.from(models ? "llm_models" : "llm_providers")
    .select(models ? "id,name,provider_id,model_identifier,is_enabled,created_at" : "id,name,created_at", { count: "exact" });
  if (q) query = query.ilike("name", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  if (models && enabled) query = query.eq("is_enabled", enabled === "true");
  const recordsPromise = query.order("id", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1)
    .returns<{ id: number; name: string; provider_id?: number; model_identifier?: string; is_enabled?: boolean; created_at: string }[]>();
  const [records, providerResult] = await Promise.all([
    recordsPromise,
    models ? supabase.from("llm_providers").select("id,name").order("name").limit(1000) : Promise.resolve({ data: [], error: null }),
  ]);

  function href(nextPage: number) {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (models && enabled) next.set("enabled", enabled);
    if (nextPage > 1) next.set("page", String(nextPage));
    return next.size ? `${path}?${next}` : path;
  }
  if (page > 1 && (records.error?.code === "PGRST103" || (!records.error && !records.data?.length))) redirect(href(1));
  const providers = providerResult.data ?? [];
  const providerNames = new Map(providers.map(p => [p.id, p.name]));
  const totalPages = Math.max(1, Math.ceil((records.count ?? 0) / pageSize));

  if (records.error || providerResult.error) return <p role="alert">Could not load {models ? "models" : "providers"}. Refresh to try again.</p>;

  return <section className="admin-section" aria-labelledby="config-heading">
    <div className="collection-heading">
      <h2 id="config-heading">{models ? "LLM models" : "LLM providers"}</h2>
      <p>{records.count ?? 0} records</p>
    </div>
    <p className="config-help">{models
      ? "The excuse generator uses the enabled model with the lowest ID under the provider named Google. Other providers can be catalogued; their API integrations are not connected yet."
      : "Manage provider names here. Keep the Google provider named Google while using the current generator. API keys stay in server environment variables."}</p>
    <details className="config-create" open>
      <summary>Create {kind}</summary>
      {models && !providers.length ? <p>Add a <Link href="/llm-providers">provider</Link> before creating a model.</p> :
        <ModelConfigForm kind={kind} providers={providers} />}
    </details>
    <form action={path} className="config-filters">
      <label htmlFor="config-search">Search name <input id="config-search" name="q" defaultValue={q} maxLength={100} /></label>
      {models ? <label htmlFor="config-enabled">Status
        <select id="config-enabled" name="enabled" defaultValue={enabled}>
          <option value="">All models</option><option value="true">Enabled</option><option value="false">Disabled</option>
        </select>
      </label> : null}
      <button type="submit">Apply / Refresh</button><Link href={path}>Reset</Link>
    </form>
    {!records.data?.length ? <p className="empty-state">No matching {models ? "models" : "providers"}.</p> : <>
      <div className="config-grid">{records.data.map(record => <article className="config-card" key={record.id}>
        <h3>{record.name} <span>#{record.id}</span></h3>
        {models ? <p>{providerNames.get(record.provider_id ?? -1) ?? `Provider #${record.provider_id}`} · {record.is_enabled ? "Enabled" : "Disabled"}<br /><code>{record.model_identifier}</code></p> : null}
        <details><summary>Edit / Delete</summary>
          <ModelConfigForm kind={kind} record={record} providers={providers} />
        </details>
      </article>)}</div>
      <nav className="config-pagination" aria-label={`${kind} pages`}>
        {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span>Previous</span>}
        <span>Page {page} of {totalPages}</span>
        {page < totalPages ? <Link href={href(page + 1)}>Next</Link> : <span>Next</span>}
      </nav>
    </>}
  </section>;
}
