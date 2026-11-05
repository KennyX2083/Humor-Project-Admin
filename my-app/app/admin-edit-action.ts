"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase/server";
import { gameCharacters } from "../lib/game-characters";

export type AdminEditState = { error?: string; message?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveAdminEdit(_previous: AdminEditState, form: FormData): Promise<AdminEditState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in again." };
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("is_superadmin").eq("id", user.id).single();
  if (profileError || profile?.is_superadmin !== true) return { error: "Administrator access required." };

  if (form.get("kind") === "role") {
    const id = String(form.get("id") ?? "");
    const role = form.get("role");
    if (!uuid.test(id) || (role !== "user" && role !== "administrator")) return { error: "Invalid user or role." };
    if (id === user.id && role === "user") return { error: "You cannot remove your own administrator access." };
    const { error } = await supabase.rpc("admin_set_user_role", { p_user_id: id, p_is_superadmin: role === "administrator" });
    if (error) return { error: "Could not change the role. Refresh and try again." };
    revalidatePath("/", "layout");
    return { message: "Role saved." };
  }

  if (form.get("kind") !== "excuse") return { error: "Invalid action." };
  const game = String(form.get("game") ?? "");
  const character = String(form.get("character_name") ?? "").trim();
  const situation = String(form.get("situation") ?? "").trim();
  const excuse = String(form.get("excuse") ?? "").trim();
  if (!["valorant", "league", "overwatch"].includes(game) || character.length > 100 ||
      situation.length < 5 || situation.length > 1000 || !excuse || excuse.length > 4000) {
    return { error: "Choose a game, enter a situation (5 to 1,000 characters), and an excuse (up to 4,000 characters)." };
  }
  const matchingCharacter = (gameCharacters[game] ?? []).find(
    (name) => name.toLowerCase() === character.toLowerCase(),
  );
  if (character && !matchingCharacter) {
    return { error: "Choose a character from the selected game's suggestions, or leave the character field blank." };
  }
  const { data, error } = await supabase.from("excuses").insert({ user_id: user.id, game,
    character_name: matchingCharacter || null, situation, prompt: situation, excuse }).select("id").single();
  if (error || !data) return { error: "Could not create the excuse. Your entry is still here; try again." };
  for (const path of ["/", "/excuses", "/ratings"]) revalidatePath(path);
  return { message: "Excuse created." };
}
