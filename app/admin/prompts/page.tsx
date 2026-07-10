import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { Button } from "@/components/ui/button";
import { PromptLibrary } from "@/components/admin/prompt-library";
import { PROMPT_DEFAULTS, PROMPT_KEYS } from "@/lib/prompts";

// Admin prompt library. Lists every registry prompt pre-filled with its
// current text (DB override if present, else the code default), so the page
// works with an empty Prompt table.
export default async function PromptsPage() {
  const rows = await prisma.prompt.findMany();
  const overrides = new Map(rows.map((r) => [r.key, r.text]));

  const items = PROMPT_KEYS.map((key) => {
    const override = overrides.get(key);
    return {
      key,
      label: PROMPT_DEFAULTS[key].label,
      text: override ?? PROMPT_DEFAULTS[key].default,
      defaultText: PROMPT_DEFAULTS[key].default,
      isOverridden: override !== undefined,
    };
  });

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-ink-900 py-12 md:py-16">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Eyebrow>Admin · prompt library</Eyebrow>
              <h1 className="mt-4 font-serif text-2xl text-cream-100 md:text-3xl">
                Report engine prompts
              </h1>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">← Back to admin</Link>
            </Button>
          </div>

          <p className="mt-4 max-w-2xl text-[13px] leading-[1.6] text-cream-500">
            Edit the instructional text sent to the model. Assembly and the
            required JSON output shape stay in code and aren&apos;t editable.
            Saved edits take effect on the next report or snapshot generation —
            there is no versioning. Tokens like{" "}
            <code className="font-mono text-cream-300">{"{{region}}"}</code> are
            filled in automatically and must be kept.
          </p>

          <div className="mt-8">
            <PromptLibrary items={items} />
          </div>
        </Container>
      </main>
    </>
  );
}
