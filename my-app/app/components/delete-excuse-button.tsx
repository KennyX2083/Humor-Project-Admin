"use client";

import { useActionState } from "react";
import { deleteExcuse, type DeleteState } from "../delete-excuse-action";

const initialState: DeleteState = {};

export default function DeleteExcuseButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    deleteExcuse,
    initialState,
  );

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Permanently delete this excuse and all its votes?",
        );

        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />

      <button type="submit" disabled={pending}>
        {pending ? "Deleting…" : "Delete"}
      </button>

      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}