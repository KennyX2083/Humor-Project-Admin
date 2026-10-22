import ExcuseGenerator from "./components/excuse-generator";
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "../lib/supabase/server";
import GoogleSignInButton from "./components/google-sign-in-button";
import SignOutButton from "./components/google-sign-out-button";
import { revalidatePath } from "next/cache";
import DeleteExcuseButton from "./components/delete-excuse-button";
import { redirect } from "next/navigation";
import AdminListControls from "./components/admin-list-controls";

type AdminSearchParams = Record<string, string | string[] | undefined>;

type ExcuseRow = {
  id: string;
  game: string;
  character_name: string | null;
  situation: string | null;
  excuse: string;
  created_at: string;
  valid_count: number;
  skill_issue_count: number;
  total_count: number;
};

async function updateExcuse(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Sign in required.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.is_superadmin !== true) {
    throw new Error("Administrator access required.");
  }

  const id = String(formData.get("id") ?? "").trim();
  const excuse = String(formData.get("excuse") ?? "").trim();

  if (!id || !excuse || excuse.length > 5000) {
    throw new Error("Enter an excuse between 1 and 5,000 characters.");
  }

  const { data, error } = await supabase
    .from("excuses")
    .update({ excuse })
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Could not save the excuse.");
  }

  revalidatePath("/");
}

export default function Home({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <main className="admin-shell">
      <header className="site-header">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            e.
          </span>
          Excuse Queue
        </a>
        <span className="section-code">Admin / Control room</span>
      </header>
      <section className="hero" aria-labelledby="admin-title">
        <p className="eyebrow">The post-match management department</p>
        <h1 id="admin-title">
          Good excuses.
          <br />
          <span>Under control.</span>
        </h1>
        <p className="hero-description">
          Review the players. Manage their defenses. Keep the queue in order.
        </p>
      </section>
      <div className="admin-content">
        <Suspense
          fallback={
            <p className="empty-state" role="status">
              Checking login…
            </p>
          }
        >
          <LoginStatus searchParams={searchParams} />
        </Suspense>
      </div>
      <footer className="site-footer">Excuse Queue / Administration</footer>
    </main>
  );
}

