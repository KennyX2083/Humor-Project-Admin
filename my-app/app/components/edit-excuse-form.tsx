"use client";

import { useActionState, useId, useState } from "react";
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
  const fieldId = useId();
  const [state, action, pending] = useActionState(
    updateExcuse,
    initialState,
  );

  const saved =
    state.savedText !== undefined &&
    state.savedText === text.trim();
  const baseline = state.savedText ?? initialExcuse;
  const changed = text.trim() !== baseline.trim();

  return (
    <form action={action} className="excuse-form">
      <input type="hidden" name="id" value={id} />

      <label className="excuse-edit-label" htmlFor={fieldId}>Excuse text</label>
      <textarea
        id={fieldId}
        name="excuse"
        aria-describedby={`${fieldId}-count`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        readOnly={pending}
        required
        maxLength={4000}
        rows={5}
      />
      <p className="excuse-edit-count" id={`${fieldId}-count`}>{text.length}/4,000 characters</p>

      <div className="save-actions">
        <button className="button-primary" type="submit" disabled={pending || !changed || !text.trim()}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button className="excuse-edit-reset" type="button" disabled={pending || !changed} onClick={() => setText(baseline)}>Revert</button>

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
              : changed
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
