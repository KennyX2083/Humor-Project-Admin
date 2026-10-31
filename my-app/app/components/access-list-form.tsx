"use client";

import { useActionState, useId, useState } from "react";
import { saveAccessList, type AccessListState } from "../access-list-action";
import { accessLists, type AccessListKind, type AccessListRecord } from "../../lib/signup-access-list";

export default function AccessListForm({ kind, record }: { kind: AccessListKind; record?: AccessListRecord }) {
  const config = accessLists[kind];
  const prefix = useId();
  const [value, setValue] = useState(record?.value ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [state, action, pending] = useActionState(async (previous: AccessListState, form: FormData) => {
    const result = await saveAccessList(previous, form);
    if (result.message && !record) { setValue(""); setNotes(""); }
    if (result.message && record) setValue(value.trim().toLowerCase());
    setConfirmDelete(false);
    return result;
  }, {});
  return <form action={action} className="config-form term-form">
    <input type="hidden" name="kind" value={kind} />
    {record ? <input type="hidden" name="id" value={record.id} /> : null}
    <fieldset disabled={pending}>
      <legend className="sr-only">{record ? `Edit ${config.label} ${record.id}` : `Add ${config.label}`}</legend>
      <label htmlFor={`${prefix}-value`}>{kind === "domain" ? "Domain" : "Email address"}
        <input id={`${prefix}-value`} name="value" type={kind === "email" ? "email" : "text"} value={value} onChange={e => setValue(e.target.value)} required maxLength={kind === "domain" ? 253 : 254} autoCapitalize="none" spellCheck={false} placeholder={kind === "domain" ? "columbia.edu" : "student@columbia.edu"} />
      </label>
      <label htmlFor={`${prefix}-notes`}>Notes (optional)<textarea id={`${prefix}-notes`} name="notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} rows={3} /></label>
      <button type="submit" name="intent" value="save">{pending ? "Working..." : record ? "Save changes" : `Add ${config.label}`}</button>
      {record ? <div className="config-delete">
        <label className="config-checkbox" htmlFor={`${prefix}-delete`}><input id={`${prefix}-delete`} type="checkbox" name="confirm_delete" checked={confirmDelete} onChange={e => setConfirmDelete(e.target.checked)} /> Confirm deletion of {record.value}</label>
        <button type="submit" name="intent" value="delete" formNoValidate disabled={!confirmDelete}>Delete entry</button>
      </div> : null}
    </fieldset>
    {state.error ? <p role="alert">{state.error}</p> : null}
    <p role="status" aria-live="polite">{pending ? "Saving..." : state.message ?? ""}</p>
  </form>;
}
