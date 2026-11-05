import type { AdminViewProps, ExcuseRow } from "../../../lib/admin-page-types";
import { listParams } from "../../../lib/admin-list-params";
import AdminListControls from "../admin-list-controls";
import AdminEditForm from "../admin-edit-form";
import "./week-seven.css";
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
      <details className="admin-section admin-create-panel">
        <summary>Create excuse</summary>
        <AdminEditForm />
      </details>

      <section className="admin-section" aria-labelledby="excuses-heading">
        <div className="collection-heading">
          <h2 id="excuses-heading">Excuses / Ratings</h2>
          <p>{excuseTotal} matching excuses · Manage published excuses</p>
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
          <div className="table-scroll" role="region" aria-labelledby="excuses-heading" tabIndex={0}>
            <table className="excuse-ratings-table">
              <thead>
                <tr>
                  <th scope="col">Excuse</th>
                  <th scope="col">Game / Character</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Created</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {excuses.map((item) => {
                  const valid = Number(item.valid_count);
                  const skill = Number(item.skill_issue_count);
                  const total = valid + skill;
                  return (
                    <tr key={item.id}>
                      <td className="situation-cell">
                        <p>{item.excuse}</p>
                        <details className="excuse-disclosure">
                          <summary>
                            <span>Situation</span>
                            <svg className="excuse-disclosure-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </summary>
                          <div className="excuse-disclosure-body excuse-situation-body">
                            <p>{item.situation || "No situation provided"}</p>
                          </div>
                        </details>
                      </td>
                      <td>
                        {item.game === "league" ? "League of Legends" : item.game === "valorant" ? "Valorant" : item.game === "overwatch" ? "Overwatch" : item.game}
                        <br />{item.character_name || "Unassigned character"}
                      </td>
                      <td className="excuse-rating-cell">
                        <div className="excuse-rating-stack">
                          <span className="excuse-rating-pill" data-rating="valid"><span>Valid excuse</span><strong>{valid}</strong></span>
                          <span className="excuse-rating-pill" data-rating="skill"><span>Skill issue</span><strong>{skill}</strong></span>
                        </div>
                        <p className="excuse-rating-summary">{total ? `${Math.round(valid / total * 100)}% valid · ${total} ratings` : "No ratings yet"}</p>
                      </td>
                      <td className="created-date">
                        <time dateTime={item.created_at}>{new Date(item.created_at).toISOString().slice(0, 10)}</time>
                      </td>
                      <td>
                        <details className="excuse-disclosure excuse-disclosure--editor">
                          <summary>
                            <span>Edit excuse</span>
                            <svg className="excuse-disclosure-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </summary>
                          <div className="excuse-disclosure-body">
                            <EditExcuseForm id={item.id} initialExcuse={item.excuse} />
                          </div>
                        </details>
                        <DeleteExcuseButton id={item.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
