import type { APIRoute } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "@/pages/api/flashcards/[id]";
import { GET, POST } from "@/pages/api/flashcards/index";
import { createClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({ createClient: vi.fn() }));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const FLASHCARD_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FLASHCARD = {
  id: FLASHCARD_ID,
  polish: "zamek",
  english: "castle",
  created_at: "2026-08-17T12:00:00.000Z",
  updated_at: "2026-08-17T12:00:00.000Z",
};

type ApiContext = Parameters<APIRoute>[0];

function context(
  method: string,
  options: {
    body?: string;
    contentType?: string;
    id?: string;
    authenticated?: boolean;
  } = {},
): ApiContext {
  const headers = new Headers();
  if (options.contentType) headers.set("content-type", options.contentType);

  return {
    request: new Request(`http://localhost/api/flashcards${options.id ? `/${options.id}` : ""}`, {
      method,
      headers,
      body: options.body,
    }),
    params: { id: options.id },
    locals: { user: options.authenticated === false ? null : { id: USER_ID } },
    cookies: {},
  } as unknown as ApiContext;
}

async function json(response: Response): Promise<unknown> {
  return response.json();
}

function jsonContext(method: string, body: unknown, id?: string): ApiContext {
  return context(method, { body: JSON.stringify(body), contentType: "application/json", id });
}

function getClient(result: { data: unknown; error: unknown }) {
  const secondOrder = vi.fn().mockResolvedValue(result);
  const firstOrder = vi.fn().mockReturnValue({ order: secondOrder });
  const eq = vi.fn().mockReturnValue({ order: firstOrder });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { client: { from }, spies: { from, select, eq, firstOrder, secondOrder } };
}

function createClientMock(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });
  return { client: { from }, spies: { from, insert, select, single } };
}

function updateClientMock(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ maybeSingle });
  const secondEq = vi.fn().mockReturnValue({ select });
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
  const update = vi.fn().mockReturnValue({ eq: firstEq });
  const from = vi.fn().mockReturnValue({ update });
  return { client: { from }, spies: { from, update, firstEq, secondEq, select, maybeSingle } };
}

function deleteClientMock(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ maybeSingle });
  const secondEq = vi.fn().mockReturnValue({ select });
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
  const deleteCall = vi.fn().mockReturnValue({ eq: firstEq });
  const from = vi.fn().mockReturnValue({ delete: deleteCall });
  return { client: { from }, spies: { from, deleteCall, firstEq, secondEq, select, maybeSingle } };
}

