"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase/server";
import { accessLists, validDomain, validEmail } from "../lib/signup-access-list";

export type AccessListState = { error?: string; message?: string };

export async function saveAccessList(_previous: AccessListState, form: FormData): Promise<AccessListState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in again." };
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("is_superadmin").eq("id", user.id).single();
  if (profileError || profile?.is_superadmin !== true) return { error: "Administrator access required." };
  const kind = String(form.get("kind") ?? "");
  if (kind !== "domain" && kind !== "email") return { error: "Invalid access list." };
  const config = accessLists[kind];
  const id = String(form.get("id") ?? "").trim();
  if (id && (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807"))) return { error: "Invalid record ID." };
  const intent = String(form.get("intent") ?? "save");
  if (intent !== "save" && intent !== "delete") return { error: "Invalid action." };
  if (intent === "delete") {
    if (!id || form.get("confirm_delete") !== "on") return { error: "Select the confirmation checkbox before deleting." };
    const { data, error } = await supabase.from(config.table).delete().eq("id", id).select("id").single();
    if (error || !data) return { error: "Could not delete the entry. Refresh and try again." };
  } else {
    const value = String(form.get("value") ?? "").trim().toLowerCase();
    const notes = String(form.get("notes") ?? "").trim();
    if (kind === "domain" ? !validDomain(value) : !validEmail(value)) {
      return { error: kind === "domain" ? "Enter a domain such as columbia.edu, without @, a URL, or a wildcard." : "Enter an email address such as student@columbia.edu." };
    }
    if (notes.length > 500) return { error: "Keep notes within 500 characters." };
    const values = { [config.column]: value, notes: notes || null, updated_at: new Date().toISOString() };
    const result = id
      ? await supabase.from(config.table).update(values).eq("id", id).select("id").single()
      : await supabase.from(config.table).insert(values).select("id").single();
    if (result.error?.code === "23505") return { error: `That ${config.label} is already listed.` };
    if (result.error || !result.data) return { error: "Could not save the entry. Your edits are still here; try again." };
  }
  revalidatePath(config.path);
  return { message: intent === "delete" ? "Entry deleted." : id ? "Changes saved." : "Entry created." };
}
