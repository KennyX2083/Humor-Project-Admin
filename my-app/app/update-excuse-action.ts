"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase/server";

export type SaveExcuseState = {
  error?: string;
  savedText?: string;
};

export async function updateExcuse(
  _previous: SaveExcuseState,
  formData: FormData,
): Promise<SaveExcuseState> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Please sign in again." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.is_superadmin !== true) {
    return { error: "Administrator access required." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const excuse = String(formData.get("excuse") ?? "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { error: "Invalid excuse ID." };
  }

  if (!excuse || excuse.length > 4000) {
    return { error: "Enter an excuse between 1 and 4,000 characters." };
  }

  const { data, error } = await supabase
    .from("excuses")
    .update({ excuse })
    .eq("id", id)
    .select("id, excuse")
    .single();

  if (error || !data) {
    return { error: "Could not save. Your edits are still here—try again." };
  }

  revalidatePath("/");
  revalidatePath("/excuses");
  revalidatePath("/ratings");
  return { savedText: data.excuse };
}
