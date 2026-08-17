import type { APIRoute } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TranslationServiceError } from "@/lib/translations";

const mocks = vi.hoisted(() => ({
  translate: vi.fn(),
  env: { baseUrl: "https://translate.example", apiKey: "secret-key" },
}));

vi.mock("astro:env/server", () => ({
  get LIBRETRANSLATE_BASE_URL() {
    return mocks.env.baseUrl;
  },
  get LIBRETRANSLATE_API_KEY() {
    return mocks.env.apiKey;
  },
}));

vi.mock("@/lib/libretranslate", () => ({
  LibreTranslateService: class {
    translatePolishWord = mocks.translate;
  },
}));

import { POST } from "@/pages/api/translations";

type ApiContext = Parameters<APIRoute>[0];

function context(
  body: unknown,
  options: { authenticated?: boolean; rawBody?: string; contentType?: string } = {},
): ApiContext {
  return {
    request: new Request("http://localhost/api/translations", {
      method: "POST",
      headers: { "content-type": options.contentType ?? "application/json" },
      body: options.rawBody ?? JSON.stringify(body),
    }),
    locals: { user: options.authenticated === false ? null : { id: "user-id" } },
    cookies: {},
  } as unknown as ApiContext;
}

describe("translations API", () => {
  beforeEach(() => {
    mocks.translate.mockReset();
    mocks.env.baseUrl = "https://translate.example";
    mocks.env.apiKey = "secret-key";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("rejects unauthenticated requests before validation or provider access", async () => {
    const response = await POST(context({ word: "dom" }, { authenticated: false }));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    expect(mocks.translate).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed JSON", context(null, { rawBody: "{" }), "INVALID_JSON"],
    ["wrong content type", context(null, { rawBody: "word=dom", contentType: "text/plain" }), "INVALID_JSON"],
    ["missing word", context({}), "INVALID_WORD"],
    ["extra field", context({ word: "dom", extra: true }), "INVALID_WORD"],
    ["non-string word", context({ word: 7 }), "INVALID_WORD"],
    ["empty word", context({ word: " \t " }), "INVALID_WORD"],
    ["internal whitespace", context({ word: "dwa słowa" }), "INVALID_WORD"],
  ])("rejects %s", async (_case, requestContext, code) => {
    const response = await POST(requestContext);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code } });
    expect(mocks.translate).not.toHaveBeenCalled();
  });

  it("returns normalized provider candidates and passes a trimmed word", async () => {
    mocks.translate.mockResolvedValue([" Castle ", "castle", "lock", "zipper", "fortress"]);

    const response = await POST(context({ word: "  zamek  " }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ translations: ["Castle", "lock", "zipper"] });
    expect(mocks.translate).toHaveBeenCalledWith("zamek");
  });

  it("preserves a single usable candidate", async () => {
    mocks.translate.mockResolvedValue(["house"]);
    const response = await POST(context({ word: "dom" }));
    expect(await response.json()).toEqual({ translations: ["house"] });
  });

  it("maps provider failures and empty results to a sanitized 502", async () => {
    mocks.translate.mockRejectedValueOnce(new TranslationServiceError("provider secret"));
    const providerFailure = await POST(context({ word: "dom" }));
    mocks.translate.mockResolvedValueOnce([]);
    const emptyResult = await POST(context({ word: "dom" }));

    for (const response of [providerFailure, emptyResult]) {
      const body: unknown = await response.json();
      expect(response.status).toBe(502);
      expect(body).toMatchObject({ error: { code: "TRANSLATION_UNAVAILABLE" } });
      expect(JSON.stringify(body)).not.toContain("provider secret");
    }
  });

  it("returns a sanitized 500 for unexpected failures", async () => {
    mocks.translate.mockRejectedValue(new Error("implementation secret"));
    const response = await POST(context({ word: "dom" }));
    const body: unknown = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({ error: { code: "INTERNAL_ERROR" } });
    expect(JSON.stringify(body)).not.toContain("implementation secret");
  });

  it("returns 500 without calling the provider when configuration is missing", async () => {
    mocks.env.baseUrl = "";
    const response = await POST(context({ word: "dom" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: { code: "INTERNAL_ERROR" } });
    expect(mocks.translate).not.toHaveBeenCalled();
  });
});
