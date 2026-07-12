# Attesta

**Raw meeting recordings in. Signed, compliance-ready minutes out.**

Attesta turns a messy meeting transcript — audio, video, or an existing document — into a structured, audit-ready official report: attendance, agenda-based discussion log, decisions, votes, a compliance findings audit, speaker analytics, and key figures. AI drafts it in minutes; a human reviews, edits, and locks it before it's final.

**Live demo:** https://attesta-teal.vercel.app

**Source:** https://github.com/SE7EN2028/Attesta

---

## Why this exists

Statutory meeting minutes (works-council meetings, board sessions, compliance-sensitive internal meetings) are a legal record — but most are still written the way notes have always been written: someone listens to a recording, or relies on memory and scribbles, and spends hours turning that into a document that has to survive scrutiny. One misattributed quote or missed vote count and the record itself becomes challengeable.

Attesta's premise: **let AI do the first draft, fast — but never let AI have the last word.** Every report that leaves this system has been through a locked, human-reviewed state before it's considered official.

---

## The two sides of Attesta — and why both exist

This isn't one app — it's two, deliberately.

### The client side (`/create`, `/samples`)

This is what an end user — an HR director, a works-council secretary, a consultancy handling minutes on a client's behalf — actually touches. It's built around one idea from the original product brief: **let someone judge the quality of the output before they commit to anything.**

- **`/create`** is the real, production-shaped flow: sign up → describe the meeting → upload the recording (plus optional supporting documents like prior minutes or policies) → choose a service tier and formally request the full report. That request goes into a queue for human review. This mirrors how the actual product is meant to work: AI drafts, a specialist checks it, then it's delivered. After the request is submitted, the confirmation points to the **admin panel** for anyone who wants to watch the pipeline run end-to-end.
- **`/samples`** shows a real, already-generated, locked report — not a mockup — so the actual output quality can be judged in under a minute, with zero setup.

Watching the pipeline run live (transcribe → generate → review → lock) happens on the **admin side** below. Because this product is genuinely two-sided, live testing lives in the operator console rather than in a separate throwaway client path.

### The admin side (`/admin`)

This is the operator/reviewer side — the human-in-the-loop half of the pipeline, and it's just as core to the product as the client side, not an afterthought. From here, a reviewer takes a submitted request through:

**Transcribe → Generate → Edit (optional) → Lock → Dispatch**

- **Transcribe** runs the recording through Deepgram (speaker-diarized speech-to-text), or extracts text directly from an uploaded document.
- **Generate** sends the transcript through an LLM (Gemini) with a tier-specific prompt, producing the full structured report plus a compliance audit, speaker analysis, and key figures.
- **Edit** — a reviewer can revise the AI-drafted content (executive summary, attendance, discussion log, decisions, votes) before anything is finalized. AI drafts; a human still has the final say.
- **Lock** freezes the report. Locking is also what triggers the client-facing email dispatch — the report isn't just generated, it's actually delivered.
- **Admin also maintains the Prompt Library** — the instructional prompts driving generation are editable from here, not hardcoded, so wording/tone can be tuned without a code change or redeploy.

**There's a deliberate, visible link to `/admin` in the main navigation** — since this product is genuinely two-sided, hiding the operator side behind a guess-the-URL pattern would mean half the actual work goes unseen by anyone exploring on their own.

> **Note:** `/admin` is currently exposed for demo/testing and is not yet access-gated — it carries a visible "admin only · testing" banner. Auth-gating the operator console is a known, tracked next step before any real production use.

---

## What a report actually contains

Every generated report includes:

- **Cover & attendance** — company, meeting metadata, who was present
- **Executive summary**
- **Agenda-based discussion log** — grouped by agenda item, attributed by speaker
- **Decisions & votes** — with counts, where applicable
- **Compliance audit** — findings scored by risk level, each tied to a rationale (skipped entirely for the region-agnostic "General" option, rather than showing fabricated legal citations)
- **Speaker analytics** — talk-time and on-topic scoring per speaker
- **Key figures** — numbers/metrics mentioned in the meeting, extracted and charted

Reports export as a **`.pptx` slide deck** in addition to the in-app viewer, for anyone who needs to present findings outside the platform.

---

## Service tiers

Three tiers exist because rigor should scale with need — a small internal meeting doesn't need the same treatment as a regulated works-council session:

