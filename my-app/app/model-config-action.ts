"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase/server";

export type ConfigState = { error?: string; message?: string };

function validId(value: string) {
  return /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= BigInt("9223372036854775807");
}

export async function saveModelConfig(_previous: ConfigState, form: FormData): Promise<ConfigState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in again." };
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("is_superadmin").eq("id", user.id).single();
  if (profileError || profile?.is_superadmin !== true) return { error: "Administrator access required." };

  const kind = String(form.get("kind") ?? "");
  if (kind !== "provider" && kind !== "model") return { error: "Invalid record type." };
  const table = kind === "provider" ? "llm_providers" : "llm_models";
  const id = String(form.get("id") ?? "").trim();
  if (id && !validId(id)) return { error: "Invalid record ID." };
  const intent = String(form.get("intent") ?? "save");
  if (intent !== "save" && intent !== "delete") return { error: "Invalid action." };

  if (intent === "delete") {
    if (!id || form.get("confirm_delete") !== "on") return { error: "Select the confirmation checkbox before deleting." };
    const { data, error } = await supabase.from(table).delete().eq("id", id).select("id").single();
    if (error?.code === "23503") {
      return { error: kind === "provider"
        ? "This provider has models. Remove unused models first; retain providers referenced by history."
        : "This model is referenced by generation history. Disable it instead of deleting it." };
    }
    if (error || !data) return { error: "Could not delete the record. It may have already been removed." };
  } else {
    const name = String(form.get("name") ?? "").trim();
    if (!name || name.length > 100) return { error: "Enter a name between 1 and 100 characters." };
    let values: { name: string; provider_id?: string; model_identifier?: string; is_enabled?: boolean } = { name };
    if (kind === "model") {
      const providerId = String(form.get("provider_id") ?? "").trim();
      const identifier = String(form.get("model_identifier") ?? "").trim();
      if (!validId(providerId)) return { error: "Choose a provider." };
      if (!identifier || identifier.length > 200 || /\s/.test(identifier)) {
        return { error: "Enter a model identifier with no spaces, up to 200 characters." };
      }
      values = { name, provider_id: providerId, model_identifier: identifier, is_enabled: form.get("is_enabled") === "on" };
    }
    const result = id
      ? await supabase.from(table).update(values).eq("id", id).select("id").single()
      : await supabase.from(table).insert(values).select("id").single();
    if (result.error?.code === "23503") return { error: "That provider no longer exists. Refresh and choose another." };
    if (result.error || !result.data) return { error: "Could not save the record. Check your permissions and try again." };
  }

  for (const path of ["/llm-providers", "/llm-models", "/generation-requests", "/llm-responses"]) revalidatePath(path);
  return { message: intent === "delete" ? "Record deleted." : id ? "Changes saved." : "Record created." };
}
