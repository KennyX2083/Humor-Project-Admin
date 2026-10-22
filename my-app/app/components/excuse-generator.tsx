"use client";

import { useState, type FormEvent } from "react";
import { gameCharacters } from "../../lib/game-characters";
import CharacterAutocomplete from "./character-autocomplete";
import { useRouter } from "next/navigation";

type ExcuseDraft = {
  id: string;
  game: "valorant" | "league" | "overwatch";
  character_name: string | null;
  situation: string;
  excuse: string;
  created_at: string;
};

export default function ExcuseGenerator() {
  const [game, setGame] = useState("valorant");
  const [situation, setSituation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [characterReset, setCharacterReset] = useState(0);
  const [draft, setDraft] = useState<ExcuseDraft | null>(null);
  const router = useRouter();

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const fields = new FormData(form);

    const character = String(fields.get("character") ?? "").trim();

    const matchingCharacter = (gameCharacters[game] ?? []).find(
      (name) => name.toLowerCase() === character.toLowerCase(),
    );

    if (character && !matchingCharacter) {
      setError(
        "Choose a character from the selected game's suggestions, " +
          "or leave the character field blank.",
      );
      setMessage("");
      return;
    }

    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/excuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game,
          character: matchingCharacter ?? "",
          situation,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not generate an excuse.");
      }

      setDraft(result.draft);
      form.reset();
      setCharacterReset((count) => count + 1);
      setSituation("");
      setMessage("Preview ready. Your excuse has not been published.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setPending(false);
    }
  }

  async function publishDraft() {
    if (!draft || pending) return;

    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/excuses/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not publish your excuse.");
      }

      if (typeof result.excuseId !== "string") {
        throw new Error("Could not confirm publication. Please try again.");
      }

      setDraft(null);
      setMessage("Published! Your excuse is now in the review queue.");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not publish your excuse.",
      );
    } finally {
      setPending(false);
    }
  }

  async function discardDraft() {
    if (!draft || pending) return;

    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/excuses/discard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id }),
      });

      const result = await response.json();

      if (!response.ok || result.discarded !== true) {
        throw new Error(result.error || "Could not discard your draft.");
      }

      setDraft(null);
      setMessage("Draft discarded. You can create a new excuse.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not discard your draft.",
      );
    } finally {
      setPending(false);
    }
  }

  async function regenerateDraft() {
    if (!draft || pending) return;

    const previousDraft = draft;

    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/excuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: previousDraft.game,
          character: previousDraft.character_name ?? "",
          situation: previousDraft.situation,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not regenerate your excuse.");
      }

      if (!result.draft || typeof result.draft.id !== "string") {
        throw new Error("No preview was returned. Please try again.");
      }

      setDraft(result.draft);
      setMessage("New preview ready. Your excuse has not been published.");

      // Remove the previous draft only after its replacement is saved.
      if (result.draft.id !== previousDraft.id) {
        try {
          const cleanupResponse = await fetch("/api/excuses/discard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draftId: previousDraft.id }),
          });

          if (!cleanupResponse.ok) {
            console.warn("Previous draft cleanup failed.");
          }
        } catch {
          console.warn("Previous draft cleanup could not be completed.");
        }
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not regenerate your excuse.",
      );
    } finally {
      setPending(false);
    }
  }

  if (draft) {
    return (
      <section className="queue-generator" aria-labelledby="preview-heading">
        <div className="generator-heading">
          <h2 id="preview-heading">Preview your excuse</h2>
          <span className="section-code">UNPUBLISHED</span>
        </div>

        <article className="joke-card" data-game={draft.game}>
          <span className="joke-number">
            {draft.game === "valorant"
              ? "Valorant"
              : draft.game === "league"
                ? "League of Legends"
                : "Overwatch"}
            {draft.character_name && ` · ${draft.character_name}`}
          </span>

          <div className="incident-report">
            <p className="report-label">Incident report</p>
            <p>{draft.situation}</p>
          </div>

          <p className="report-label">Your defense</p>
          <h3>{draft.excuse}</h3>
        </article>

        <div className="generator-bottom">
          <p>Only you can see this preview until you publish it.</p>

          <div className="preview-actions">
            <button
              className="button-danger"
              type="button"
              disabled={pending}
              onClick={discardDraft}
            >
              Discard draft
            </button>

            <button
              className="button-secondary"
              type="button"
              disabled={pending}
              onClick={regenerateDraft}
            >
              Regenerate
            </button>

            <button
              className="button-primary"
              type="button"
              disabled={pending}
              onClick={publishDraft}
            >
              Publish excuse
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>

        <div className="generation-status" role="status" aria-live="polite">
          {pending ? "Please wait..." : message}
        </div>

        {error && (
          <p className="queue-error" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="queue-generator" aria-labelledby="generator-heading">
      <div className="generator-heading">
        <h2 id="generator-heading">What went wrong?</h2>
        <span className="section-code">NEW REPORT / 01</span>
      </div>

      <form onSubmit={generate}>
        <fieldset className="queue-fields" disabled={pending}>
          <legend className="sr-only">Excuse details</legend>

          <fieldset className="game-picker">
            <legend>Choose your game</legend>

            {[
              { value: "valorant", label: "Valorant" },
              { value: "league", label: "League of Legends" },
              { value: "overwatch", label: "Overwatch" },
            ].map((option) => (
              <label className="game-choice" key={option.value}>
                <input
                  type="radio"
                  name="game"
                  value={option.value}
                  checked={game === option.value}
                  onChange={() => setGame(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="queue-field">
            <label htmlFor="character">
              {game === "valorant"
                ? "Agent"
                : game === "league"
                  ? "Champion"
                  : game === "overwatch"
                    ? "Hero"
                    : "Character"}
              <span>optional</span>
            </label>
            <CharacterAutocomplete
              key={`${game}-${characterReset}`}
              options={gameCharacters[game] ?? []}
              placeholder={
                game === "valorant"
                  ? "e.g. Jett"
                  : game === "league"
                    ? "e.g. Yasuo"
                    : game === "overwatch"
                      ? "e.g. Mercy"
                      : "Enter a character name"
              }
            />
          </div>

          <div className="queue-field">
            <label htmlFor="situation">The incident</label>
            <textarea
              id="situation"
              name="situation"
              placeholder={
                game === "valorant"
                  ? "Flashed my team. Missed every shot. Blamed the ping."
                  : game === "league"
                    ? "Went 0/9. Told everyone I was scaling."
                    : game === "overwatch"
                      ? "Got slept after popping blade."
                      : "Describe what went wrong."
              }
              value={situation}
              onChange={(event) => setSituation(event.target.value)}
              minLength={5}
              maxLength={1000}
              rows={3}
              required
              aria-describedby="situation-count"
            />
            <span className="field-count" id="situation-count">
              {situation.length}/1000
            </span>
          </div>

          <div className="generator-bottom">
            <p>Preview excuse before publishing.</p>
            <button className="button-primary" type="submit">
              {pending ? "Building your defense…" : "Generate excuse"}
              <span aria-hidden="true">{pending ? "…" : "↗"}</span>
            </button>
          </div>
        </fieldset>

        <div className="generation-status" role="status" aria-live="polite">
          {pending ? "Reviewing the incident…" : message}
        </div>

        {error && (
          <p className="queue-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
