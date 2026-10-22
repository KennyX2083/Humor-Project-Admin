import type { AdminViewProps, ExcuseRow } from "../../../lib/admin-page-types";
import { listParams } from "../../../lib/admin-list-params";
import AdminListControls from "../admin-list-controls";
import ExcuseGenerator from "../excuse-generator";
import EditExcuseForm from "../edit-excuse-form";
import DeleteExcuseButton from "../delete-excuse-button";
export default async function ExcusesView({ supabase, params }: AdminViewProps) {
  const { pick, readPage, resetPage } = listParams(params, "/excuses");
  const eGame = pick("e_game", ["all", "valorant", "league", "overwatch"], "all");
  const eSort = pick("e_sort", ["newest", "valid", "skill"], "newest");
  const eScope = pick("e_scope", ["all", "mine"], "all");
  const ePage = readPage("e_page");
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

  return (
    <>
      <ExcuseGenerator />

      <section className="admin-section" aria-labelledby="excuses-heading">
        <div className="collection-heading">
          <h2 id="excuses-heading">The review queue</h2>
          <p>{excuseTotal} matching excuses · Save changes to publish</p>
        </div>

        <AdminListControls
          kind="excuses"
          placement="filters"
          game={eGame}
          sort={eSort}
          scope={eScope}
          page={ePage}
          totalPages={excusePages}
        />

        {excusesError ? (
          <p role="alert">Could not load excuses.</p>
        ) : !excuses?.length ? (
          <p className="empty-state">No excuses yet.</p>
        ) : (
          <ul className="excuse-grid" aria-label="Published excuses">
            {excuses.map((item) => (
              <li key={item.id}>
                <article
                  className="excuse-card"
                  aria-labelledby={"excuse-title-" + item.id}
                >
                  <div className="excuse-card-heading">
                    <span className="game-badge" data-game={item.game}>
                      {item.game === "league"
                        ? "League of Legends"
                        : item.game === "valorant"
                          ? "Valorant"
                          : item.game === "overwatch"
                            ? "Overwatch"
                            : item.game}
                    </span>
                    <time className="created-date" dateTime={item.created_at}>
                      {new Date(item.created_at).toISOString().slice(0, 10)}
                    </time>
                  </div>

                  <h3 id={"excuse-title-" + item.id}>
                    {item.character_name || "Unassigned character"}
                  </h3>

                  <div className="incident-report">
                    <p className="report-label">Incident report</p>
                    <p>{item.situation || "—"}</p>
                  </div>

                  <div className="excuse-editor">
                    <p className="report-label">Your defense</p>
                    <EditExcuseForm
                      id={item.id}
                      initialExcuse={item.excuse}
                    />
                  </div>

                  <div className="excuse-card-footer">
                    <div className="verdict-counts">
                      <span data-verdict="valid">
                        <strong>{Number(item.valid_count)}</strong> Valid excuse
                      </span>
                      <span data-verdict="skill">
                        <strong>{Number(item.skill_issue_count)}</strong> Skill issue
                      </span>
                    </div>
                    <DeleteExcuseButton id={item.id} />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
        <AdminListControls
          kind="excuses"
          placement="pagination"
          game={eGame}
          sort={eSort}
          scope={eScope}
          page={ePage}
          totalPages={excusePages}
        />
      </section>
    </>
  );
}