describe("flashcards API", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it.each([
    ["GET", GET, context("GET", { authenticated: false })],
    ["POST", POST, jsonContext("POST", { polish: "dom", english: "house" })],
    ["PATCH", PATCH, jsonContext("PATCH", { polish: "dom", english: "home" }, FLASHCARD_ID)],
    ["DELETE", DELETE, context("DELETE", { id: FLASHCARD_ID, authenticated: false })],
  ])("rejects unauthenticated %s requests", async (_method, handler, requestContext) => {
    requestContext.locals.user = null;
    const response = await handler(requestContext);

    expect(response.status).toBe(401);
    expect(await json(response)).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    expect(createClient).not.toHaveBeenCalled();
  });

  it.each([
    [POST, context("POST", { body: "{", contentType: "application/json" })],
    [PATCH, context("PATCH", { body: "{", contentType: "application/json", id: FLASHCARD_ID })],
  ])("rejects malformed JSON", async (handler, requestContext) => {
    const response = await handler(requestContext);
    expect(response.status).toBe(400);
    expect(await json(response)).toMatchObject({ error: { code: "INVALID_JSON" } });
  });

  it.each([
    [POST, context("POST", { body: "polish=dom&english=house", contentType: "application/x-www-form-urlencoded" })],
    [PATCH, context("PATCH", { body: "plain text", contentType: "text/plain", id: FLASHCARD_ID })],
  ])("rejects the wrong content type", async (handler, requestContext) => {
    const response = await handler(requestContext);
    expect(response.status).toBe(400);
    expect(await json(response)).toMatchObject({ error: { code: "INVALID_JSON" } });
  });

  it.each([
    {},
    { polish: "dom" },
    { english: "house" },
    { polish: 7, english: "house" },
    { polish: "dom", english: false },
    { polish: "   ", english: "house" },
    { polish: "dom", english: "\t\n" },
    { polish: "dom", english: "house", user_id: USER_ID },
  ])("rejects invalid create input %#", async (body) => {
    const response = await POST(jsonContext("POST", body));
    expect(response.status).toBe(400);
    expect(await json(response)).toMatchObject({ error: { code: "INVALID_FLASHCARD" } });
  });

  it.each([{ polish: "dom" }, { english: "house" }])("requires both PATCH fields %#", async (body) => {
    const response = await PATCH(jsonContext("PATCH", body, FLASHCARD_ID));
    expect(response.status).toBe(400);
    expect(await json(response)).toMatchObject({ error: { code: "INVALID_FLASHCARD" } });
  });

  it.each([
    ["POST polish", POST, jsonContext("POST", { polish: "p".repeat(256), english: "house" })],
    ["POST english", POST, jsonContext("POST", { polish: "dom", english: "e".repeat(256) })],
    ["PATCH polish", PATCH, jsonContext("PATCH", { polish: "p".repeat(256), english: "house" }, FLASHCARD_ID)],
    ["PATCH english", PATCH, jsonContext("PATCH", { polish: "dom", english: "e".repeat(256) }, FLASHCARD_ID)],
  ])("rejects %s longer than 255 characters", async (_case, handler, requestContext) => {
    const response = await handler(requestContext);

    expect(response.status).toBe(400);
    expect(await json(response)).toMatchObject({ error: { code: "INVALID_FLASHCARD" } });
    expect(createClient).not.toHaveBeenCalled();
  });

  it.each([
    [PATCH, "PATCH"],
    [DELETE, "DELETE"],
  ])("rejects an invalid UUID for %s", async (handler, method) => {
    const requestContext =
      method === "PATCH"
        ? jsonContext("PATCH", { polish: "dom", english: "house" }, "not-a-uuid")
        : context("DELETE", { id: "not-a-uuid" });
    const response = await handler(requestContext);
    expect(response.status).toBe(400);
    expect(await json(response)).toMatchObject({ error: { code: "INVALID_FLASHCARD_ID" } });
  });

  it("lists only projected fields with deterministic ordering", async () => {
    const mock = getClient({ data: [FLASHCARD], error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    const response = await GET(context("GET"));

    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ flashcards: [FLASHCARD] });
    expect(mock.spies.select).toHaveBeenCalledWith("id, polish, english, created_at, updated_at");
    expect(mock.spies.eq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(mock.spies.firstOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mock.spies.secondOrder).toHaveBeenCalledWith("id", { ascending: false });
    expect(JSON.stringify(await (await GETWithFreshMock()).json())).not.toContain("user_id");
  });

  async function GETWithFreshMock(): Promise<Response> {
    const mock = getClient({ data: [FLASHCARD], error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    return GET(context("GET"));
  }

  it("creates a trimmed flashcard with session-derived ownership", async () => {
    const mock = createClientMock({ data: FLASHCARD, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    const response = await POST(jsonContext("POST", { polish: "  zamek ", english: " castle  " }));

    expect(response.status).toBe(201);
    expect(await json(response)).toEqual({ flashcard: FLASHCARD });
    expect(mock.spies.insert).toHaveBeenCalledWith({ polish: "zamek", english: "castle", user_id: USER_ID });
  });

  it("updates a trimmed owned flashcard", async () => {
    const updated = { ...FLASHCARD, english: "lock" };
    const mock = updateClientMock({ data: updated, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    const response = await PATCH(jsonContext("PATCH", { polish: " zamek ", english: " lock " }, FLASHCARD_ID));

    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ flashcard: updated });
    expect(mock.spies.update).toHaveBeenCalledWith({ polish: "zamek", english: "lock" });
    expect(mock.spies.firstEq).toHaveBeenCalledWith("id", FLASHCARD_ID);
    expect(mock.spies.secondEq).toHaveBeenCalledWith("user_id", USER_ID);
  });

  it("deletes an owned flashcard", async () => {
    const mock = deleteClientMock({ data: { id: FLASHCARD_ID }, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    const response = await DELETE(context("DELETE", { id: FLASHCARD_ID }));

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(mock.spies.firstEq).toHaveBeenCalledWith("id", FLASHCARD_ID);
    expect(mock.spies.secondEq).toHaveBeenCalledWith("user_id", USER_ID);
  });

  it.each(["missing", "inaccessible"])("returns 404 when an update target is %s", async () => {
    const mock = updateClientMock({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    const response = await PATCH(jsonContext("PATCH", { polish: "dom", english: "house" }, FLASHCARD_ID));
    expect(response.status).toBe(404);
    expect(await json(response)).toMatchObject({ error: { code: "FLASHCARD_NOT_FOUND" } });
  });

  it.each(["missing", "inaccessible"])("returns 404 when a delete target is %s", async () => {
    const mock = deleteClientMock({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    const response = await DELETE(context("DELETE", { id: FLASHCARD_ID }));
    expect(response.status).toBe(404);
    expect(await json(response)).toMatchObject({ error: { code: "FLASHCARD_NOT_FOUND" } });
  });

  it.each([
    ["GET", GET, () => getClient({ data: null, error: { code: "DB_ERROR", message: "secret" } }), context("GET")],
    [
      "POST",
      POST,
      () => createClientMock({ data: null, error: { code: "DB_ERROR", message: "secret" } }),
      jsonContext("POST", { polish: "dom", english: "house" }),
    ],
    [
      "PATCH",
      PATCH,
      () => updateClientMock({ data: null, error: { code: "DB_ERROR", message: "secret" } }),
      jsonContext("PATCH", { polish: "dom", english: "house" }, FLASHCARD_ID),
    ],
    [
      "DELETE",
      DELETE,
      () => deleteClientMock({ data: null, error: { code: "DB_ERROR", message: "secret" } }),
      context("DELETE", { id: FLASHCARD_ID }),
    ],
  ])("sanitizes Supabase failures for %s", async (_method, handler, makeMock, requestContext) => {
    const mock = makeMock();
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    const response = await handler(requestContext);
    const responseBody = await json(response);
    expect(response.status).toBe(500);
    expect(responseBody).toMatchObject({ error: { code: "INTERNAL_ERROR" } });
    expect(JSON.stringify(responseBody)).not.toContain("secret");
    expect(JSON.stringify(responseBody)).not.toContain("DB_ERROR");
  });
});
