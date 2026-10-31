"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase/server";

export type TermState = { error?: string; message?: string };

export async function saveTerm(_previous: TermState, form: FormData): Promise<TermState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in again." };
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("is_superadmin").eq("id", user.id).single();
  if (profileError || profile?.is_superadmin !== true) return { error: "Administrator access required." };

  const id = String(form.get("id") ?? "").trim();
  if (id && (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807"))) return { error: "Invalid term ID." };
  const intent = String(form.get("intent") ?? "save");
  if (intent !== "save" && intent !== "delete") return { error: "Invalid action." };

  if (intent === "delete") {
    if (!id || form.get("confirm_delete") !== "on") return { error: "Select the confirmation checkbox before deleting." };
    const { data, error } = await supabase.from("terms").delete().eq("id", id).select("id").single();
    if (error || !data) return { error: "Could not delete the term. Refresh and try again." };
  } else {
    const term = String(form.get("term") ?? "").trim();
    const definition = String(form.get("definition") ?? "").trim();
    const example = String(form.get("example") ?? "").trim();
    if (!term || term.length > 100) return { error: "Enter a term between 1 and 100 characters." };
    if (!definition || definition.length > 2000) return { error: "Enter a definition between 1 and 2,000 characters." };
    if (example.length > 2000) return { error: "Keep the example within 2,000 characters." };
    const values = { term, definition, example: example || null, updated_at: new Date().toISOString() };
    const result = id
      ? await supabase.from("terms").update(values).eq("id", id).select("id").single()
      : await supabase.from("terms").insert(values).select("id").single();
    if (result.error?.code === "23505") return { error: "That term already exists. Edit its existing entry instead." };
    if (result.error || !result.data) return { error: "Could not save the term. Your edits are still here; try again." };
  }
  revalidatePath("/terms");
  return { message: intent === "delete" ? "Term deleted." : id ? "Changes saved." : "Term created." };
}
