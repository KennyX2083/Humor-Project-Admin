import type { createClient } from "./supabase/server";

export type AdminSection = "stats" | "users" | "excuses" | "ratings" | "requests" | "responses" | "providers" | "models" | "chains" | "steps" | "mix" | "terms" | "examples" | "domains" | "emails";
export type AdminSearchParams = Record<string, string | string[] | undefined>;
export type AdminClient = Awaited<ReturnType<typeof createClient>>;
export type AdminViewProps = {
  supabase: AdminClient;
  params: AdminSearchParams;
  userId: string;
};
export type ExcuseRow = {
  id: string;
  game: string;
  character_name: string | null;
  situation: string | null;
  excuse: string;
  created_at: string;
  valid_count: number;
  skill_issue_count: number;
  total_count: number;
};
