"use client";

import { useActionState, useId, useState } from "react";
import { saveAdminEdit, type AdminEditState } from "../admin-edit-action";
import { gameCharacters } from "../../lib/game-characters";
import CharacterAutocomplete from "./character-autocomplete";

const initialState: AdminEditState = {};

export default function AdminEditForm() {
  const [game, setGame] = useState("valorant");
  const [situation, setSituation] = useState("");
  const [excuse, setExcuse] = useState("");
  const [characterReset, setCharacterReset] = useState(0);
  const [characterError, setCharacterError] = useState("");
  const id = useId();
  const [state, action, pending] = useActionState(async (previous: AdminEditState, data: FormData) => {
    const result = await saveAdminEdit(previous, data);
    if (result.message) {
      setSituation("");
      setExcuse("");
      setCharacterReset((count) => count + 1);
    }
    return result;
  }, initialState);

  return (
    <form action={action} className="admin-create-excuse" onSubmit={(event) => {
      const character = String(new FormData(event.currentTarget).get("character_name") ?? "").trim();
      const valid = !character || (gameCharacters[game] ?? []).some((name) => name.toLowerCase() === character.toLowerCase());
      setCharacterError(valid ? "" : "Choose a character from this game's suggestions, or leave the field blank.");
      if (!valid) event.preventDefault();
    }}>
      <input type="hidden" name="kind" value="excuse" />
      <fieldset disabled={pending} className="admin-create-fields">
        <legend className="sr-only">New excuse details</legend>
        <p className="admin-create-description">Add a written excuse to the review queue. Choose a game, describe the incident, and enter the excuse.</p>
        <fieldset className="game-picker">
          <legend>Choose a game</legend>
          {[{ value: "valorant", label: "Valorant" }, { value: "league", label: "League of Legends" }, { value: "overwatch", label: "Overwatch" }].map((option) => (
            <label className="game-choice" key={option.value}>
              <input type="radio" name="game" value={option.value} checked={game === option.value} onChange={() => { setGame(option.value); setCharacterError(""); }} />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
        <div className="queue-field admin-create-character">
          <label htmlFor="character">{game === "valorant" ? "Agent" : game === "league" ? "Champion" : "Hero"}<span>optional</span></label>
          <CharacterAutocomplete key={`${game}-${characterReset}`} name="character_name" options={gameCharacters[game] ?? []} placeholder={game === "valorant" ? "Search agents, e.g. Jett" : game === "league" ? "Search champions, e.g. Yasuo" : "Search heroes, e.g. Mercy"} />
          <p className="admin-create-hint">Select a suggestion, or leave blank. Characters must belong to the selected game.</p>
        </div>
        <div className="queue-field admin-create-situation">
          <label htmlFor={`${id}-situation`}>Situation<span>required</span></label>
          <textarea id={`${id}-situation`} name="situation" value={situation} onChange={(event) => setSituation(event.target.value)} required minLength={5} maxLength={1000} rows={3} placeholder="Describe what went wrong…" aria-describedby={`${id}-situation-count`} />
          <span className="admin-create-count" id={`${id}-situation-count`}>{situation.length}/1,000 characters · minimum 5</span>
        </div>
        <div className="queue-field admin-create-text">
          <label htmlFor={`${id}-excuse`}>Excuse<span>required</span></label>
          <textarea id={`${id}-excuse`} name="excuse" value={excuse} onChange={(event) => setExcuse(event.target.value)} required maxLength={4000} rows={4} placeholder="Write the excuse you want to publish…" aria-describedby={`${id}-excuse-count`} />
          <span className="admin-create-count" id={`${id}-excuse-count`}>{excuse.length}/4,000 characters</span>
        </div>
        <div className="admin-create-footer"><p>This publishes the excuse immediately.</p><button type="submit" className="button-primary">{pending ? "Creating…" : "Create excuse"}</button></div>
      </fieldset>
      <p className="admin-create-feedback" role="status" aria-live="polite">{pending ? "Creating excuse…" : characterError ? "" : state.message}</p>
      {!pending && (characterError || state.error) ? <p className="queue-error" role="alert">{characterError || state.error}</p> : null}
    </form>
  );
}
