"use client";

import { useActionState, useState } from "react";
import { saveAdminEdit, type AdminEditState } from "../admin-edit-action";

const initialState: AdminEditState = {};

export default function UserRoleForm({
  person,
  name,
}: {
  person: { id: string; is_superadmin: boolean };
  name: string;
}) {
  const currentRole = person.is_superadmin ? "administrator" : "user";
  const [role, setRole] = useState(currentRole);
  const [state, action, pending] = useActionState(saveAdminEdit, initialState);
  const changed = role !== currentRole;

  return (
    <form action={action} className="user-role-form" aria-label={`Manage role for ${name}`}>
      <input type="hidden" name="kind" value="role" />
      <input type="hidden" name="id" value={person.id} />
      <div className="user-role-controls">
        <div className="user-role-select" data-admin={role === "administrator"}>
          <span className="user-role-dot" aria-hidden="true" />
          <select
            name="role"
            aria-label={`Role for ${name}`}
            value={role}
            disabled={pending}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="user">User</option>
            <option value="administrator">Administrator</option>
          </select>
          <svg className="user-role-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <button className="user-role-save" type="submit" disabled={pending || !changed}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <div className="user-role-feedback" role="status" aria-live="polite">
        {pending ? "Saving role…" : changed ? "Unsaved change" : state.message || ""}
      </div>
      {!pending && state.error ? <p className="user-role-error" role="alert">{state.error}</p> : null}
    </form>
  );
}
