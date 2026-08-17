import type { APIRoute } from "astro";
import {
  FLASHCARD_COLUMNS,
  errorResponse,
  flashcardIdSchema,
  internalErrorResponse,
  notFoundResponse,
  parseFlashcardInput,
  unauthorizedResponse,
} from "@/lib/flashcards";
import { createClient } from "@/lib/supabase";

function parseFlashcardId(id: string | undefined): string | Response {
  const result = flashcardIdSchema.safeParse(id);
  if (!result.success) {
    return errorResponse("INVALID_FLASHCARD_ID", "Identyfikator fiszki jest nieprawidłowy.", 400);
  }

  return result.data;
}

export const PATCH: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return unauthorizedResponse();
  }

  const id = parseFlashcardId(context.params.id);
  if (id instanceof Response) {
    return id;
  }

  const parsedInput = await parseFlashcardInput(context.request);
  if (!parsedInput.success) {
    return parsedInput.response;
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    console.error("Cannot update flashcard: Supabase is not configured");
    return internalErrorResponse();
  }

  const { data, error } = await supabase
    .from("flashcards")
    .update(parsedInput.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(FLASHCARD_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("Failed to update flashcard", { code: error.code });
    return internalErrorResponse();
  }

  if (!data) {
    return notFoundResponse();
  }

  return Response.json({ flashcard: data });
};

export const DELETE: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return unauthorizedResponse();
  }

  const id = parseFlashcardId(context.params.id);
  if (id instanceof Response) {
    return id;
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    console.error("Cannot delete flashcard: Supabase is not configured");
    return internalErrorResponse();
  }

  const { data, error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to delete flashcard", { code: error.code });
    return internalErrorResponse();
  }

  if (!data) {
    return notFoundResponse();
  }

  return new Response(null, { status: 204 });
};
