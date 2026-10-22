import { createClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { error: "Sign in to discard a draft." },
      { status: 401 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.is_superadmin !== true) {
    return Response.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof body.draftId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      body.draftId,
    )
  ) {
    return Response.json({ error: "Invalid draft." }, { status: 400 });
  }

  const { error } = await supabase
    .from("excuse_drafts")
    .delete()
    .eq("id", body.draftId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Could not discard draft:", error.message);

    return Response.json(
      { error: "Could not discard your draft. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ discarded: true });
}
