# Traccoon PayAgent: Tasks

Every task needed to finish the app and all three submissions. Scope comes from [`docs/PRD.md`](docs/PRD.md).

## How to use this file

- Work top to bottom inside a phase. Tasks are ordered by dependency.
- Check a box only when its **Done when** is true on the deployed URL or in a passing test, not when the code is written.
- **P0** must ship for that phase's submission. **P1** ships only if its checkpoint is met. **P2** is stretch. When a checkpoint (`M1`–`M9`) is missed, skip the remaining P1/P2 tasks in that phase and go straight to its submission section.
- `[you]` marks tasks only Imman can do (accounts, keys, rules pages, recording). Everything else an agent can do.
- Feature IDs (`F1`–`F18`) refer to the PRD.

---

## Phase 0: Foundation (3 Nov morning)

### 0.1 Rules and accounts

- [x] **T0.1** `[you]` **Do this first.** Claim the $150 Meta Model API credits through the form in the participant guide (deadline 4 Nov, 9 PM ET, but they arrive in batches). Add a credit card (required), then set a spend limit on the Billing page. *Done when:* credits show on the Billing page.
- [ ] **T0.2** `[you]` Create a Meta Model API key. *Done when:* the key is in `.env.local` and Vercel env vars.
- [ ] **T0.2a** `[you]` Request Baseten credits (for the open-weight prize; not guaranteed). Join the hackathon Discord and note the #office-hours times (10–11 AM ET, which is 11 PM–12 AM PHT). 3 Nov is the last full day for submission questions.
- [ ] **T0.2b** Save the participant guide's rules, rubric and prize list to `docs/hackathon-rules.md`.
- [ ] **T0.3** `[you]` Create a Neon Postgres project. *Done when:* `DATABASE_URL` is in `.env.local` and Vercel.
- [ ] **T0.4** `[you]` Create an empty **public** GitHub repo `traccoon-payagent`.
- [ ] **T0.5** `[you]` Create a Vercel project linked to the repo.

### 0.2 Repo and scaffold

