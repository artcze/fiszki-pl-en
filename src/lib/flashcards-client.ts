import type { Flashcard, FlashcardInput } from "@/lib/flashcards";

interface ApiErrorBody {
  error: {
    message: string;
  };
}

interface FlashcardsResponse {
  flashcards: Flashcard[];
}

interface FlashcardResponse {
  flashcard: Flashcard;
}

interface TranslationsResponse {
  translations: string[];
}

export class ApiClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiClientError";
    this.status = status;
  }
}

export interface FlashcardsClient {
  listFlashcards(signal?: AbortSignal): Promise<Flashcard[]>;
  createFlashcard(input: FlashcardInput): Promise<Flashcard>;
  updateFlashcard(id: string, input: FlashcardInput): Promise<Flashcard>;
  deleteFlashcard(id: string): Promise<void>;
  translateWord(word: string, signal?: AbortSignal): Promise<string[]>;
}

const fallbackMessages = {
  list: "Nie udało się pobrać fiszek. Spróbuj ponownie.",
  create: "Nie udało się zapisać fiszki. Spróbuj ponownie.",
  update: "Nie udało się zaktualizować fiszki. Spróbuj ponownie.",
  delete: "Nie udało się usunąć fiszki. Spróbuj ponownie.",
  translate: "Nie udało się pobrać tłumaczenia. Spróbuj ponownie.",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFlashcard(value: unknown): value is Flashcard {
  if (!isRecord(value)) return false;

  return ["id", "polish", "english", "created_at", "updated_at"].every((key) => typeof value[key] === "string");
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return isRecord(value) && isRecord(value.error) && typeof value.error.message === "string";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

async function readJson(response: Response, fallbackMessage: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new ApiClientError(fallbackMessage, response.status, { cause: error });
  }
}

async function request(
  fetchImpl: typeof globalThis.fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackMessage: string,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetchImpl(input, init);
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiClientError(fallbackMessage, undefined, { cause: error });
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiClientError(fallbackMessage, response.status);
    }

    throw new ApiClientError(isApiErrorBody(body) ? body.error.message : fallbackMessage, response.status);
  }

  return response;
}

function jsonRequest(method: "POST" | "PATCH", body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  };
}

export function createFlashcardsClient(fetchImpl: typeof globalThis.fetch = globalThis.fetch): FlashcardsClient {
  return {
    async listFlashcards(signal) {
      const response = await request(fetchImpl, "/api/flashcards", { method: "GET", signal }, fallbackMessages.list);
      const body = await readJson(response, fallbackMessages.list);

      if (!isRecord(body) || !Array.isArray(body.flashcards) || !body.flashcards.every(isFlashcard)) {
        throw new ApiClientError(fallbackMessages.list, response.status);
      }

      return (body as unknown as FlashcardsResponse).flashcards;
    },

    async createFlashcard(input) {
      const response = await request(fetchImpl, "/api/flashcards", jsonRequest("POST", input), fallbackMessages.create);
      const body = await readJson(response, fallbackMessages.create);

      if (!isRecord(body) || !isFlashcard(body.flashcard)) {
        throw new ApiClientError(fallbackMessages.create, response.status);
      }

      return (body as unknown as FlashcardResponse).flashcard;
    },

    async updateFlashcard(id, input) {
      const response = await request(
        fetchImpl,
        `/api/flashcards/${encodeURIComponent(id)}`,
        jsonRequest("PATCH", input),
        fallbackMessages.update,
      );
      const body = await readJson(response, fallbackMessages.update);

      if (!isRecord(body) || !isFlashcard(body.flashcard)) {
        throw new ApiClientError(fallbackMessages.update, response.status);
      }

      return (body as unknown as FlashcardResponse).flashcard;
    },

    async deleteFlashcard(id) {
      await request(
        fetchImpl,
        `/api/flashcards/${encodeURIComponent(id)}`,
        { method: "DELETE" },
        fallbackMessages.delete,
      );
    },

    async translateWord(word, signal) {
      const response = await request(
        fetchImpl,
        "/api/translations",
        jsonRequest("POST", { word }, signal),
        fallbackMessages.translate,
      );
      const body = await readJson(response, fallbackMessages.translate);

      if (
        !isRecord(body) ||
        !Array.isArray(body.translations) ||
        body.translations.length === 0 ||
        body.translations.length > 3 ||
        !body.translations.every((translation) => typeof translation === "string" && translation.length > 0)
      ) {
        throw new ApiClientError(fallbackMessages.translate, response.status);
      }

      return (body as unknown as TranslationsResponse).translations;
    },
  };
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof ApiClientError ? error.message : fallbackMessage;
}
