import { z } from "zod";

export interface TranslationService {
  translatePolishWord(word: string): Promise<string[]>;
}

export class TranslationServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TranslationServiceError";
  }
}

export const translationInputSchema = z
  .strictObject({
    word: z
      .string()
      .trim()
      .min(1)
      .refine((word) => !/\s/u.test(word)),
  })
  .readonly();

export type TranslationInput = z.infer<typeof translationInputSchema>;

type TranslationErrorCode =
  | "INVALID_JSON"
  | "INVALID_WORD"
  | "UNAUTHORIZED"
  | "TRANSLATION_UNAVAILABLE"
  | "INTERNAL_ERROR";

export function translationErrorResponse(code: TranslationErrorCode, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function parseTranslationInput(
  request: Request,
): Promise<{ success: true; data: TranslationInput } | { success: false; response: Response }> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();

  if (contentType !== "application/json") {
    return {
      success: false,
      response: translationErrorResponse("INVALID_JSON", "Żądanie musi zawierać poprawne dane JSON.", 400),
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: translationErrorResponse("INVALID_JSON", "Żądanie musi zawierać poprawne dane JSON.", 400),
    };
  }

  const result = translationInputSchema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      response: translationErrorResponse("INVALID_WORD", "Podaj jedno niepuste polskie słowo.", 400),
    };
  }

  return { success: true, data: result.data };
}

export function normalizeTranslations(values: readonly unknown[]): string[] {
  const translations: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") continue;

    const normalized = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (!normalized) continue;

    const comparisonKey = normalized.toLocaleLowerCase("en");
    if (seen.has(comparisonKey)) continue;

    seen.add(comparisonKey);
    translations.push(normalized);

    if (translations.length === 3) break;
  }

  return translations;
}

export const unauthorizedTranslationResponse = () =>
  translationErrorResponse("UNAUTHORIZED", "Musisz się zalogować, aby tłumaczyć słowa.", 401);

export const translationUnavailableResponse = () =>
  translationErrorResponse("TRANSLATION_UNAVAILABLE", "Nie udało się pobrać tłumaczenia. Spróbuj ponownie.", 502);

export const internalTranslationErrorResponse = () =>
  translationErrorResponse("INTERNAL_ERROR", "Nie udało się wykonać operacji. Spróbuj ponownie później.", 500);
