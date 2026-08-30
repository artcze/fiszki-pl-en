import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { parseAuthCredentials } from "@/lib/auth-input";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-policy";

const AUTH_UNAVAILABLE = "Usługa uwierzytelniania jest chwilowo niedostępna. Spróbuj ponownie później.";
const SIGNUP_FAILED = "Nie udało się utworzyć konta. Sprawdź dane i spróbuj ponownie.";

function errorRedirect(context: Parameters<APIRoute>[0], message: string): Response {
  return context.redirect(`/auth/signup?error=${encodeURIComponent(message)}`);
}

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const credentials = parseAuthCredentials(form, "signup");

  if (!credentials) {
    return errorRedirect(
      context,
      `Podaj prawidłowy adres e-mail oraz hasło składające się z co najmniej ${MIN_PASSWORD_LENGTH} znaków.`,
    );
  }

  const supabase = createClient(context.request.headers, context.cookies);

  if (!supabase) {
    console.error("Cannot sign up: Supabase is not configured");
    return errorRedirect(context, AUTH_UNAVAILABLE);
  }

  const { error } = await supabase.auth.signUp(credentials);

  if (error) {
    console.error("Sign up failed", { code: error.code });
    return errorRedirect(context, SIGNUP_FAILED);
  }

  return context.redirect("/auth/confirm-email");
};
