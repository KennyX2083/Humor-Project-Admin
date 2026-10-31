"use client";

import { useActionState, useId, useState } from "react";
import { saveTerm, type TermState } from "../term-action";

export type TermRecord = { id: number; term: string; definition: string; example: string | null };

export default function TermForm({ record }: { record?: TermRecord }) {
  const prefix = useId();
  const [term, setTerm] = useState(record?.term ?? "");
  const [definition, setDefinition] = useState(record?.definition ?? "");
  const [example, setExample] = useState(record?.example ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [state, action, pending] = useActionState(async (previous: TermState, form: FormData) => {
    const result = await saveTerm(previous, form);
    if (result.message && !record) { setTerm(""); setDefinition(""); setExample(""); }
    setConfirmDelete(false);
    return result;
  }, {});

  return <form action={action} className="config-form term-form">
    {record ? <input type="hidden" name="id" value={record.id} /> : null}
    <fieldset disabled={pending}>
      <legend className="sr-only">{record ? `Edit term ${record.id}` : "Create term"}</legend>
      <label htmlFor={`${prefix}-term`}>Term
        <input id={`${prefix}-term`} name="term" value={term} onChange={e => setTerm(e.target.value)} required maxLength={100} />
      </label>
      <label htmlFor={`${prefix}-definition`}>Definition
        <textarea id={`${prefix}-definition`} name="definition" value={definition} onChange={e => setDefinition(e.target.value)} required maxLength={2000} rows={4} />
      </label>
      <label htmlFor={`${prefix}-example`}>Example (optional)
        <textarea id={`${prefix}-example`} name="example" value={example} onChange={e => setExample(e.target.value)} maxLength={2000} rows={3} />
      </label>
      <button type="submit" name="intent" value="save">{pending ? "Working..." : record ? "Save changes" : "Create term"}</button>
      {record ? <div className="config-delete">
        <label className="config-checkbox" htmlFor={`${prefix}-delete`}>
          <input id={`${prefix}-delete`} type="checkbox" name="confirm_delete" checked={confirmDelete} onChange={e => setConfirmDelete(e.target.checked)} /> Confirm deletion of {record.term}
        </label>
        <button type="submit" name="intent" value="delete" formNoValidate disabled={!confirmDelete}>Delete term</button>
      </div> : null}
    </fieldset>
    {state.error ? <p role="alert">{state.error}</p> : null}
    <p role="status" aria-live="polite">{pending ? "Saving..." : state.message ?? ""}</p>
  </form>;
}
