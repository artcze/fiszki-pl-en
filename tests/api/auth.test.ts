import type { APIRoute } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as signIn } from "@/pages/api/auth/signin";
import { POST as signUp } from "@/pages/api/auth/signup";
import { createClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({ createClient: vi.fn() }));

type ApiContext = Parameters<APIRoute>[0];

function context(path: string): ApiContext {
  const body = new URLSearchParams({
    email: "user@example.test",
    password: "Secure-pass-123!",
  });

  return {
    request: new Request(`http://localhost${path}`, {
      method: "POST",
      body,
    }),
    cookies: {},
    redirect(location: string, status = 302) {
      return new Response(null, {
        status,
        headers: { Location: location },
      });
    },
  } as unknown as ApiContext;
}

function authClient(method: "signInWithPassword" | "signUp", error: unknown) {
  const call = vi.fn().mockResolvedValue({ error });

  return {
    client: {
      auth: {
        [method]: call,
      },
    },
    call,
  };
}

function redirectError(response: Response): string | null {
  const location = response.headers.get("Location");

  if (!location) {
    throw new Error("Expected redirect response to contain a Location header");
  }

  return new URL(location, "http://localhost").searchParams.get("error");
}

describe("auth API", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it.each([
    ["missing email", new URLSearchParams({ password: "Secure-pass-123!" })],
    ["invalid email", new URLSearchParams({ email: "not-an-email", password: "Secure-pass-123!" })],
  ])("rejects invalid sign-in input: %s", async (_case, body) => {
    const requestContext = context("/api/auth/signin");
    requestContext.request = new Request("http://localhost/api/auth/signin", {
      method: "POST",
      body,
    });

    const response = await signIn(requestContext);

    expect(response.status).toBe(302);
    expect(redirectError(response)).toBe("Podaj prawidłowy adres e-mail i hasło.");
    expect(createClient).not.toHaveBeenCalled();
  });

  it.each([
    ["missing password", new URLSearchParams({ email: "user@example.test" })],
    ["short password", new URLSearchParams({ email: "user@example.test", password: "12345" })],
  ])("rejects invalid sign-up input: %s", async (_case, body) => {
    const requestContext = context("/api/auth/signup");
    requestContext.request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body,
    });

    const response = await signUp(requestContext);

    expect(response.status).toBe(302);
    expect(redirectError(response)).toBe(
      "Podaj prawidłowy adres e-mail oraz hasło składające się z co najmniej 6 znaków.",
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("does not expose configuration details during sign in", async () => {
    vi.mocked(createClient).mockReturnValue(null);

    const response = await signIn(context("/api/auth/signin"));

    expect(response.status).toBe(302);
    expect(redirectError(response)).toBe(
      "Usługa uwierzytelniania jest chwilowo niedostępna. Spróbuj ponownie później.",
    );
    expect(response.headers.get("Location")).not.toContain("Supabase");
  });

  it("does not expose Supabase sign-in errors", async () => {
    const mock = authClient("signInWithPassword", {
      code: "invalid_credentials",
      message: "SECRET_PROVIDER_MESSAGE",
    });
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    const response = await signIn(context("/api/auth/signin"));

    expect(redirectError(response)).toBe("Nieprawidłowy e-mail lub hasło.");
    expect(response.headers.get("Location")).not.toContain("SECRET_PROVIDER_MESSAGE");
  });

  it("redirects successful sign in to the home page", async () => {
    const mock = authClient("signInWithPassword", null);
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    const response = await signIn(context("/api/auth/signin"));

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/");
    expect(mock.call).toHaveBeenCalledWith({
      email: "user@example.test",
      password: "Secure-pass-123!",
    });
  });

  it("does not expose configuration details during sign up", async () => {
    vi.mocked(createClient).mockReturnValue(null);

    const response = await signUp(context("/api/auth/signup"));

    expect(response.status).toBe(302);
    expect(redirectError(response)).toBe(
      "Usługa uwierzytelniania jest chwilowo niedostępna. Spróbuj ponownie później.",
    );
    expect(response.headers.get("Location")).not.toContain("Supabase");
  });

  it("does not expose Supabase sign-up errors", async () => {
    const mock = authClient("signUp", {
      code: "provider_error",
      message: "SECRET_PROVIDER_MESSAGE",
    });
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    const response = await signUp(context("/api/auth/signup"));

    expect(redirectError(response)).toBe("Nie udało się utworzyć konta. Sprawdź dane i spróbuj ponownie.");
    expect(response.headers.get("Location")).not.toContain("SECRET_PROVIDER_MESSAGE");
  });

  it("redirects successful sign up to confirmation", async () => {
    const mock = authClient("signUp", null);
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    const response = await signUp(context("/api/auth/signup"));

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/auth/confirm-email");
    expect(mock.call).toHaveBeenCalledWith({
      email: "user@example.test",
      password: "Secure-pass-123!",
    });
  });
});
