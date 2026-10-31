"use client";

import { useActionState, useId, useState } from "react";
import { saveGenerationExample, type ExampleState } from "../generation-example-action";
import { exampleGames, type GenerationExample } from "../../lib/generation-example";

export default function GenerationExampleForm({ record }: { record?: GenerationExample }) {
  const prefix = useId();
  const [title, setTitle] = useState(record?.title ?? "");
  const [game, setGame] = useState<string>(record?.game ?? "valorant");
  const [character, setCharacter] = useState(record?.character_name ?? "");
  const [situation, setSituation] = useState(record?.situation ?? "");
  const [excuse, setExcuse] = useState(record?.example_excuse ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [state, action, pending] = useActionState(async (previous: ExampleState, form: FormData) => {
    const result = await saveGenerationExample(previous, form);
    if (result.message && !record) { setTitle(""); setCharacter(""); setSituation(""); setExcuse(""); }
    setConfirmDelete(false);
    return result;
  }, {});
  return <form action={action} className="config-form term-form">
    {record ? <input type="hidden" name="id" value={record.id} /> : null}
    <fieldset disabled={pending}>
      <legend className="sr-only">{record ? `Edit generation example ${record.id}` : "Create generation example"}</legend>
      <label htmlFor={`${prefix}-title`}>Title<input id={`${prefix}-title`} name="title" value={title} onChange={e => setTitle(e.target.value)} required maxLength={100} /></label>
      <label htmlFor={`${prefix}-game`}>Game
        <select id={`${prefix}-game`} name="game" value={game} onChange={e => setGame(e.target.value)}>
          {Object.entries(exampleGames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label htmlFor={`${prefix}-character`}>Character (optional)<input id={`${prefix}-character`} name="character_name" value={character} onChange={e => setCharacter(e.target.value)} maxLength={100} /></label>
      <label htmlFor={`${prefix}-situation`}>Situation<textarea id={`${prefix}-situation`} name="situation" value={situation} onChange={e => setSituation(e.target.value)} required minLength={5} maxLength={1000} rows={3} /></label>
      <label htmlFor={`${prefix}-excuse`}>Example excuse<textarea id={`${prefix}-excuse`} name="example_excuse" value={excuse} onChange={e => setExcuse(e.target.value)} required maxLength={4000} rows={4} /></label>
      <button type="submit" name="intent" value="save">{pending ? "Working..." : record ? "Save changes" : "Create example"}</button>
      {record ? <div className="config-delete">
        <label className="config-checkbox" htmlFor={`${prefix}-delete`}><input id={`${prefix}-delete`} type="checkbox" name="confirm_delete" checked={confirmDelete} onChange={e => setConfirmDelete(e.target.checked)} /> Confirm deletion of {record.title}</label>
        <button type="submit" name="intent" value="delete" formNoValidate disabled={!confirmDelete}>Delete example</button>
      </div> : null}
    </fieldset>
    {state.error ? <p role="alert">{state.error}</p> : null}
    <p role="status" aria-live="polite">{pending ? "Saving..." : state.message ?? ""}</p>
  </form>;
}
