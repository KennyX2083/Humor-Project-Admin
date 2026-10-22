import type { AdminViewProps } from "../../../lib/admin-page-types";
import { listParams } from "../../../lib/admin-list-params";
import AdminListControls from "../admin-list-controls";
export default async function UsersView({ supabase, params }: AdminViewProps) {
  const { readPage, resetPage } = listParams(params, "/users");
  const uPage = readPage("u_page");
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

  return (
    <>
      <section className="admin-section" aria-labelledby="users-heading">
        <div className="collection-heading">
          <h2 id="users-heading">Players / Users</h2>
          <p>{userCount ?? 0} profiles · Read only</p>
        </div>

        <AdminListControls
          kind="users"
          placement="filters"
          page={uPage}
          totalPages={userPages}
        />

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
        <AdminListControls
          kind="users"
          placement="pagination"
          page={uPage}
          totalPages={userPages}
        />
      </section>
    </>
  );
}
