import { z } from "zod";

// Public Beta Polish Sprint Sec 1: no specific complexity rule was given
// beyond "a secure password" — length is the one requirement that
// meaningfully raises the floor without inventing rules (a required
// number/symbol mix just pushes people toward "Password1!" patterns, not
// genuinely stronger passwords).
const passwordField = z.string().min(8, "Use at least 8 characters");

export const setPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

// Same shape as setPasswordSchema, kept as a separate export since the two
// flows are conceptually distinct (first-time set vs. reset) even though
// today they validate identically.
export const resetPasswordSchema = setPasswordSchema;