- [ ] **T0.6** `git init`, add `LICENSE` (MIT), first commit with `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `docs/PRD.md`, `tasks.md`. Confirm `.gitignore` excludes the private Traccoon skills. *Done when:* `git status` is clean and `git check-ignore .agents/skills/traccoon-design-skill` prints the path.
- [x] **T0.7** Scaffold Next.js (App Router, TypeScript, Tailwind, ESLint) with pnpm. *Done when:* `pnpm dev` serves the default page.
- [x] **T0.8** Add Vitest and a `pnpm test` script. *Done when:* one sample test passes.
- [x] **T0.9** Add `.env.example` listing every env var with comments. Add a server-only `env.ts` that validates env vars with Zod at startup.
- [ ] **T0.10** Push to GitHub and deploy to Vercel. *Done when:* the live URL serves the app.

### 0.3 Design system

- [x] **T0.11** Port `traccoon-design-skill/examples/tokens.css` into one global token file (colors, Nunito, radii, shadows, spacing, motion). Map tokens into Tailwind config. No literals in components.
- [x] **T0.12** Load Nunito via `next/font` with `display: swap`.
- [ ] **T0.13** Build shared components: `Button` (tactile: rest, hover, pressed, focus-visible, disabled, loading), `Card`, `Input`, `Textarea`, `Select`, `Badge` (status), `BackLink`/`ExitButton`, `EmptyState`, `Modal`. *Done when:* a `/dev/components` page shows every state and passes keyboard focus checks.
- [x] **T0.14** App shell: header with product name and environment badge ("Sandbox"), main content width per traccoon-responsive (reflows, no scaling). *Done when:* usable at 360px and 1280px.

### 0.4 Data layer

- [x] **T0.15** Choose Drizzle (recommended: lighter) and connect to Neon.
- [ ] **T0.16** Schema and first migration for: `clients`, `invoices`, `invoice_items`, `agent_requests`, `approvals`, `audit_events`. Money as integer centavos, `due_date` as date, statuses as enums. *Done when:* migration applies to Neon.
- [x] **T0.17** `audit.record(entityType, entityId, eventType, payload)` helper. Append-only: no update/delete paths. *Done when:* unit test confirms a row is written.
- [x] **T0.18** Invoice number generator `INV-0001`, safe under concurrent inserts (DB sequence). *Done when:* test creates two in parallel without collision.
- [ ] **T0.19** Seed script `pnpm db:seed` with 3 clients and 2 sample invoices.

---

## Phase 1: Meta hackathon (3–4 Nov)

### 1.1 Deterministic core (no AI yet)

- [x] **T1.1** `parseAmount(text) → centavos`: handles `2500`, `2,500`, `2.5k`, `₱2,500.50`, `P2500`, `PHP 2500`, `2.5K`, `1.2m`; rejects ambiguous or negative. *Done when:* table-driven tests pass.
- [x] **T1.2** `resolveDueDate(token, now, tz='Asia/Manila') → { date, needsConfirmation }`: tokens `today`, `tomorrow`, `in_n_days`, `next_<weekday>`, `this_<weekday>`, `end_of_month`, `absolute:<YYYY-MM-DD>`. Flags `next_friday` asked on Thu/Fri as needing confirmation. *Done when:* tests cover every token and the Thu/Fri edge cases.
- [x] **T1.3** `formatPeso(centavos)` and date formatting helpers used everywhere in UI.
- [x] **T1.4** Zod schemas: `InvoiceProposal` (model output: client name, items with raw amount strings, currency, due date token, notes, missing fields, clarifying question) and `InvoiceDraft` (validated: centavos, real date). *Done when:* `proposalToDraft()` converts and returns typed errors.

### 1.2 Meta model integration (F1, F2)

- [x] **T1.5** `ModelProvider` interface with a Meta Model API implementation (Muse Spark, with tool calling and image input): server-only, timeout, one retry on network error, logs model name and latency. *Done when:* a smoke script returns a completion and a tool call.
- [ ] **T1.5a** Baseten implementation of `ModelProvider` using `meta-models/muse-spark-open-1026` (not `muse-spark-open`), selected by `MODEL_PROVIDER` env var. P1: skip if Baseten credits haven't arrived by 4 Nov noon.
- [x] **T1.6** Invoice extraction prompt: system prompt with today's date and timezone, schema description, rules (never compute amounts or dates, return tokens; list missing fields; ask one question). Treat user text as data.
- [x] **T1.6a** Agent tools (deterministic, server-side): `find_client(name)`, `parse_amount(text)` (wraps T1.1), `resolve_due_date(token)` (wraps T1.2), `list_open_invoices(client)`. The model calls these instead of doing maths. Every tool call is written to the audit log. This is what makes it an agent, not an extractor (Best Agentic Use-Case, Use of Meta tooling).
- [x] **T1.7** `proposeInvoice(input)`: run the agent loop (max 5 tool calls), parse the final JSON, validate with Zod, on failure retry once with the validation error, then fail cleanly. Writes an `agent_requests` row and audit event for every attempt. *Done when:* integration test with a mocked model covers success, invalid JSON then success, and double failure.
- [x] **T1.8** Missing-info loop (F2): if the proposal lists missing fields or the date needs confirmation, return one question; the answer is appended to the conversation and re-proposed. *Done when:* "Invoice Client A for consulting" asks for the amount, and answering produces a full draft.
- [x] **T1.9** Eval set `evals/invoice-cases.json` with 15 inputs (English, Filipino, Taglish, missing fields, ambiguous dates, odd amount formats) and expected drafts. `pnpm eval` runs them against the real model and prints pass rate, per provider. *Done when:* pass rate ≥ 90% on Muse Spark, or failures are fixed in the prompt. Record the Spark Open pass rate too; submit for the open-weight prize only if it is close.

### 1.3 Screens (F3, F4, F5)

- [x] **T1.10** New request screen: one input box (text), submit, loading state, follow-up question rendering. Copy follows the Traccoon writing rules.
- [x] **T1.11** Review and approval screen (F3): editable invoice card beside the original input; field-level validation; Approve and Reject. *Done when:* no `invoices` row exists before Approve (verified by test), edits are saved to `approvals.edits_json`.
- [x] **T1.12** Approve action: server-side re-validation, creates invoice + items in one transaction, writes approval and audit events. Double-submit safe.
- [x] **T1.13** Invoice list (F4): client, amount in ₱, due date, status badge; empty state with one action.
- [x] **T1.14** Invoice detail with audit timeline (F5): input, each agent tool call and result, proposal (model + latency), validation, edits, approval, outcome.
- [ ] **T1.15** Error states: model timeout, invalid output after retry, DB error. Each says what happened and what to do next.
- [ ] **T1.16** Mobile pass on all screens at 360/390/430px.

> **Checkpoint M1 (3 Nov, 10 PM):** text instruction → approved invoice → audit timeline, working on the live URL. Record a 30-second screen capture. If missed, skip T1.17–T1.20.

### 1.4 Screenshot input (F6, P1)

- [x] **T1.17** Image upload (PNG/JPG, size limit, server-side only, not stored publicly). Store in a private bucket or as DB blob for the demo.
- [ ] **T1.18** Vision extraction via the Meta vision model into the same `InvoiceProposal` schema. Text in the image is treated as data.
- [x] **T1.19** Review screen shows the screenshot beside the draft.
- [ ] **T1.20** `[you]` Make 3 demo screenshots (Messenger chats agreeing a job and price, one in Taglish). Add them to `evals/`. *Done when:* all 3 produce correct drafts.

> **Checkpoint M2 (4 Nov, 1 PM):** F6 works, or delete its UI entry point and move on.

- [ ] **T1.20a** Voice note input (F6b, P1): record or upload audio, transcribe with Muse Voice Transcribe, then run the normal agent flow. Build after F6, or instead of F6 if vision quality is poor.

### 1.5 P2 if time allows

- [ ] **T1.21** Client memory (F7): match known clients by name or alias, prefill email.

### 1.6 Meta submission

- [ ] **T1.22** Feature freeze at 5 PM on 4 Nov. Only bug fixes after this.
- [ ] **T1.23** README: what it is, problem statement (Build for Your World), demo URL, which Meta models are used and how (Muse Spark agent with tools, vision, Voice Transcribe, Spark Open via Baseten if used), architecture diagram, setup in under 10 minutes, eval pass rate, safety design (model proposes, code decides). Required: a **Built during the hackathon** section stating that all code was written 3–4 Nov, with the commit range. Without it, the judges can disqualify the entry.
- [ ] **T1.24** Reset demo data: `pnpm db:seed --demo`.
- [ ] **T1.25** `[you]` Record the 3-minute demo video following the PRD Meta script. Show only work built during the hackathon, and lead with the agent workflow, not screenshot parsing ("simple image analyzers" are a listed anti-project).
- [ ] **T1.26** `[you]` Submit on the Cerebral Valley platform by 11:59 PM, 4 Nov PHT (official cutoff 5 Nov, 10:00 AM PHT). Choose the Indie Developer track. Check that the repo is public and the video link opens logged out. Flag the open-weight prize if T1.5a shipped.
- [ ] **T1.26a** `[you]` Post the demo on X and submit the post link on the platform (Most Viral prize, engagement counted until 8 Nov). Share the gallery link for the community vote.
- [ ] **T1.27** `git tag meta-submission && git push --tags`.

> **Checkpoint M3 (4 Nov, 11:59 PM):** submitted and tagged. The official cutoff is 5 Nov, 10:00 AM PHT; treat the extra hours as buffer only.

---

## Phase 2a: PayPal core (5–6 Nov)

- [ ] **T2.1** `[you]` Create PayPal Developer sandbox business (PH) and personal buyer accounts. Add client ID and secret to env.
- [ ] **T2.2** PHP currency spike (30 min): create one sandbox order in PHP. *Done when:* `docs/hackathon-rules.md` records whether PHP works; if not, switch the PayPal demo currency to USD and note it.
- [ ] **T2.3** Schema: `payments`, `payment_matches`; add `paypal_order_id` and `idempotency_key` to invoice payment requests. Migration applied.
- [ ] **T2.4** Payment adapter interface `createPaymentRequest / getStatus / verifyEvent` and `PayPalSandboxAdapter` using the Orders v2 API with `PayPal-Request-Id` for idempotency.
- [ ] **T2.5** Payment request flow (F8): "Send a payment request for INV-0001" or a button → approval → order created → pay link shown. *Done when:* clicking twice creates one order (test).
- [ ] **T2.6** Webhook endpoint (F9): verify signature via PayPal's verify-webhook-signature API, store raw event, dedupe by event ID, update payment and invoice status, write audit event with event ID. *Done when:* replaying the same event twice changes nothing the second time.
- [ ] **T2.7** `[you]` Register the webhook URL in the PayPal developer dashboard.
- [ ] **T2.8** Status UI: invoice shows `sent`, `paid`, `failed`, `cancelled`, with the PayPal event ID as evidence.

> **Checkpoint M4 (5 Nov, 10 PM):** sandbox buyer pays and the invoice turns `paid` through a verified webhook.

- [ ] **T2.9** Failure paths: cancelled checkout, expired order, capture failure. Each visible in the UI.
- [ ] **T2.10** Simple reconciliation: payment with exact amount and invoice reference matches automatically.

---

## Phase 3: Noir × Velo (6–8 Nov)

### 3.1 Go/no-go (6 Nov evening)

- [ ] **T3.1** `[you]` Find the official Noir × Velo rules: deadline, required integrations, submission format. Record in `docs/hackathon-rules.md`.
- [ ] **T3.2** Testnet spike, max 3 hours: from a plain script, register an agent policy in Noir `agent_registry` and run one payment through `payment_escrow`. Read current contract IDs from the Noir repo; do not hardcode old ones. *Done when:* one transaction hash for a successful policy-checked payment.
- [ ] **T3.3** Decide scope: full (T3.4–T3.11) or minimal (T3.4–T3.7 plus T3.11 with a minimal page). Record the decision.

> **Checkpoint M5 (6 Nov, midnight):** scope decided.

### 3.2 Build

- [ ] **T3.4** Config: network, contract IDs, asset, SDK version pinned. Testnet keys server-side only.
- [ ] **T3.5** Schema: `agent_policies`. Policy setup screen (F14): limit per payment, asset, expiry; writes on-chain and stores the tx hash.
- [ ] **T3.6** `StellarNoirAdapter` (F15): request payment for an approved invoice through `payment_escrow`; record success or contract refusal with tx hash.
- [ ] **T3.7** Ledger verification (F16): status read from the transaction result, explorer link shown.
- [ ] **T3.8** Currency handling: invoice in USD for this demo, or show conversion explicitly. No invented exchange rates.
- [ ] **T3.9** Velo integration (F17, P1) only if T3.2 showed a clear API.
- [ ] **T3.10** Combined payment history (F18, P2): PayPal and Stellar rows, each labelled with environment and currency.

### 3.3 Noir × Velo submission

- [ ] **T3.11** Demo flow: set limit → payment within limit succeeds → payment above limit is refused by the contract → both hashes in the audit trail.
- [ ] **T3.12** README section for this submission, with what was built before vs during.
- [ ] **T3.13** `[you]` Record video and submit by the confirmed deadline.
- [ ] **T3.14** `git tag noirvelo-submission && git push --tags`.

> **Checkpoint M6 (8 Nov, midnight):** submitted as it stands.

---

## Phase 2b: PayPal differentiators and submission (9–12 Nov)

### 2b.1 Features

- [ ] **T2.11** Reconciliation agent (F10): seed 5 messy payments (partial, overpayment, one payment for two invoices, different payer name, missing reference). Model proposes matches with reason and confidence; code checks amounts; anything below full confidence needs approval. *Done when:* all 5 matched or flagged correctly.
- [ ] **T2.12** Reconciliation review screen: proposed matches, reasons, approve or reassign.
- [ ] **T2.13** Overdue follow-up (F11): detect overdue invoices, draft a reminder with a fresh pay link, approve, then copy-ready message.
- [ ] **T2.14** Ask about payments (F12, P2): fixed set of questions answered from DB queries with record links.
- [ ] **T2.15** PayPal agent tooling (F13, P2): 30-minute evaluation; adopt only if it replaces existing code with less code.

> **Checkpoint M7 (10 Nov, 10 PM):** full PayPal demo flow recorded as a rough take.

### 2b.2 Hardening

- [ ] **T2.16** Feature freeze at noon, 11 Nov.
- [ ] **T2.17** Run `pnpm test`, `pnpm eval`, lint and build; fix failures.
- [ ] **T2.18** Security pass: no secrets in client bundle, webhook rejects unsigned events, server-side re-validation on every action.
- [ ] **T2.19** Accessibility and mobile pass using the traccoon-design-skill ship checklist.
- [ ] **T2.20** Reset and seed the demo environment.

### 2b.3 PayPal submission

- [ ] **T2.21** README final: features, PayPal APIs used, AI tools used and how, setup steps, sandbox test buyer credentials, eval results, built before vs during the hackathon with tag links.
- [ ] **T2.22** Confirm `LICENSE` shows in the GitHub About section and the repo is public.
- [ ] **T2.23** `[you]` Record the demo video (under 3 minutes, public on YouTube, no copyrighted music).
- [ ] **T2.24** `[you]` Fill in the Devpost form and submit by 6 PM PHT, 12 Nov.
- [ ] **T2.25** `git tag paypal-submission && git push --tags`.

> **Checkpoint M9 (12 Nov, 6 PM):** submitted. 13 Nov is buffer only.
