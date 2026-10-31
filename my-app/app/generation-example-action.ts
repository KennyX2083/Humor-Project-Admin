"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase/server";

export type ExampleState = { error?: string; message?: string };

export async function saveGenerationExample(_previous: ExampleState, form: FormData): Promise<ExampleState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in again." };
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("is_superadmin").eq("id", user.id).single();
  if (profileError || profile?.is_superadmin !== true) return { error: "Administrator access required." };
  const id = String(form.get("id") ?? "").trim();
  if (id && (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807"))) return { error: "Invalid example ID." };
  const intent = String(form.get("intent") ?? "save");
  if (intent !== "save" && intent !== "delete") return { error: "Invalid action." };

  if (intent === "delete") {
    if (!id || form.get("confirm_delete") !== "on") return { error: "Select the confirmation checkbox before deleting." };
    const { data, error } = await supabase.from("ai_generation_examples").delete().eq("id", id).select("id").single();
    if (error || !data) return { error: "Could not delete the example. Refresh and try again." };
  } else {
    const title = String(form.get("title") ?? "").trim();
    const game = String(form.get("game") ?? "");
    const character = String(form.get("character_name") ?? "").trim();
    const situation = String(form.get("situation") ?? "").trim();
    const excuse = String(form.get("example_excuse") ?? "").trim();
    if (!title || title.length > 100) return { error: "Enter a title between 1 and 100 characters." };
    if (!["valorant", "league", "overwatch"].includes(game)) return { error: "Choose a supported game." };
    if (character.length > 100) return { error: "Keep the character name within 100 characters." };
    if (situation.length < 5 || situation.length > 1000) return { error: "Enter a situation between 5 and 1,000 characters." };
    if (!excuse || excuse.length > 4000) return { error: "Enter an example excuse between 1 and 4,000 characters." };
    const values = { title, game, character_name: character || null, situation, example_excuse: excuse, updated_at: new Date().toISOString() };
    const result = id
      ? await supabase.from("ai_generation_examples").update(values).eq("id", id).select("id").single()
      : await supabase.from("ai_generation_examples").insert(values).select("id").single();
    if (result.error || !result.data) return { error: "Could not save the example. Your edits are still here; try again." };
  }
  revalidatePath("/generation-examples");
  return { message: intent === "delete" ? "Example deleted." : id ? "Changes saved." : "Example created." };
}
