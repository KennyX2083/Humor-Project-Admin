import type { AdminViewProps, ExcuseRow } from "../../../lib/admin-page-types";
export default async function StatsView({ supabase }: AdminViewProps) {

const overviewResults = await Promise.all([
  supabase.from("profiles").select("id", { count: "exact", head: true }),
  supabase.from("excuses").select("id", { count: "exact", head: true }),

  supabase
    .from("excuse_votes")
    .select("id", { count: "exact", head: true }),

  supabase
    .from("excuse_votes")
    .select("id", { count: "exact", head: true })
    .eq("vote", 1),

  supabase
    .from("excuse_votes")
    .select("id", { count: "exact", head: true })
    .eq("vote", -1),
]);

const [profileResult, ...statsResults] = overviewResults;
const userCount = profileResult.count;
const usersError = profileResult.error;

const statsReady =
  !usersError &&
  userCount !== null &&
  statsResults.every((result) => !result.error && result.count !== null);

const [
  totalExcusesResult,
  totalVotesResult,
  validVotesResult,
  skillVotesResult,
] = statsResults;

const totalExcuses = totalExcusesResult.count ?? 0;
const totalVotes = totalVotesResult.count ?? 0;
const validVotes = validVotesResult.count ?? 0;
const skillVotes = skillVotesResult.count ?? 0;

const validPercentage =
  totalVotes > 0 ? Math.round((validVotes / totalVotes) * 100) : null;
const gameDefinitions = [
  { value: "valorant", label: "Valorant" },
  { value: "league", label: "League of Legends" },
  { value: "overwatch", label: "Overwatch" },
];

const gameStats = await Promise.all(
  gameDefinitions.map(async (game) => {
    const results = await Promise.all([
      supabase
        .from("excuses")
        .select("id", { count: "exact", head: true })
        .eq("game", game.value),

      supabase
        .from("excuse_votes")
        .select("id, excuses!inner(game)", {
          count: "exact",
          head: true,
        })
        .eq("excuses.game", game.value),

      supabase
        .from("excuse_votes")
        .select("id, excuses!inner(game)", {
          count: "exact",
          head: true,
        })
        .eq("excuses.game", game.value)
        .eq("vote", 1),

      supabase
        .from("excuse_votes")
        .select("id, excuses!inner(game)", {
          count: "exact",
          head: true,
        })
        .eq("excuses.game", game.value)
        .eq("vote", -1),
    ]);

    const ready = results.every(
      (result) => !result.error && result.count !== null,
    );

    const [excuseResult, voteResult, validResult, skillResult] = results;

    const ratings = voteResult.count ?? 0;
    const valid = validResult.count ?? 0;

    return {
      ...game,
      ready,
      excuses: excuseResult.count ?? 0,
      ratings,
      valid,
      skill: skillResult.count ?? 0,
      acceptance: ratings > 0 ? Math.round((valid / ratings) * 100) : null,
    };
  }),
);

const leaderboardResult = await supabase.rpc("get_scoped_excuse_feed", {
  p_game: "all",
  p_sort: "valid",
  p_page: 1,
  p_scope: "all",
});

const leaderboardError =
  leaderboardResult.error ||
  (leaderboardResult.data !== null && !Array.isArray(leaderboardResult.data)
    ? new Error("Unexpected leaderboard response.")
    : null);

const rankedExcuses: ExcuseRow[] =
  !leaderboardError && Array.isArray(leaderboardResult.data)
    ? leaderboardResult.data
    : [];

const topExcuses = rankedExcuses
  .filter((item) => Number(item.valid_count) > 0)
  .slice(0, 5);

  return (
    <>
      <section className="admin-section" aria-labelledby="stats-heading">
        <div className="collection-heading">
          <h2 id="stats-heading">Queue overview</h2>
          <p>All data · Independent of table filters</p>
        </div>

        {!statsReady ? (
          <p role="alert">Could not load dashboard statistics.</p>
        ) : (
          <>
          <dl className="stats-grid">
            <div className="stat-card" data-tone="cyan">
              <dt>User profiles</dt>
              <dd>{userCount}</dd>
            </div>
            <div className="stat-card" data-tone="magenta">
              <dt>Published excuses</dt>
              <dd>{totalExcuses}</dd>
            </div>
            <div className="stat-card" data-tone="orange">
              <dt>Total votes</dt>
              <dd>{totalVotes}</dd>
            </div>
            <div className="stat-card" data-tone="cyan">
              <dt>Valid excuse votes</dt>
              <dd>{validVotes}</dd>
            </div>
            <div className="stat-card" data-tone="magenta">
              <dt>Skill issue votes</dt>
              <dd>{skillVotes}</dd>
            </div>
            <div className="stat-card" data-tone="orange">
              <dt>Votes accepting the excuse</dt>
              <dd>
                {validPercentage === null
                  ? "No ratings yet"
                  : validPercentage + "%"}
              </dd>
            </div>
          </dl>

          <div className="verdict-breakdown" role="group" aria-labelledby="verdict-heading">
            <div className="verdict-breakdown-heading">
              <h3 id="verdict-heading">The community verdict</h3>
              <p>
                {validPercentage === null
                  ? "No ratings yet"
                  : `${validPercentage}% of votes accepted the excuse`}
              </p>
            </div>

            <div className="verdict-bar" aria-hidden="true" data-empty={totalVotes === 0}>
              {totalVotes > 0 && (
                <>
                  <span className="verdict-bar-valid" style={{ flexGrow: validVotes }} />
                  <span className="verdict-bar-skill" style={{ flexGrow: skillVotes }} />
                </>
              )}
            </div>

            <div className="verdict-legend">
              <p data-verdict="valid"><strong>{validVotes}</strong> Valid excuse votes</p>
              <p data-verdict="skill"><strong>{skillVotes}</strong> Skill issue votes</p>
            </div>
          </div>
          </>
        )}
      </section>

      <section className="admin-section" aria-labelledby="games-heading">
        <div className="collection-heading">
          <h2 id="games-heading">Game comparison</h2>
          <p>All published excuses and their current ratings</p>
        </div>

        <div
          className="table-scroll"
          role="region"
          aria-labelledby="games-heading"
          tabIndex={0}
        >
          <table className="game-comparison-table">
            <thead>
              <tr>
                <th scope="col">Game</th>
                <th scope="col">Excuses</th>
                <th scope="col">Ratings</th>
                <th scope="col">Valid</th>
                <th scope="col">Skill issue</th>
                <th scope="col">Acceptance</th>
              </tr>
            </thead>
            <tbody>
              {gameStats.map((game) => (
                <tr key={game.value}>
                  <th scope="row">
                    <span className="game-badge" data-game={game.value}>
                      {game.label}
                    </span>
                  </th>
                  {!game.ready ? (
                    <td colSpan={5}>
                      <span role="alert">Statistics unavailable.</span>
                    </td>
                  ) : (
                    <>
                      <td>{game.excuses}</td>
                      <td>{game.ratings}</td>
                      <td>{game.valid}</td>
                      <td>{game.skill}</td>
                      <td>
                        {game.acceptance === null ? (
                          "No ratings yet"
                        ) : (
                          <div className="acceptance-value">
                            <span>{game.acceptance}%</span>
                            <meter
                              className="acceptance-meter"
                              min={0}
                              max={100}
                              value={game.acceptance}
                              aria-label={game.label + " acceptance"}
                            >
                              {game.acceptance}%
                            </meter>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="section-note">
          Acceptance is the percentage of votes marked “Valid excuse.”
        </p>
      </section>

      <section className="admin-section" aria-labelledby="top-excuses-heading">
        <div className="collection-heading">
          <h2 id="top-excuses-heading">Most accepted excuses</h2>
          <p>Top five · Ranked by Valid excuse votes</p>
        </div>

        {leaderboardError ? (
          <p role="alert">Could not load the leaderboard.</p>
        ) : topExcuses.length === 0 ? (
          <p className="empty-state">
            No excuses have received a Valid excuse vote yet.
          </p>
        ) : (
          <div
            className="table-scroll"
            role="region"
            aria-labelledby="top-excuses-heading"
            tabIndex={0}
          >
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Excuse</th>
                  <th scope="col">Game</th>
                  <th scope="col">Character</th>
                  <th scope="col">Valid</th>
                  <th scope="col">Skill issue</th>
                </tr>
              </thead>
              <tbody>
                {topExcuses.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <span className="rank-number">{index + 1}</span>
                    </td>
                    <td className="leaderboard-excuse">{item.excuse}</td>
                    <td>
                      <span className="game-badge" data-game={item.game}>
                        {gameDefinitions.find(
                          (game) => game.value === item.game,
                        )?.label ?? item.game}
                      </span>
                    </td>
                    <td>{item.character_name || "—"}</td>
                    <td>{Number(item.valid_count)}</td>
                    <td>{Number(item.skill_issue_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
