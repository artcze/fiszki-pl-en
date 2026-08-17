import { afterEach, describe, expect, it, vi } from "vitest";
import { LIBRETRANSLATE_TIMEOUT_MS, LibreTranslateService } from "@/lib/libretranslate";
import { TranslationServiceError } from "@/lib/translations";

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

describe("LibreTranslateService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requests Polish-to-English text with three alternatives and an API key", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ translatedText: "castle", alternatives: ["lock", "zipper"] }));
    const service = new LibreTranslateService({
      baseUrl: "https://translate.example/",
      apiKey: "secret-key",
      fetch: fetchMock,
    });

    await expect(service.translatePolishWord("zamek")).resolves.toEqual(["castle", "lock", "zipper"]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://translate.example/translate");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    if (typeof init.body !== "string") throw new TypeError("Expected a JSON request body");
    const parsedBody = JSON.parse(init.body) as unknown;
    expect(parsedBody).toEqual({
      q: "zamek",
      source: "pl",
      target: "en",
      format: "text",
      alternatives: 3,
      api_key: "secret-key",
    });
  });

  it("omits the optional API key and preserves a single translation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ translatedText: "house" }));
    const service = new LibreTranslateService({ baseUrl: "https://translate.example", fetch: fetchMock });

    await expect(service.translatePolishWord("dom")).resolves.toEqual(["house"]);
    const [, requestInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    if (typeof requestInit.body !== "string") throw new TypeError("Expected a JSON request body");
    const body = JSON.parse(requestInit.body) as unknown;
    expect(body).not.toHaveProperty("api_key");
  });

  it("normalizes, deduplicates, and caps provider candidates", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ translatedText: " Castle ", alternatives: ["castle", "lock", "zipper", "fortress"] }),
      );
    const service = new LibreTranslateService({ baseUrl: "https://translate.example", fetch: fetchMock });

    await expect(service.translatePolishWord("zamek")).resolves.toEqual(["Castle", "lock", "zipper"]);
  });

  it.each([
    ["an HTTP error", vi.fn().mockResolvedValue(jsonResponse({ error: "provider secret" }, 429))],
    ["invalid JSON", vi.fn().mockResolvedValue(new Response("not-json"))],
    ["an invalid payload", vi.fn().mockResolvedValue(jsonResponse({ translatedText: 7 }))],
    ["no usable candidates", vi.fn().mockResolvedValue(jsonResponse({ translatedText: " ", alternatives: [""] }))],
    ["a network error", vi.fn().mockRejectedValue(new Error("network secret"))],
  ])("maps %s to TranslationServiceError", async (_case, fetchMock) => {
    const service = new LibreTranslateService({ baseUrl: "https://translate.example", fetch: fetchMock });
    await expect(service.translatePolishWord("dom")).rejects.toBeInstanceOf(TranslationServiceError);
  });

  it("aborts after the named timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    const service = new LibreTranslateService({ baseUrl: "https://translate.example", fetch: fetchMock });

    const translation = service.translatePolishWord("dom");
    const rejection = expect(translation).rejects.toBeInstanceOf(TranslationServiceError);
    await vi.advanceTimersByTimeAsync(LIBRETRANSLATE_TIMEOUT_MS);

    await rejection;
    const timeoutCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(timeoutCall[1].signal?.aborted).toBe(true);
  });
});
