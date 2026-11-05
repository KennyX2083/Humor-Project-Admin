import type { AdminViewProps } from "../../../lib/admin-page-types";
import UserRoleForm from "../user-role-form";
import "./week-seven.css";
import { listParams } from "../../../lib/admin-list-params";
import AdminListControls from "../admin-list-controls";

type UserProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  is_superadmin: boolean;
};

type UserEmail = { id: string; email: string | null };

function isUserEmail(value: unknown): value is UserEmail {
  return typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "string" &&
    "email" in value && (typeof value.email === "string" || value.email === null);
}

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
  .range(userStart, userStart + 11)
  .returns<UserProfile[]>();

if (
  uPage > 1 &&
  (usersError?.code === "PGRST103" || (!usersError && !profiles?.length))
) {
  resetPage("u");
}

const userPages = Math.max(1, Math.ceil((userCount ?? 0) / 12));

const emailResult = profiles?.length
  ? await supabase.rpc("admin_get_user_emails", {
      p_user_ids: profiles.map((person) => person.id),
    })
  : { data: [], error: null };
const rawEmails: unknown = emailResult.data;
const userEmails: UserEmail[] = Array.isArray(rawEmails)
  ? rawEmails.filter(isUserEmail)
  : [];
const emailsError = emailResult.error ||
  (!Array.isArray(rawEmails) || userEmails.length !== rawEmails.length
    ? new Error("Unexpected email lookup response.")
    : null);
const emailsById = new Map<string, string | null>(
  userEmails.map((person): [string, string | null] => [person.id, person.email]),
);

  return (
    <>
      <section className="admin-section" aria-labelledby="users-heading">
        <div className="collection-heading">
          <h2 id="users-heading">Players / Users</h2>
          <p>{userCount ?? 0} profiles · Manage user roles</p>
        </div>

        <AdminListControls
          kind="users"
          placement="filters"
          page={uPage}
          totalPages={userPages}
        />

        {emailsError ? <p role="alert">Could not load email addresses. Check that the administrator email lookup function is installed.</p> : null}

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
                  <th scope="col">Email</th>
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
                    <td className="user-email">{emailsError ? "Unavailable" : emailsById.get(person.id) || "No email"}</td>
                    <td className="user-id">{person.id}</td>
                    <td>
                      <UserRoleForm
                        key={`${person.id}:${person.is_superadmin}`}
                        person={person}
                        name={[person.first_name, person.last_name].filter(Boolean).join(" ") || person.id}
                      />
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
