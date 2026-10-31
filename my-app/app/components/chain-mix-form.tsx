"use client";

import { useActionState, useId, useState } from "react";
import { updateChainMix } from "../update-chain-mix-action";

export default function ChainMixForm({ chainId, weight }: { chainId: number; weight: number }) {
  const id = useId();
  const [value, setValue] = useState(String(weight));
  const [state, action, pending] = useActionState(updateChainMix, {});
  return <form action={action} className="config-form">
    <input type="hidden" name="chain_id" value={chainId} />
    <fieldset disabled={pending}>
      <legend className="sr-only">Update chain {chainId} weight</legend>
      <label htmlFor={id}>Weight (0 pauses this chain)
        <input id={id} type="number" name="weight" value={value} onChange={e => setValue(e.target.value)} min={0} max={10000} step={1} required />
      </label>
      <button type="submit">{pending ? "Saving..." : "Save weight"}</button>
    </fieldset>
    {state.error ? <p role="alert">{state.error}</p> : null}
    <p role="status" aria-live="polite">{pending ? "Saving..." : state.message ?? ""}</p>
  </form>;
}
