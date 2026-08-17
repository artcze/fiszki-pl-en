import { describe, expect, it } from "vitest";
import { normalizeTranslations, parseTranslationInput, translationInputSchema } from "@/lib/translations";

function request(body: string, contentType = "application/json"): Request {
  return new Request("http://localhost/api/translations", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

describe("translation input", () => {
  it("trims a single word without imposing lexical restrictions", () => {
    expect(translationInputSchema.parse({ word: "  żółć-2!  " })).toEqual({ word: "żółć-2!" });
  });

  it.each([
    {},
    { word: 7 },
    { word: "" },
    { word: " \t " },
    { word: "dwa słowa" },
    { word: "dwa\nsłowa" },
    { word: "dom", extra: true },
  ])("rejects invalid input %#", (input) => {
    expect(translationInputSchema.safeParse(input).success).toBe(false);
  });

  it("distinguishes malformed JSON from an invalid word", async () => {
    const malformed = await parseTranslationInput(request("{"));
    const invalid = await parseTranslationInput(request(JSON.stringify({ word: "dwa słowa" })));

    expect(malformed.success).toBe(false);
    expect(invalid.success).toBe(false);
    if (!malformed.success && !invalid.success) {
      expect(await malformed.response.json()).toMatchObject({ error: { code: "INVALID_JSON" } });
      expect(await invalid.response.json()).toMatchObject({ error: { code: "INVALID_WORD" } });
    }
  });

  it("rejects a non-JSON content type", async () => {
    const result = await parseTranslationInput(request("word=dom", "application/x-www-form-urlencoded"));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(await result.response.json()).toMatchObject({ error: { code: "INVALID_JSON" } });
    }
  });
});

describe("normalizeTranslations", () => {
  it("normalizes whitespace, removes empty values, and preserves provider order", () => {
    expect(normalizeTranslations(["  castle  ", "", "  door   lock ", null])).toEqual(["castle", "door lock"]);
  });

  it("deduplicates case-insensitively with Unicode normalization", () => {
    expect(normalizeTranslations(["CAFÉ", "cafe\u0301", "Castle", "castle"])).toEqual(["CAFÉ", "Castle"]);
  });

  it("caps results at three without padding", () => {
    expect(normalizeTranslations(["one", "two", "three", "four"])).toEqual(["one", "two", "three"]);
    expect(normalizeTranslations(["one"])).toEqual(["one"]);
  });
});
