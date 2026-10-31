"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase/server";

export type ChainMixState = { error?: string; message?: string };

export async function updateChainMix(_previous: ChainMixState, form: FormData): Promise<ChainMixState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in again." };
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("is_superadmin").eq("id", user.id).single();
  if (profileError || profile?.is_superadmin !== true) return { error: "Administrator access required." };
  const id = String(form.get("chain_id") ?? "");
  const rawWeight = String(form.get("weight") ?? "").trim();
  const weight = Number(rawWeight);
  if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807")) return { error: "Invalid chain ID." };
  if (!/^\d+$/.test(rawWeight) || !Number.isInteger(weight) || weight < 0 || weight > 10000) {
    return { error: "Weight must be a whole number from 0 to 10,000." };
  }
  const { data, error } = await supabase.from("prompt_chain_mix")
    .update({ weight, updated_at: new Date().toISOString() }).eq("chain_id", id).select("chain_id").single();
  if (error || !data) return { error: "Could not update the chain mix. Refresh and try again." };
  revalidatePath("/prompt-chain-mix");
  return { message: "Weight saved. New generations will use the updated mix." };
}
