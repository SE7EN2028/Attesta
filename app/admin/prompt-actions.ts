"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  PROMPT_DEFAULTS,
  REQUIRED_PLACEHOLDERS,
  isPromptKey,
} from "@/lib/prompts";
import type { ActionResult } from "@/app/admin/actions";

// Saves an admin override for a single prompt. Content is the instructional
// TEXT only — assembly and response-shape validation stay in code. Rejects
// unknown keys and edits that drop a required {{placeholder}} the assembly
// depends on (which would silently break interpolation at generation time).
export async function savePrompt(
  key: string,
  text: string
): Promise<ActionResult<{ key: string }>> {
  if (!isPromptKey(key)) {
    return { ok: false, error: "Unknown prompt key." };
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "Prompt text can't be empty." };
  }

  const required = REQUIRED_PLACEHOLDERS[key] ?? [];
  const missing = required.filter((token) => !text.includes(token));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Must keep the placeholder ${missing.join(", ")} — it's filled in at generation time.`,
    };
  }

  const label = PROMPT_DEFAULTS[key].label;
  try {
    await prisma.prompt.upsert({
      where: { key },
      update: { text, label },
      create: { key, label, text },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save prompt.";
    return { ok: false, error: message };
  }

  revalidatePath("/admin/prompts");
  return { ok: true, data: { key } };
}

// Removes an override so the prompt falls back to its hardcoded default. No-op
// if no row exists (already on default).
export async function resetPrompt(
  key: string
): Promise<ActionResult<{ key: string }>> {
  if (!isPromptKey(key)) {
    return { ok: false, error: "Unknown prompt key." };
  }
  try {
    await prisma.prompt.deleteMany({ where: { key } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reset prompt.";
    return { ok: false, error: message };
  }

  revalidatePath("/admin/prompts");
  return { ok: true, data: { key } };
}
