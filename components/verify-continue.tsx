"use client";

import { useState } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/eyebrow";
import { Button } from "@/components/ui/button";
import { completeSignIn } from "@/app/create/actions";

export function VerifyContinue({
  token,
  status,
  code,
}: {
  token: string;
  status: "valid" | "expired" | "invalid";
  code: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "valid") {
    return (
      <div>
        <Eyebrow>{status === "expired" ? "Link expired" : "Invalid link"}</Eyebrow>
        <h1 className="mt-4 font-serif text-3xl text-cream-100">
          {status === "expired"
            ? "This sign-in link has expired."
            : "This sign-in link isn’t valid."}
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-cream-300">
          Links are single-use and valid for 20 minutes. Request a fresh one.
        </p>
        <Button asChild className="mt-8">
          <Link href={`/create?auth=${status}`}>Back to sign in</Link>
        </Button>
      </div>
    );
  }

  async function onContinue() {
    setBusy(true);
    setError(null);
    const res = await completeSignIn(token);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    // Full navigation so the freshly-set session cookie is picked up.
    window.location.href = "/create";
  }

  return (
    <div>
      <Eyebrow>Almost there</Eyebrow>
      <h1 className="mt-4 font-serif text-3xl text-cream-100">
        Continue to sign in
      </h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-cream-300">
        Click continue to finish signing in. The device you started on will be
        signed in too.
      </p>
      {code && (
        <div className="mt-6 rounded-md border border-cream-200/10 bg-ink-850 p-5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-cream-500">
            Confirm this matches the code shown on the device where you started
          </p>
          <p className="mt-3 font-mono text-3xl tracking-[0.35em] text-cream-100">
            {code}
          </p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-cream-400">
            Only continue if it matches. If you didn&apos;t start a sign-in, close
            this page.
          </p>
        </div>
      )}
      {error && (
        <p className="mt-4 rounded border border-rust-400/30 bg-rust-400/5 px-4 py-3 text-[13px] text-rust-400">
          {error}
        </p>
      )}
      <Button className="mt-8" disabled={busy} onClick={onContinue}>
        {busy ? "Signing you in…" : "Continue"}
      </Button>
    </div>
  );
}
