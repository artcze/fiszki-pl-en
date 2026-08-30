import { z } from "zod";

export const FLASHCARD_COLUMNS = "id, polish, english, created_at, updated_at";
export const FLASHCARD_TEXT_MAX_LENGTH = 255;

export function isSinglePolishWord(value: string): boolean {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 && !/\s/u.test(trimmedValue);
}

export const flashcardInputSchema = z
  .strictObject({
    polish: z.string().trim().min(1).max(FLASHCARD_TEXT_MAX_LENGTH).refine(isSinglePolishWord),
    english: z.string().trim().min(1).max(FLASHCARD_TEXT_MAX_LENGTH),
  })
  .readonly();

export const flashcardIdSchema = z.uuid();

export type FlashcardInput = z.infer<typeof flashcardInputSchema>;

export interface Flashcard {
  id: string;
  polish: string;
  english: string;
  created_at: string;
  updated_at: string;
}

type ErrorCode =
  | "INVALID_JSON"
  | "INVALID_FLASHCARD"
  | "INVALID_FLASHCARD_ID"
  | "UNAUTHORIZED"
  | "FLASHCARD_NOT_FOUND"
  | "INTERNAL_ERROR";

export function errorResponse(code: ErrorCode, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function parseFlashcardInput(
  request: Request,
): Promise<{ success: true; data: FlashcardInput } | { success: false; response: Response }> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();

  if (contentType !== "application/json") {
    return {
      success: false,
      response: errorResponse("INVALID_JSON", "Żądanie musi zawierać poprawne dane JSON.", 400),
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: errorResponse("INVALID_JSON", "Żądanie musi zawierać poprawne dane JSON.", 400),
    };
  }

  const result = flashcardInputSchema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      response: errorResponse("INVALID_FLASHCARD", "Podaj jedno polskie słowo i niepuste angielskie tłumaczenie.", 400),
    };
  }

  return { success: true, data: result.data };
}

export const unauthorizedResponse = () =>
  errorResponse("UNAUTHORIZED", "Musisz się zalogować, aby zarządzać fiszkami.", 401);

export const internalErrorResponse = () =>
  errorResponse("INTERNAL_ERROR", "Nie udało się wykonać operacji. Spróbuj ponownie później.", 500);

export const notFoundResponse = () => errorResponse("FLASHCARD_NOT_FOUND", "Nie znaleziono fiszki.", 404);
