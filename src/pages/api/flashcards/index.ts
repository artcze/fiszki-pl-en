import type { APIRoute } from "astro";
import { FLASHCARD_COLUMNS, internalErrorResponse, parseFlashcardInput, unauthorizedResponse } from "@/lib/flashcards";
import { createClient } from "@/lib/supabase";

export const GET: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    console.error("Cannot list flashcards: Supabase is not configured");
    return internalErrorResponse();
  }

  const { data, error } = await supabase
    .from("flashcards")
    .select(FLASHCARD_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("Failed to list flashcards", { code: error.code });
    return internalErrorResponse();
  }

  return Response.json({ flashcards: data });
};

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return unauthorizedResponse();
  }

  const parsedInput = await parseFlashcardInput(context.request);
  if (!parsedInput.success) {
    return parsedInput.response;
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    console.error("Cannot create flashcard: Supabase is not configured");
    return internalErrorResponse();
  }

  const { data, error } = await supabase
    .from("flashcards")
    .insert({ ...parsedInput.data, user_id: user.id })
    .select(FLASHCARD_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to create flashcard", { code: error.code });
    return internalErrorResponse();
  }

  return Response.json({ flashcard: data }, { status: 201 });
};
