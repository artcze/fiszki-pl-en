import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

const AUTH_UNAVAILABLE = "Usługa uwierzytelniania jest chwilowo niedostępna. Spróbuj ponownie później.";
const INVALID_CREDENTIALS = "Nieprawidłowy e-mail lub hasło.";

function errorRedirect(context: Parameters<APIRoute>[0], message: string): Response {
  return context.redirect(`/auth/signin?error=${encodeURIComponent(message)}`);
}

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = form.get("email") as string;
  const password = form.get("password") as string;

  const supabase = createClient(context.request.headers, context.cookies);

  if (!supabase) {
    console.error("Cannot sign in: Supabase is not configured");
    return errorRedirect(context, AUTH_UNAVAILABLE);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Sign in failed", { code: error.code });
    return errorRedirect(context, INVALID_CREDENTIALS);
  }

  return context.redirect("/");
};
