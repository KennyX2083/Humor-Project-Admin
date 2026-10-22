import type { AdminViewProps } from "../../../lib/admin-page-types";
import { listParams } from "../../../lib/admin-list-params";
import AdminListControls from "../admin-list-controls";
export default async function RatingsView({ supabase, params, userId }: AdminViewProps) {
  const { pick, readPage, resetPage } = listParams(params, "/ratings");
  const vGame = pick("v_game", ["all", "valorant", "league", "overwatch"], "all");
  const vSort = pick("v_sort", ["newest", "oldest"], "newest");
  const vScope = pick("v_scope", ["all", "mine"], "all");
  const vRating = pick("v_rating", ["all", "valid", "skill"], "all");
  const vPage = readPage("v_page");
let votesQuery = supabase
  .from("excuse_votes")
  .select("id, excuse_id, user_id, vote, created_at, excuses!inner(game)", {
    count: "exact",
  });

if (vGame !== "all") {
  votesQuery = votesQuery.eq("excuses.game", vGame);
}

if (vScope === "mine") {
  votesQuery = votesQuery.eq("user_id", userId);
}

if (vRating !== "all") {
  votesQuery = votesQuery.eq("vote", vRating === "valid" ? 1 : -1);
}

const ascending = vSort === "oldest";
const voteStart = (vPage - 1) * 12;

const {
  data: votes,
  error: votesError,
  count: voteCount,
} = await votesQuery
  .order("created_at", { ascending })
  .order("id", { ascending })
  .range(voteStart, voteStart + 11);

if (vPage > 1 && (votesError?.code === "PGRST103" || (!votesError && !votes?.length))) {
  resetPage("v");
}

const votePages = Math.max(1, Math.ceil((voteCount ?? 0) / 12));
const voterIds = [...new Set((votes ?? []).map((item) => item.user_id))];
const excuseIds = [...new Set((votes ?? []).map((item) => item.excuse_id))];

const [voterResult, excuseResult] = await Promise.all([
  voterIds.length
    ? supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", voterIds)
    : Promise.resolve({ data: [], error: null }),

  excuseIds.length
    ? supabase.from("excuses").select("id, excuse").in("id", excuseIds)
    : Promise.resolve({ data: [], error: null }),
]);

const voteDetailsError = voterResult.error || excuseResult.error;

const voterNames = new Map<string, string>(
  (voterResult.data ?? []).map((person) => [
    person.id,
    [person.first_name, person.last_name].filter(Boolean).join(" ") ||
      "Unnamed user",
  ]),
);

const excuseTexts = new Map<string, string>(
  (excuseResult.data ?? []).map((item) => [item.id, item.excuse]),
);

  return (
    <>
      <section className="admin-section" aria-labelledby="votes-heading">
        <div className="collection-heading">
          <h2 id="votes-heading">Votes / Ratings</h2>
          <p>{voteCount ?? 0} matching votes · Read only</p>
        </div>

        <AdminListControls
          kind="votes"
          placement="filters"
          game={vGame}
          sort={vSort}
          scope={vScope}
          rating={vRating}
          page={vPage}
          totalPages={votePages}
        />

        {votesError || voteDetailsError ? (
          <p role="alert">Could not load votes.</p>
        ) : !votes?.length ? (
          <p className="empty-state">No votes yet.</p>
        ) : (
          <div
            className="table-scroll"
            role="region"
            aria-labelledby="votes-heading"
            tabIndex={0}
          >
            <table className="ratings-table">
              <thead>
                <tr>
                  <th scope="col">Excuse</th>
                  <th scope="col">Voter</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Created</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((item) => (
                  <tr key={item.id}>
                    <td className="situation-cell">
                      {excuseTexts.get(item.excuse_id) ??
                        "Excuse unavailable"}
                    </td>

                    <td>
                      {voterNames.get(item.user_id) ?? "Profile unavailable"}
                    </td>
                    <td>
                      <span className="rating-badge" data-rating={item.vote === 1 ? "valid" : item.vote === -1 ? "skill" : "unknown"}>
                      {item.vote === 1
                        ? "Valid excuse"
                        : item.vote === -1
                          ? "Skill issue"
                          : "Unknown rating"}
                      </span>
                    </td>
                    <td className="created-date">
                      {new Date(item.created_at).toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminListControls
          kind="votes"
          placement="pagination"
          game={vGame}
          sort={vSort}
          scope={vScope}
          rating={vRating}
          page={vPage}
          totalPages={votePages}
        />
      </section>
    </>
  );
}
