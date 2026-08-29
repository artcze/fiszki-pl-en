import type { APIRoute } from "astro";
import { LIBRETRANSLATE_API_KEY, LIBRETRANSLATE_BASE_URL } from "astro:env/server";
import { env } from "cloudflare:workers";
import { LibreTranslateService } from "@/lib/libretranslate";
import {
  internalTranslationErrorResponse,
  normalizeTranslations,
  parseTranslationInput,
  rateLimitedTranslationResponse,
  TranslationServiceError,
  translationUnavailableResponse,
  unauthorizedTranslationResponse,
} from "@/lib/translations";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return unauthorizedTranslationResponse();
  }

  const parsedInput = await parseTranslationInput(context.request);
  if (!parsedInput.success) {
    return parsedInput.response;
  }

  const { success } = await env.TRANSLATION_RATE_LIMITER.limit({ key: user.id });
  if (!success) {
    return rateLimitedTranslationResponse();
  }

  if (!LIBRETRANSLATE_BASE_URL) {
    console.error("Cannot translate word: LibreTranslate is not configured");
    return internalTranslationErrorResponse();
  }

  const translationService = new LibreTranslateService({
    baseUrl: LIBRETRANSLATE_BASE_URL,
    apiKey: LIBRETRANSLATE_API_KEY,
  });

  try {
    const translations = normalizeTranslations(await translationService.translatePolishWord(parsedInput.data.word));

    if (translations.length === 0) {
      return translationUnavailableResponse();
    }

    return Response.json({ translations });
  } catch (error) {
    if (error instanceof TranslationServiceError) {
      console.error("Translation provider request failed", { name: error.name });
      return translationUnavailableResponse();
    }

    console.error("Unexpected translation failure", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return internalTranslationErrorResponse();
  }
};
