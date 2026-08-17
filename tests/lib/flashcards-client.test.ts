import { describe, expect, it, vi } from "vitest";
import { ApiClientError, createFlashcardsClient, getApiErrorMessage } from "@/lib/flashcards-client";

const FLASHCARD = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  polish: "zamek",
  english: "castle",
  created_at: "2026-08-17T12:00:00.000Z",
  updated_at: "2026-08-17T12:00:00.000Z",
};

function fetchMock(response: Response) {
  return vi.fn<typeof globalThis.fetch>().mockResolvedValue(response);
}

function requestBody(mock: ReturnType<typeof fetchMock>): unknown {
  const call = mock.mock.calls[0];
  const body = call[1]?.body;
  if (typeof body !== "string") throw new TypeError("Expected a JSON request body");
  return JSON.parse(body) as unknown;
}

describe("flashcards client", () => {
  it("lists flashcards with GET", async () => {
    const mock = fetchMock(Response.json({ flashcards: [FLASHCARD] }));
    const client = createFlashcardsClient(mock);

    await expect(client.listFlashcards()).resolves.toEqual([FLASHCARD]);
    expect(mock).toHaveBeenCalledWith("/api/flashcards", { method: "GET", signal: undefined });
  });

  it("creates a flashcard with only Polish and English values", async () => {
    const mock = fetchMock(Response.json({ flashcard: FLASHCARD }, { status: 201 }));
    const client = createFlashcardsClient(mock);

    await expect(client.createFlashcard({ polish: "zamek", english: "castle" })).resolves.toEqual(FLASHCARD);
    expect(mock.mock.calls[0]?.[0]).toBe("/api/flashcards");
    expect(mock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(requestBody(mock)).toEqual({ polish: "zamek", english: "castle" });
  });

  it("updates both values using an encoded id", async () => {
    const updated = { ...FLASHCARD, polish: "dom", english: "house" };
    const mock = fetchMock(Response.json({ flashcard: updated }));
    const client = createFlashcardsClient(mock);

    await expect(client.updateFlashcard("id/with slash", { polish: "dom", english: "house" })).resolves.toEqual(
      updated,
    );
    expect(mock.mock.calls[0]?.[0]).toBe("/api/flashcards/id%2Fwith%20slash");
    expect(mock.mock.calls[0]?.[1]).toMatchObject({ method: "PATCH" });
    expect(requestBody(mock)).toEqual({ polish: "dom", english: "house" });
  });

  it("deletes a flashcard without parsing the 204 response", async () => {
    const mock = fetchMock(new Response(null, { status: 204 }));
    const client = createFlashcardsClient(mock);

    await expect(client.deleteFlashcard(FLASHCARD.id)).resolves.toBeUndefined();
    expect(mock).toHaveBeenCalledWith(`/api/flashcards/${FLASHCARD.id}`, { method: "DELETE" });
  });

  it("requests translations with an abort signal", async () => {
    const mock = fetchMock(Response.json({ translations: ["castle", "lock"] }));
    const client = createFlashcardsClient(mock);
    const controller = new AbortController();

    await expect(client.translateWord("zamek", controller.signal)).resolves.toEqual(["castle", "lock"]);
    expect(mock.mock.calls[0]?.[0]).toBe("/api/translations");
    expect(mock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", signal: controller.signal });
    expect(requestBody(mock)).toEqual({ word: "zamek" });
  });

  it("uses a sanitized API error message", async () => {
    const mock = fetchMock(
      Response.json(
        { error: { code: "INVALID_WORD", message: "Podaj jedno niepuste polskie słowo." } },
        { status: 400 },
      ),
    );
    const client = createFlashcardsClient(mock);

    await expect(client.translateWord("dwa słowa")).rejects.toMatchObject({
      name: "ApiClientError",
      message: "Podaj jedno niepuste polskie słowo.",
      status: 400,
    });
  });

  it.each([
    ["malformed error JSON", fetchMock(new Response("not-json", { status: 500 }))],
    ["an invalid error shape", fetchMock(Response.json({ message: "provider secret" }, { status: 500 }))],
    ["a network failure", vi.fn<typeof globalThis.fetch>().mockRejectedValue(new Error("network secret"))],
  ])("uses a Polish fallback for %s", async (_case, mock) => {
    const client = createFlashcardsClient(mock);
    await expect(client.listFlashcards()).rejects.toMatchObject({
      name: "ApiClientError",
      message: "Nie udało się pobrać fiszek. Spróbuj ponownie.",
    });
  });

  it.each([
    [
      "flashcard list",
      { flashcards: [{ id: "incomplete" }] },
      (client: ReturnType<typeof createFlashcardsClient>) => client.listFlashcards(),
    ],
    [
      "created flashcard",
      { flashcard: null },
      (client: ReturnType<typeof createFlashcardsClient>) =>
        client.createFlashcard({ polish: "dom", english: "house" }),
    ],
    [
      "translations",
      { translations: [] },
      (client: ReturnType<typeof createFlashcardsClient>) => client.translateWord("dom"),
    ],
    [
      "too many translations",
      { translations: ["one", "two", "three", "four"] },
      (client: ReturnType<typeof createFlashcardsClient>) => client.translateWord("dom"),
    ],
  ])("rejects an invalid successful %s response", async (_case, body, invoke) => {
    const client = createFlashcardsClient(fetchMock(Response.json(body)));
    await expect(invoke(client)).rejects.toBeInstanceOf(ApiClientError);
  });

  it("does not convert aborts into visible API errors", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    const mock = vi.fn<typeof globalThis.fetch>().mockRejectedValue(abort);
    const client = createFlashcardsClient(mock);

    await expect(client.translateWord("dom")).rejects.toBe(abort);
  });

  it("extracts only known client errors for display", () => {
    expect(getApiErrorMessage(new ApiClientError("Błąd API"), "Błąd zapasowy")).toBe("Błąd API");
    expect(getApiErrorMessage(new Error("internal detail"), "Błąd zapasowy")).toBe("Błąd zapasowy");
  });
});
