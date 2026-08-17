import { z } from "zod";
import { normalizeTranslations, TranslationServiceError, type TranslationService } from "@/lib/translations";

export const LIBRETRANSLATE_TIMEOUT_MS = 8_000;

const libreTranslateResponseSchema = z.object({
  translatedText: z.string(),
  alternatives: z.array(z.string()).optional(),
});

export interface LibreTranslateOptions {
  baseUrl: string;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

export class LibreTranslateService implements TranslationService {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetch: typeof globalThis.fetch;
  private readonly timeoutMs: number;

  constructor(options: LibreTranslateOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/u, "");
    this.apiKey = options.apiKey;
    const fetchImpl = options.fetch;
    this.fetch = fetchImpl ? (input, init) => fetchImpl(input, init) : (input, init) => globalThis.fetch(input, init);
    this.timeoutMs = options.timeoutMs ?? LIBRETRANSLATE_TIMEOUT_MS;
  }

  async translatePolishWord(word: string): Promise<string[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const body: Record<string, string | number> = {
        q: word,
        source: "pl",
        target: "en",
        format: "text",
        alternatives: 3,
      };

      if (this.apiKey) {
        body.api_key = this.apiKey;
      }

      const response = await this.fetch(`${this.baseUrl}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new TranslationServiceError(`LibreTranslate returned HTTP ${response.status}`);
      }

      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch (error) {
        throw new TranslationServiceError("LibreTranslate returned invalid JSON", { cause: error });
      }

      const parsedResponse = libreTranslateResponseSchema.safeParse(responseBody);
      if (!parsedResponse.success) {
        throw new TranslationServiceError("LibreTranslate returned an invalid response");
      }

      const translations = normalizeTranslations([
        parsedResponse.data.translatedText,
        ...(parsedResponse.data.alternatives ?? []),
      ]);

      if (translations.length === 0) {
        throw new TranslationServiceError("LibreTranslate returned no usable translations");
      }

      return translations;
    } catch (error) {
      if (error instanceof TranslationServiceError) throw error;
      throw new TranslationServiceError("LibreTranslate request failed", { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }
}