async function LoginStatus({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, is_superadmin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return (
        <>
          <p>Could not verify admin permissions.</p>
          <SignOutButton />
        </>
      );
    }

    if (profile.is_superadmin !== true) {
      return (
        <>
          <p>Access denied. This account is not an administrator.</p>
          <SignOutButton />
        </>
      );
    }

    const params = await searchParams;

    function pick(key: string, allowed: string[], fallback: string) {
      const value = params[key];

      return typeof value === "string" && allowed.includes(value)
        ? value
        : fallback;
    }

    function readPage(key: string) {
      const value = params[key];
      const number = Number(typeof value === "string" ? value : "1");

      return Number.isSafeInteger(number) && number >= 1 && number <= 2147483647
        ? number
        : 1;
    }

    const games = ["all", "valorant", "league", "overwatch"];
    const eGame = pick("e_game", games, "all");
    const eSort = pick("e_sort", ["newest", "valid", "skill"], "newest");
    const eScope = pick("e_scope", ["all", "mine"], "all");
    const ePage = readPage("e_page");
    const vGame = pick("v_game", games, "all");
    const vSort = pick("v_sort", ["newest", "oldest"], "newest");
    const vScope = pick("v_scope", ["all", "mine"], "all");
    const vRating = pick("v_rating", ["all", "valid", "skill"], "all");
    const vPage = readPage("v_page");
    const uPage = readPage("u_page");

    function resetPage(prefix: "u" | "e" | "v") {
      const next = new URLSearchParams();

      for (const [key, value] of Object.entries(params)) {
        if (key === `${prefix}_page`) continue;

        if (typeof value === "string") {
          next.set(key, value);
        } else if (Array.isArray(value)) {
          value.forEach((entry) => next.append(key, entry));
        }
      }

      const query = next.toString();
      redirect(query ? `/?${query}` : "/");
    }
    const userStart = (uPage - 1) * 12;

    const {
      data: profiles,
      error: usersError,
      count: userCount,
    } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, is_superadmin", {
        count: "exact",
      })
      .order("first_name", { ascending: true })
      .order("id", { ascending: true })
      .range(userStart, userStart + 11);

    if (
      uPage > 1 &&
      (usersError?.code === "PGRST103" || (!usersError && !profiles?.length))
    ) {
      resetPage("u");
    }

    const userPages = Math.max(1, Math.ceil((userCount ?? 0) / 12));
    const feedResult = await supabase.rpc("get_scoped_excuse_feed", {
      p_game: eGame,
      p_sort: eSort,
      p_page: ePage,
      p_scope: eScope,
    });
    const invalidFeed =
      feedResult.data !== null && !Array.isArray(feedResult.data);
    const excusesError =
      feedResult.error ||
      (invalidFeed ? new Error("Unexpected excuse response.") : null);
    const excuses: ExcuseRow[] =
      !excusesError && Array.isArray(feedResult.data) ? feedResult.data : [];

    if (!excusesError && excuses.length === 0 && ePage > 1) {
      resetPage("e");
    }
    const excuseTotal = Number(excuses[0]?.total_count ?? 0);
    const excusePages = Math.max(1, Math.ceil(excuseTotal / 12));
    let votesQuery = supabase
      .from("excuse_votes")
      .select("id, excuse_id, user_id, vote, created_at, excuses!inner(game)", {
        count: "exact",
      });

    if (vGame !== "all") {
      votesQuery = votesQuery.eq("excuses.game", vGame);
    }

    if (vScope === "mine") {
      votesQuery = votesQuery.eq("user_id", user.id);
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

    if (!votesError && !votes?.length && vPage > 1) {
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
    const statsResults = await Promise.all([
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
    const name =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      "administrator";

    return (
      <>
        <div className="admin-toolbar">
          <p>Welcome, {name}!</p>
          <SignOutButton />
        </div>

        <section className="admin-section" aria-labelledby="stats-heading">
          <div className="collection-heading">
            <h2 id="stats-heading">Queue overview</h2>
            <p>All data · Independent of table filters</p>
          </div>

          {!statsReady ? (
            <p role="alert">Could not load dashboard statistics.</p>
          ) : (
            <dl>
              <dt>User profiles</dt>
              <dd>{userCount}</dd>

              <dt>Published excuses</dt>
              <dd>{totalExcuses}</dd>

              <dt>Total votes</dt>
              <dd>{totalVotes}</dd>

              <dt>Valid excuse votes</dt>
              <dd>{validVotes}</dd>

              <dt>Skill issue votes</dt>
              <dd>{skillVotes}</dd>

              <dt>Votes accepting the excuse</dt>
              <dd>
                {validPercentage === null
                  ? "No ratings yet"
                  : `${validPercentage}%`}
              </dd>
            </dl>
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
            <table>
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
                    <th scope="row">{game.label}</th>

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
                          {game.acceptance === null
                            ? "No ratings yet"
                            : `${game.acceptance}%`}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>Acceptance is the percentage of votes marked “Valid excuse.”</p>
        </section>

        <section
          className="admin-section"
          aria-labelledby="top-excuses-heading"
        >
          <div className="collection-heading">
            <h2 id="top-excuses-heading">Most accepted excuses</h2>
            <p>Top five · Ranked by Valid excuse votes</p>
          </div>

          {leaderboardError ? (
            <p role="alert">Could not load the leaderboard.</p>
          ) : topExcuses.length === 0 ? (
            <p>No excuses have received a Valid excuse vote yet.</p>
          ) : (
            <div
              className="table-scroll"
              role="region"
              aria-labelledby="top-excuses-heading"
              tabIndex={0}
            >
              <table>
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
                      <td>{index + 1}</td>
                      <td className="situation-cell">{item.excuse}</td>
                      <td>
                        {gameDefinitions.find(
                          (game) => game.value === item.game,
                        )?.label ?? item.game}
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

        <section className="admin-section" aria-labelledby="users-heading">
          <div className="collection-heading">
            <h2 id="users-heading">Players / Users</h2>
            <p>{userCount ?? 0} profiles · Read only</p>
          </div>

          <AdminListControls kind="users" page={uPage} totalPages={userPages} />

          {usersError ? (
            <p>Could not load users.</p>
          ) : (
            <div
              className="table-scroll"
              role="region"
              aria-labelledby="users-heading"
              tabIndex={0}
            >
              <table className="users-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">User ID</th>
                    <th scope="col">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles?.map((person) => (
                    <tr key={person.id}>
                      <td>
                        {[person.first_name, person.last_name]
                          .filter(Boolean)
                          .join(" ") || "Unnamed user"}
                      </td>
                      <td className="user-id">{person.id}</td>
                      <td>
                        <span
                          className="role-badge"
                          data-admin={person.is_superadmin}
                        >
                          {person.is_superadmin ? "Administrator" : "User"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ExcuseGenerator />

        <section className="admin-section" aria-labelledby="excuses-heading">
          <div className="collection-heading">
            <h2 id="excuses-heading">The review queue / Excuses</h2>
            <p>{excuseTotal} matching excuses · Save changes to publish</p>
          </div>

          <AdminListControls
            kind="excuses"
            game={eGame}
            sort={eSort}
            scope={eScope}
            page={ePage}
            totalPages={excusePages}
          />

          {excusesError ? (
            <p role="alert">Could not load excuses.</p>
          ) : !excuses?.length ? (
            <p>No excuses yet.</p>
          ) : (
            <div
              className="table-scroll"
              role="region"
              aria-labelledby="excuses-heading"
              tabIndex={0}
            >
              <table className="excuses-table">
                <thead>
                  <tr>
                    <th scope="col">Game</th>
                    <th scope="col">Character</th>
                    <th scope="col">Situation</th>
                    <th scope="col">Excuse</th>
                    <th scope="col">Created</th>
                    <th scope="col">Valid</th>
                    <th scope="col">Skill Issue</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {excuses.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="game-badge" data-game={item.game}>
                          {item.game}
                        </span>
                      </td>
                      <td>{item.character_name || "—"}</td>
                      <td className="situation-cell">
                        {item.situation || "—"}
                      </td>
                      <td>
                        <form action={updateExcuse} className="excuse-form">
                          <input type="hidden" name="id" value={item.id} />

                          <textarea
                            name="excuse"
                            aria-label={`Edit excuse ${item.id}`}
                            defaultValue={item.excuse}
                            required
                            maxLength={5000}
                            rows={3}
                          />

                          <button type="submit">Save</button>
                        </form>
                      </td>
                      <td className="created-date">
                        {new Date(item.created_at).toISOString().slice(0, 10)}
                      </td>
                      <td>{Number(item.valid_count)}</td>
                      <td>{Number(item.skill_issue_count)}</td>
                      <td>
                        <DeleteExcuseButton id={item.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-section" aria-labelledby="votes-heading">
          <div className="collection-heading">
            <h2 id="votes-heading">Votes / Ratings</h2>
            <p>{voteCount ?? 0} matching votes · Read only</p>
          </div>

          <AdminListControls
            kind="votes"
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
            <p>No votes yet.</p>
          ) : (
            <div
              className="table-scroll"
              role="region"
              aria-labelledby="votes-heading"
              tabIndex={0}
            >
              <table>
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
                        {item.vote === 1
                          ? "Valid excuse"
                          : item.vote === -1
                            ? "Skill issue"
                            : "Unknown rating"}
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
        </section>
      </>
    );
  }

  return (
    <>
      <GoogleSignInButton />
      {error && <p>Could not verify your login. Try signing in again.</p>}
    </>
  );
}
