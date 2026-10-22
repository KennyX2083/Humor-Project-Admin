"use client";

import { useActionState, useState } from "react";
import {
  updateExcuse,
  type SaveExcuseState,
} from "../update-excuse-action";

const initialState: SaveExcuseState = {};

export default function EditExcuseForm({
  id,
  initialExcuse,
}: {
  id: string;
  initialExcuse: string;
}) {
  const [text, setText] = useState(initialExcuse);
  const [state, action, pending] = useActionState(
    updateExcuse,
    initialState,
  );

  const saved =
    state.savedText !== undefined &&
    state.savedText === text.trim();

  return (
    <form action={action} className="excuse-form">
      <input type="hidden" name="id" value={id} />

      <textarea
        name="excuse"
        aria-label={`Edit excuse ${id}`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        readOnly={pending}
        required
        maxLength={5000}
        rows={3}
      />

      <div className="save-actions">
        <button className="button-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>

        <p
          className="save-feedback"
          data-saved={saved}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {pending
            ? "Saving your changes…"
            : saved
              ? "✓ Saved successfully."
              : text !== initialExcuse
                ? "Unsaved changes."
                : ""}
        </p>
      </div>

      {!pending && state.error && (
        <p role="alert">{state.error}</p>
      )}
    </form>
  );
}
