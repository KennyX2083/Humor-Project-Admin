"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase/server";

export type DeleteState = {
  error?: string;
};

export async function deleteExcuse(
  _previous: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
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

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { error: "Invalid excuse ID." };
  }

  const { data, error } = await supabase
    .from("excuses")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not delete the excuse. Refresh and try again." };
  }

  revalidatePath("/");
  revalidatePath("/excuses");
  revalidatePath("/ratings");
  return {};
}