| Tier | What it adds |
|---|---|
| **Essential** | Chronological summary, basic compliance check, speaker-name correction, PDF output |
| **Scope** | Agenda-based structure, full compliance audit, full text/speaker edits, decision log |
| **Premium** | Formal legal layout, clause-by-clause review, human reviewer pass, signed/branded/audit-trailed |

A **"General" region option** exists alongside jurisdiction-specific ones (France's CSE framework is the most developed; Germany, Belgium, and Netherlands are also live) — for meetings that don't fit a specific regulatory framework, General produces a clean report with no fabricated legal citations attached.

---

## Why the pieces are built the way they are

A few decisions worth explaining rather than leaving implicit:

- **AI generation uses Google Gemini.** DeepSeek and Kimi (via NVIDIA NIM) and Groq were all evaluated first — both hit hard, real free-tier limits on realistic transcript sizes (NIM's shared-inference-pool capacity ceiling, Groq's token-per-minute cap). Gemini's free tier handled the actual workload reliably. This is documented as a live engineering decision, not a silent swap.
- **The report generation engine is separable** — a lightweight, findings-only compliance snapshot generator exists alongside the full report path (same transcript, cheaper pass). The current flow ships the full, human-reviewed report as the deliverable; the snapshot generator remains in the engine for reuse rather than being surfaced as its own client step.
- **The Document Editor only edits report *content*** — never the compliance findings, speaker analytics, or numerical data — keeping the AI-analyzed portions and the human-editable narrative cleanly separated.
- **Email dispatch (via Brevo)** fires automatically on lock, with a non-blocking failure path: if the email fails to send, the report is still locked and correct — the UI simply shows a retry option, rather than either silently failing or blocking the lock action on a third-party API call.

---

## What's intentionally not built yet

Being upfront about scope, since a product this size is never "finished" in one pass:

- **Voice agent** — a multilingual, two-way voice/text assistant for client support is part of the original product vision but is a substantial, standalone build (real-time speech infrastructure, a knowledge base, voice-driven corrections) — scoped out deliberately rather than half-built.
- **CRM / client relationship management** — persistent client profiles, request history, and a multi-client broadcast tool are designed but not implemented; the underlying data (all past requests per user) already exists and would support this cleanly when prioritized.
- **PDF export** — alongside the existing `.pptx` export, a formal print-ready PDF is planned; a technical approach was assessed and is ready to build.
- **`/admin` access gate** — the operator console needs authentication before real production use (see note above).

---

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind · Prisma (PostgreSQL) · Deepgram (transcription) · Google Gemini (report generation) · Brevo (transactional email) · Vercel Blob (file storage) · deployed on Vercel

---

## Local setup

**Prerequisites:** Node 18+, a PostgreSQL database (e.g. a free [Neon](https://neon.tech) project), and API keys for Deepgram, Gemini, and Brevo. See `.env.example` for every variable and where to get it.

```bash
npm install
cp .env.example .env    # fill in DATABASE_URL, DIRECT_URL, and the API keys
npx prisma migrate dev  # create the schema
npx prisma db seed      # seed a sample locked report so /samples has content
npm run dev             # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection string (app runtime) |
| `DIRECT_URL` | Direct/unpooled string (used by `prisma migrate`) |
| `DEEPGRAM_API_KEY` | Deepgram pre-recorded transcription |
| `GEMINI_API_KEY` | Google Gemini — report generation |
| `GEMINI_MODELS` | Model fallback chain, csv, first = primary (optional) |
| `BREVO_API_KEY` | Brevo transactional email (report-ready notifications) |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | Verified sender identity for dispatch |
| `APP_URL` | Base URL used to build report links in emails |
| `JWT_SECRET` | Signs the session cookie (`openssl rand -base64 32`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store token for uploaded source files |
| `SAMPLE_REPORT_ID` | Pin a specific report on `/samples` (optional; defaults to most-recent locked) |

### Deploying

The app is built for Vercel. A few serverless specifics worth knowing:

- **DB-backed pages use `export const dynamic = "force-dynamic"`** so Next doesn't prerender them to a stale build-time snapshot.
- **Uploads go to Vercel Blob**, PDF text is extracted with `unpdf` (serverless-safe), and the build runs `prisma generate && next build`.
- **Environment-variable changes require a redeploy** to take effect.
