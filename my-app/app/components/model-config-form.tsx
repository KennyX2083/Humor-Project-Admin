"use client";

import { useActionState, useId, useState } from "react";
import { saveModelConfig, type ConfigState } from "../model-config-action";

export type ProviderOption = { id: number; name: string };
export type ConfigRecord = {
  id: number;
  name: string;
  provider_id?: number;
  model_identifier?: string;
  is_enabled?: boolean;
};

export default function ModelConfigForm({ kind, record, providers = [] }: {
  kind: "provider" | "model";
  record?: ConfigRecord;
  providers?: ProviderOption[];
}) {
  const prefix = useId();
  const [name, setName] = useState(record?.name ?? "");
  const [provider, setProvider] = useState(String(record?.provider_id ?? providers[0]?.id ?? ""));
  const [identifier, setIdentifier] = useState(record?.model_identifier ?? "");
  const [enabled, setEnabled] = useState(record?.is_enabled ?? true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [state, action, pending] = useActionState(async (previous: ConfigState, form: FormData) => {
    const result = await saveModelConfig(previous, form);
    if (result.message && !record) {
      setName("");
      setIdentifier("");
      setEnabled(true);
    }
    setConfirmDelete(false);
    return result;
  }, {});

  return <form action={action} className="config-form">
    <input type="hidden" name="kind" value={kind} />
    {record ? <input type="hidden" name="id" value={record.id} /> : null}
    <fieldset disabled={pending}>
      <legend className="sr-only">{record ? `Edit ${kind} ${record.id}` : `Create ${kind}`}</legend>
      <label htmlFor={`${prefix}-name`}>Name
        <input id={`${prefix}-name`} name="name" value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
      </label>
      {kind === "model" ? <>
        <label htmlFor={`${prefix}-provider`}>Provider
          <select id={`${prefix}-provider`} name="provider_id" value={provider} onChange={e => setProvider(e.target.value)} required>
            <option value="">Choose a provider</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name} (#{p.id})</option>)}
          </select>
        </label>
        <label htmlFor={`${prefix}-identifier`}>Model identifier
          <input id={`${prefix}-identifier`} name="model_identifier" value={identifier} onChange={e => setIdentifier(e.target.value)} required maxLength={200} placeholder="gemini-3.5-flash-lite" />
        </label>
        <label className="config-checkbox" htmlFor={`${prefix}-enabled`}>
          <input id={`${prefix}-enabled`} type="checkbox" name="is_enabled" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> Enabled
        </label>
      </> : null}
      <button type="submit" name="intent" value="save" disabled={kind === "model" && !providers.length}>
        {pending ? "Working..." : record ? "Save changes" : `Create ${kind}`}
      </button>
      {record ? <div className="config-delete">
        <label className="config-checkbox" htmlFor={`${prefix}-delete`}>
          <input id={`${prefix}-delete`} type="checkbox" name="confirm_delete" checked={confirmDelete} onChange={e => setConfirmDelete(e.target.checked)} /> Confirm deletion of {record.name}
        </label>
        <button type="submit" name="intent" value="delete" formNoValidate disabled={!confirmDelete}>Delete {kind}</button>
      </div> : null}
    </fieldset>
    {state.error ? <p role="alert">{state.error}</p> : null}
    <p role="status" aria-live="polite">{pending ? "Saving..." : state.message ?? ""}</p>
  </form>;
}
