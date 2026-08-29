import { z } from "zod";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailSchema = z.string().trim().min(1).max(254).regex(EMAIL_PATTERN);

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(6),
});

export interface AuthCredentials {
  email: string;
  password: string;
}

export function parseAuthCredentials(form: FormData, mode: "signin" | "signup"): AuthCredentials | null {
  const email = form.get("email");
  const password = form.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }

  const schema = mode === "signup" ? signUpSchema : signInSchema;
  const result = schema.safeParse({ email, password });

  return result.success ? result.data : null;
}
