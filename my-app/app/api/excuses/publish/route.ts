import { revalidatePath } from "next/cache";
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
      { error: "Sign in to publish an excuse." },
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

  const { data: excuseId, error } = await supabase.rpc("publish_excuse_draft", {
    p_draft_id: body.draftId,
  });

  if (error) {
    console.error("Could not publish draft:", error.message);

    if (error.code === "P0002") {
      return Response.json(
        { error: "This draft could not be found." },
        { status: 404 },
      );
    }

    return Response.json(
      { error: "Could not publish your excuse. Please try again." },
      { status: 500 },
    );
  }

  if (typeof excuseId !== "string") {
    return Response.json(
      { error: "Could not confirm publication. Please try again." },
      { status: 500 },
    );
  }

  revalidatePath("/");
  revalidatePath("/excuses");
  return Response.json({ excuseId }, { status: 201 });
}
