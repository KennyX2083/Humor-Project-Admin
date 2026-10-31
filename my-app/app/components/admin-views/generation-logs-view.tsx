import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminViewProps } from "../../../lib/admin-page-types";
import "./generation-logs.css";

type Model = { name: string; model_identifier: string };
type RequestRecord = {
  id: number;
  user_id: string;
  status: string;
  game: string;
  character_name: string | null;
  situation: string;
  completed_at: string | null;
  llm_models: Model | null;
  chain_id?: number | null;
};
type LogRecord = Partial<RequestRecord> & {
  id: number;
  created_at: string;
  request_id?: number;
  step_id?: number | null;
  chain_id?: number | null;
  prompt?: string;
  output?: string | null;
  error?: string | null;
  duration_ms?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  generation_request?: RequestRecord | null;
};

const requestFields = "id,user_id,status,game,character_name,situation,completed_at,chain_id,llm_models(name,model_identifier)";
const pageSize = 20;
const date = (value: string) => new Date(value).toLocaleString("en-US", { timeZone: "America/New_York" });

export function RequestsView(props: AdminViewProps) {
  return <GenerationLogsView {...props} kind="requests" />;
}

export function ResponsesView(props: AdminViewProps) {
  return <GenerationLogsView {...props} kind="responses" />;
}

async function GenerationLogsView({ supabase, params, kind }: AdminViewProps & { kind: "requests" | "responses" }) {
  const responses = kind === "responses";
  const path = responses ? "/llm-responses" : "/generation-requests";
  const title = responses ? "LLM responses" : "Generation requests";
  const text = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const status = ["pending", "succeeded", "failed"].includes(text("status")) ? text("status") : "";
  const requestId = text("request_id").trim();
  // Keep bigint IDs as strings to avoid losing precision in URL filters.
  const validId = !requestId || (/^[1-9]\d{0,18}$/.test(requestId) && BigInt(requestId) <= BigInt("9223372036854775807"));
  const q = text("q").trim().slice(0, 200);
  const rawPage = Number(text("page") || "1");
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 100000 ? rawPage : 1;

  function href(nextPage: number, id = requestId) {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (id) next.set("request_id", id);
    if (q) next.set("q", q);
    if (nextPage > 1) next.set("page", String(nextPage));
    return next.size ? `${path}?${next}` : path;
  }

  const filters = (
    <form action={path} className="log-filters">
      <label htmlFor="log-status">Status
        <select id="log-status" name="status" defaultValue={status}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
        </select>
      </label>
      <label htmlFor="log-request">Request ID
        <input id="log-request" name="request_id" inputMode="numeric" defaultValue={requestId} maxLength={19} />
      </label>
      <label htmlFor="log-search">{responses ? "Search output" : "Search situation"}
        <input id="log-search" name="q" defaultValue={q} maxLength={200} />
      </label>
      <button type="submit">Apply / Refresh</button>
      <Link href={path}>Reset</Link>
    </form>
  );

  if (!validId) {
    return <section className="admin-section">{filters}<p role="alert">Enter a positive numeric request ID.</p></section>;
  }

  let query = responses
    ? supabase.from("llm_response").select(`id,created_at,request_id,step_id,chain_id,prompt,output,error,duration_ms,input_tokens,output_tokens,generation_request!inner(${requestFields})`, { count: "exact" })
    : supabase.from("generation_request").select(`created_at,${requestFields}`, { count: "exact" });
  if (status) query = query.eq(responses ? "generation_request.status" : "status", status);
  if (requestId) query = query.eq(responses ? "request_id" : "id", requestId);
  if (q) {
    const escaped = q.replace(/[\\%_]/g, "\\$&");
    query = query.ilike(responses ? "output" : "situation", `%${escaped}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)
    .returns<LogRecord[]>();

  if (page > 1 && (error?.code === "PGRST103" || (!error && !data?.length))) redirect(href(1));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  return (
    <section className="admin-section" aria-labelledby="logs-heading">
      <div className="collection-heading">
        <h2 id="logs-heading">{title}</h2>
        <p>{count ?? 0} records · Read only</p>
      </div>
      {filters}
      <p className="log-timezone">Times shown in America/New_York.</p>
      {error ? <p role="alert">Could not load {title.toLowerCase()}. Try refreshing.</p> : !data?.length ? (
        <p className="empty-state">No matching records. Generate an excuse or clear your filters.</p>
      ) : (
        <>
          <div className="table-scroll" role="region" aria-labelledby="logs-heading" tabIndex={0}>
            <table className="log-table">
              <thead><tr>
                <th scope="col">ID / Created</th><th scope="col">Request / Status</th>
                <th scope="col">Game / Model</th>
                {responses ? <th scope="col">Usage</th> : <th scope="col">User</th>}
                <th scope="col">Details</th>
              </tr></thead>
              <tbody>{data.map((row) => {
                const request = responses ? row.generation_request : row;
                const id = responses ? row.request_id : row.id;
                return <tr key={row.id}>
                  <td>#{row.id}<br /><time dateTime={row.created_at}>{date(row.created_at)}</time></td>
                  <td>
                    <Link href={`/generation-requests?request_id=${id}`}>Request #{id}</Link>
                    <br /><span className="log-status" data-status={request?.status}>{request?.status ?? "Unknown"}</span>
                  </td>
                  <td>{request?.game ?? "Unknown"}<br />{request?.llm_models?.name ?? "Unknown model"}
                    <br /><code>{request?.llm_models?.model_identifier}</code>
                  </td>
                  {responses ? <td>
                    {row.duration_ms == null ? "—" : `${row.duration_ms} ms`}<br />
                    Input: {row.input_tokens ?? "—"}<br />Output: {row.output_tokens ?? "—"} tokens
                  </td> : <td className="user-id">{row.user_id}</td>}
                  <td><details>
                    <summary>View details for #{row.id}</summary>
                    {row.chain_id ? <p><Link href={`/prompt-chain-steps?chain_id=${row.chain_id}`}>View chain #{row.chain_id}</Link>{responses && row.step_id ? ` · Step ID ${row.step_id}` : ""}</p> : <p>Recorded before prompt chains were introduced.</p>}
                    {responses ? <>
                      <h3>Prompt</h3><pre>{row.prompt}</pre>
                      <h3>Output</h3><pre>{row.output ?? "No output returned."}</pre>
                      <h3>Error</h3><pre>{row.error ?? "None"}</pre>
                    </> : <>
                      <h3>Character</h3><p>{row.character_name || "Not specified"}</p>
                      <h3>Situation</h3><pre>{row.situation}</pre>
                      <h3>Completed</h3><p>{row.completed_at ? date(row.completed_at) : "Not completed"}</p>
                      <Link className="admin-action-link" href={`/llm-responses?request_id=${row.id}`}>View responses for this request <span aria-hidden="true">?</span></Link>
                    </>}
                  </details></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <nav className="log-pagination" aria-label={`${title} pages`}>
            {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span>Previous</span>}
            <span>Page {page} of {totalPages}</span>
            {page < totalPages ? <Link href={href(page + 1)}>Next</Link> : <span>Next</span>}
          </nav>
        </>
      )}
    </section>
  );
}
