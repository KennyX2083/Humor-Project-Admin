import { runPromptChain, type PromptStep } from "../../../lib/run-prompt-chain";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "../../../lib/supabase/server";
import { gameCharacters } from "../../../lib/game-characters";

export async function POST(request: Request) {
  // Reject requests coming from a different website.
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
      { error: "Sign in to generate an excuse." },
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

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const game = body.game;
  let character =
    typeof body.character === "string" ? body.character.trim() : "";
  const situation =
    typeof body.situation === "string" ? body.situation.trim() : "";

  if (
    (game !== "valorant" && game !== "league" && game !== "overwatch") ||
    character.length > 100 ||
    situation.length < 5 ||
    situation.length > 1000
  ) {
    return Response.json(
      {
        error:
          "Choose a game, use at most 100 characters for your character, " +
          "and describe what happened in 5–1000 characters.",
      },
      { status: 400 },
    );
  }

  if (character) {
    const matchingCharacter = (gameCharacters[game] ?? []).find(
      (name) => name.toLowerCase() === character.toLowerCase(),
    );

    if (!matchingCharacter) {
      return Response.json(
        {
          error:
            "Choose a character from the selected game's roster, " +
            "or leave the character field blank.",
        },
        { status: 400 },
      );
    }

    character = matchingCharacter;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Excuse generation is not configured yet." },
      { status: 503 },
    );
  }

  const { data: chain, error: chainError } = await supabase
    .from("prompt_chains").select("id,name")
    .eq("slug", "excuse-generation").single();
  if (chainError || !chain) {
    return Response.json({ error: "The excuse prompt chain is not configured." }, { status: 503 });
  }
  const { data: steps, error: stepsError } = await supabase
    .from("prompt_chain_steps").select("id,position,name,instructions")
    .eq("chain_id", chain.id).order("position", { ascending: true }).returns<PromptStep[]>();
  if (stepsError || !steps?.length) {
    return Response.json({ error: "The excuse prompt chain has no available steps." }, { status: 503 });
  }

  // This endpoint supports Google models; choose the oldest enabled configuration.
  const { data: model, error: modelError } = await supabase
    .from("llm_models")
    .select("id, model_identifier, llm_providers!inner(name)")
    .eq("is_enabled", true)
    .eq("llm_providers.name", "Google")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (modelError || !model) {
    console.error("Could not load enabled Google model:", modelError?.message);
    return Response.json(
      { error: "No enabled Google model is available. Check Models configuration." },
      { status: 503 },
    );
  }

  const { data: generationRequest, error: requestError } = await supabase
    .from("generation_request")
    .insert({
      user_id: user.id,
      model_id: model.id,
      chain_id: chain.id,
      game,
      character_name: character || null,
      situation,
      status: "pending",
    })
    .select("id")
    .single();

  if (requestError || !generationRequest) {
    console.error("Could not record generation request:", requestError?.message);
    return Response.json(
      { error: "Could not record the generation request. Please try again." },
      { status: 500 },
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const result = await runPromptChain({
    steps,
    context: {
      game: game === "valorant" ? "Valorant" : game === "league" ? "League of Legends" : "Overwatch",
      character: character || "Not specified",
      situation,
    },
    generate: async (prompt) => {
      const response = await ai.models.generateContent({ model: model.model_identifier, contents: prompt });
      return {
        text: response.text ?? "",
        inputTokens: response.usageMetadata?.promptTokenCount ?? null,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
      };
    },
    record: async (step) => {
      const { error } = await supabase.from("llm_response").insert({
        request_id: generationRequest.id,
        chain_id: chain.id,
        step_id: step.stepId,
        prompt: step.prompt,
        output: step.output,
        error: step.error,
        duration_ms: step.durationMs,
        input_tokens: step.inputTokens,
        output_tokens: step.outputTokens,
      });
      if (error) console.error("Could not log prompt step:", error.message);
      return !error;
    },
  });
  const generationError = result.error;
  const excuse = result.output;
  // Full prompts are retained in llm_response. Drafts have a 2000-character limit.
  const prompt = result.lastPrompt.length <= 2000 ? result.lastPrompt
    : `Prompt chain: ${chain.name}. Generation request: ${generationRequest.id}. Full prompts are in the response log.`;

  // Status describes the model call; saving its draft is a separate operation.
  const { data: completedRequest, error: statusError } = await supabase
    .from("generation_request")
    .update({
      status: generationError ? "failed" : "succeeded",
      completed_at: new Date().toISOString(),
    })
    .eq("id", generationRequest.id)
    .select("id")
    .single();

  if (result.loggingFailed || statusError || !completedRequest) {
    console.error("Could not save generation log:", {
      requestId: generationRequest.id,
      loggingFailed: result.loggingFailed,
      statusError: statusError?.message,
    });
    return Response.json(
      { error: "The model request finished, but its generation log could not be saved." },
      { status: 500 },
    );
  }

  if (generationError) {
    return Response.json(
      { error: "Gemini could not generate a usable excuse. Check configuration and quota, then try again." },
      { status: 502 },
    );
  }

  const { data, error } = await supabase
    .from("excuse_drafts")
    .insert({
      user_id: user.id,
      game,
      character_name: character || null,
      situation,
      prompt,
      excuse,
    })
    .select("id, game, character_name, situation, excuse, created_at")
    .single();

  if (error) {
    console.error("Could not save draft:", error.message);

    return Response.json(
      {
        error: "The excuse was generated but its preview could not be saved.",
      },
      { status: 500 },
    );
  }

  return Response.json({ draft: data }, { status: 201 });
}
