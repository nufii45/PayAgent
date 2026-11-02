# Traccoon PayAgent: Product Requirements

Draft v2 (updated with the official Meta participant guide) · 3 Nov 2026 · Owner: Imman (solo)

Source of truth for scope. Tasks live in [`tasks.md`](../tasks.md). If this file and `tasks.md` disagree, update both.

## 1. Summary

PayAgent is an AI financial operations assistant for Philippine freelancers and small businesses. It turns messy, real-world inputs (chat screenshots, Taglish instructions, payment notifications) into invoices, payment requests and reconciled records. A human approves every consequential action, and deterministic code plus payment-provider evidence decide what actually happens.

It is built in three phases, each tied to a hackathon:

| Phase | Hackathon | Theme | Submit by (PHT) | Official cutoff (PHT) |
| --- | --- | --- | --- | --- |
| 1 | Meta Global AI Developer Hackathon | Intelligence | 4 Nov, 11:59 PM | 5 Nov, 10:00 AM (4 Nov, 9:00 PM ET) |
| 2 | PayPal AI Hackathon | Payments and reconciliation | 12 Nov, 6:00 PM | 13 Nov, 4:00 AM |
| 3 | Noir × Velo Hackathon | Policy-bound on-chain payments | 8 Nov (unconfirmed) | Unconfirmed |

**Core principle:** the model proposes, code validates, the human approves, and the provider confirms. The model never computes amounts or dates, never writes to the database directly, and never declares a payment successful.

### Meta hackathon fit

- **Track:** Indie Developer (solo). **Problem statement:** Build for Your World.
- **Rubric:** Impact 30%, Use of Meta AI tooling 25%, Demo 25%, Technical depth 20%. Stage one is pass/fail on theme fit and real use of Meta models.
- **Bonus prizes targeted:** Best Agentic Use-Case (agent with tools and a multi-step workflow), Best Build on Meta Open Weight Models (runs on `muse-spark-open-1026` via Baseten), Most Viral (demo posted on X by 8 Nov).
- **Rules that shape the build:** public repo; everything demoed must be built during the building period (27 Oct to 4 Nov) and clearly identified as such; 3-minute demo video; no code or assets without rights.
- **Anti-project risk:** the guide lists "simple image analyzers" and "basic RAG". Screenshot input must be presented as one input to an agent workflow, never as the product.

## 2. Problem

Filipino freelancers and micro-businesses agree on work and prices in Messenger, Viber and email. They then retype those details into an invoice, send a payment link separately, and later check by hand which payments match which invoices. Partial payments, combined payments and payer names that differ from the client name make reconciliation slow and error-prone.

Existing AI assistants can draft an invoice, but they don't connect to verified payment state, and a form is already fast when the user knows every field. PayAgent's value is in the steps a form can't do: **reading unstructured inputs** and **matching messy payments to invoices with explanations**.

## 3. Target users

- **Primary:** a solo freelancer or consultant in the Philippines who invoices 5–30 clients a month, agrees on deals in chat apps, and gets paid through PayPal and other channels.
- **Secondary:** a small service business owner or bookkeeper who handles invoicing for a few clients.
- **Not targeted in the MVP:** accounting firms with multi-entity books, payroll, or tax filing.

## 4. Goals and non-goals

**Goals**

1. Turn an unstructured input into a correct, validated invoice draft in under 30 seconds.
2. Never create a record or payment without explicit approval.
3. Derive every payment status from provider evidence (PayPal webhooks, Stellar ledger), never from model output.
4. Keep a complete audit trail for each action: input, AI proposal, edits, approval, execution and verified outcome.
5. Ship three independently working, compliant hackathon submissions from one codebase.

**Non-goals for the MVP:** real-money transfers, mainnet settlement, crypto custody, full accounting, payroll, tax, multi-organization permissions, subscription billing, and integration with production Traccoon systems.

## 5. Product principles

1. **Proposal, never execution.** AI output is a typed proposal object. Only backend services perform actions.
2. **Deterministic money and time.** Amounts are integer centavos. Dates are resolved by code in the Asia/Manila timezone from a relative token the model returns, such as `next_friday`.
3. **Ask, don't guess.** When a required field is missing or ambiguous, the agent asks one targeted question.
4. **Show your evidence.** Every status shows its source, such as a PayPal event ID or a Stellar transaction hash.
5. **Clear environments.** Sandbox and testnet records are labelled everywhere they appear.

## 6. Feature requirements

Priorities: **P0** must ship for that phase's submission, **P1** ships if its checkpoint is met, **P2** is a stretch goal. Cut in reverse priority order.

### Phase 1: Meta (intelligence)

**F1. Natural-language invoice creation (P0)**

- Implemented as an **agent with tools**, not a single extraction call. The model plans and calls deterministic tools (`find_client`, `parse_amount`, `resolve_due_date`, `list_open_invoices`) and returns a proposal. Tools do the maths; the model never does. This targets Use of Meta AI tooling and Best Agentic Use-Case.
- The user types an instruction in English, Filipino or Taglish, for example "Gawan mo ng invoice si Client A, 2.5k consulting, due next Friday."
- A Meta model returns a proposal containing client, line items, amount (as text, such as "2.5k"), currency, relative due date and notes.
- Code parses the amount to centavos, resolves the date and validates the schema.
- *Acceptance:* the 10 scripted test inputs produce correct drafts. Invalid model output is rejected with a retry, and nothing is ever saved silently.

**F2. Missing-information follow-up (P0)**

- If a required field (client, amount or due date) is missing or ambiguous, the agent asks one specific question instead of filling it in.
- "Next Friday" asked on a Thursday or Friday triggers a confirmation that shows the exact date.
- *Acceptance:* the incomplete demo input produces a question, and answering it completes the draft.

**F3. Review and approval screen (P0)**

- The draft appears as an editable invoice card that shows the original input beside it.
- The user can edit any field, then choose Approve or Reject. Edits are recorded.
- *Acceptance:* no invoice row exists until Approve is pressed, and rejected drafts are logged but never saved as invoices.

**F4. Invoice records (P0)**

- Approved invoices are saved with a status of `draft`, `approved`, `sent`, `paid`, `partially_paid` or `void`, and a human-readable number such as `INV-0001`.
- The invoice list shows client, amount in ₱, due date and status.

**F5. Audit log (P0)**

- An append-only event log records each input, model proposal (including model name and latency), validation result, edit, approval and outcome.
- A simple timeline view is shown per invoice.

**F6. Screenshot-to-invoice (P1, the Meta differentiator)**

- The user uploads a screenshot of a chat where a price and job were agreed.
- A Meta vision model extracts the deal terms. The rest of the flow is the same as F1–F3, with the screenshot shown beside the draft.
- *Acceptance:* the three prepared screenshots produce correct drafts. Cut if not working by 1:00 PM on 4 Nov.

**F6b. Voice-note-to-invoice (P1, alternative differentiator)**

- The user records or uploads a short Taglish voice note. Muse Voice Transcribe produces text, which goes through the same agent flow as F1.
- Shows a second Meta model in a real workflow. Build only if F6 is done before 1:00 PM on 4 Nov, or instead of F6 if vision quality is poor.

**F7. Client memory (P2)**

- Known clients are matched by name, and the client's email and default currency are filled in automatically.

### Phase 2: PayPal (payments and reconciliation)

**F8. Payment request from an invoice (P0)**

- The instruction "Send a payment request for INV-0001" (or a button) creates a PayPal Sandbox order after approval.
- Each request has an idempotency key per invoice, so repeated clicks or retries never create duplicate orders.
- The output is a shareable pay link.

**F9. Verified payment status (P0)**

- A PayPal webhook endpoint verifies the event signature server-side, then updates the invoice status.
- Only verified events change status. The UI shows the event ID as evidence.
- Failed, cancelled and expired payments are shown as such.

**F10. Reconciliation agent (P1, the PayPal differentiator)**

- Incoming payments are matched to open invoices, including partial payments, overpayments, one payment covering two invoices, and a payer name that differs from the client.
- The agent proposes each match with a reason and a confidence level. Matches below full confidence need approval.
- *Acceptance:* the five seeded messy payments are matched correctly or flagged for review.

**F11. Overdue follow-up (P1)**

- For overdue invoices, the agent drafts a polite reminder containing a fresh pay link. The user approves before anything is sent (the MVP shows a copy-ready message).

**F12. Ask about payments (P2)**

- Questions such as "Who still owes me this month?" are answered from database queries, never from model memory, with links to the records.

**F13. PayPal agent tooling (P2)**

- Evaluate PayPal's current agent toolkit or MCP server for F8–F9. Adopt it only if it saves time. This targets the Agentic Commerce prize.

### Phase 3: Noir × Velo (policy-bound on-chain payments)

**F14. Agent spending policy (P0)**

- The user sets a limit per payment, an asset and an expiry for the agent, registered in Noir's `agent_registry` contract on Stellar testnet.
- The policy is shown in the UI along with its on-chain reference.

**F15. Policy-checked escrow payment (P0)**

- For an approved invoice, the agent requests a payment through `payment_escrow`. The contract checks the policy.
- *Demo requirement:* one payment within the limit succeeds, and one above the limit is **refused by the contract**. Both appear in the audit log with transaction hashes.

**F16. Ledger verification (P0)**

- Status comes from the transaction result on the ledger, linked to a block explorer.

**F17. Velo integration (P1)**

- Use Velo's API or escrow where it fits the payment flow. Cut if its SDK surface is unclear after the 6 Nov test.

**F18. Combined payment history (P2)**

- PayPal and Stellar records appear in one list, each labelled with its environment and currency.

## 7. AI design

- **Models:** Muse Spark through the Meta Model API for F1, F2, F6 (vision), F10 and F11; Muse Voice Transcribe for F6b. A provider switch also runs the agent on `meta-models/muse-spark-open-1026` via Baseten (not `muse-spark-open`, which the guide says not to use), so the project qualifies for the open-weight prize if quality holds on the eval set.
- **Provider layer:** one `ModelProvider` interface with `metaApi` and `baseten` implementations, selected by env var. The eval set runs against both.
- **Output contract:** JSON validated with a Zod schema. On failure, retry once with the validation error. After that, show an error and never save partial data.
- **What the model may return:** extracted fields, relative date tokens, raw amount strings, match proposals with reasons, and draft messages.
- **What the model may not do:** compute final amounts or dates, call payment APIs, write to the database, or state payment status.
- **Prompt safety:** text in uploads and screenshots is treated as data. The model's tool surface is limited to proposal schemas.
- **Evaluation:** before each submission, a fixed set of about 15 test inputs (text, Taglish, screenshots, edge cases) is run and its pass rate recorded in the README.

## 8. Data model (minimum)

- `clients` (id, name, email, aliases)
- `invoices` (id, number, client_id, currency, amount_centavos, due_date, status, created_from_request_id)
- `invoice_items` (invoice_id, description, amount_centavos)
- `agent_requests` (id, input_type, raw_input, model, proposal_json, validation_result, latency_ms)
- `approvals` (id, request_id, action, edits_json, decided_at)
- `payments` (id, provider, environment, external_id, amount, currency, status, evidence_json)
- `payment_matches` (payment_id, invoice_id, amount_centavos, confidence, reason, approved)
- `audit_events` (id, entity_type, entity_id, event_type, payload_json, created_at), append-only
- `agent_policies` (id, chain, contract_id, limit, asset, expires_at, tx_hash)

## 9. Architecture

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, styled with Traccoon design tokens.
- **Backend:** Next.js route handlers or server actions, with Drizzle or Prisma on Neon Postgres.
- **AI service:** a thin client for the Meta Model API, a proposal schema per action, and a validator.
- **Payment adapters** share one interface: `createPaymentRequest`, `getStatus` and `verifyEvent`. Implementations: `PayPalSandboxAdapter` and `StellarNoirAdapter`.
- **Hosting:** Vercel, deployed on day one. Webhooks need the public URL.
- **Secrets:** server-side environment variables only. Nothing reaches the client bundle.

## 10. Non-functional requirements

- **Correctness:** zero floating-point money, and every status change has an evidence reference.
- **Idempotency:** all payment-creating calls are keyed, and webhook handlers are safe to replay.
- **Latency:** a draft proposal appears in under 8 seconds for text and under 15 seconds for screenshots.
- **Reproducibility:** the README covers setup in under 10 minutes, with a seed script and demo credentials for sandbox and testnet.
- **Licensing:** the public repo is MIT-licensed, with the licence visible in the About section. No proprietary Traccoon code is included.
- **Meta new-work rule:** all Meta-demoed work is built 3–4 Nov, inside the building period. The README and video state this, and the git history shows it. Nothing built for PayPal or Noir × Velo after 4 Nov appears in the Meta video.
- **Disclosure:** each submission includes a "built before / built during this hackathon" section linking to git tags.

## 11. Demo scripts (each under 3 minutes)

**Meta (3 minutes, only work built 3–4 Nov):** a Messenger screenshot becomes a draft with the source shown beside it, then you approve it. A Taglish sentence becomes a draft. An incomplete request triggers a follow-up question and gets completed. Show the agent's tool calls in the timeline so judges see the multi-step reasoning. End on the audit timeline.

**PayPal:** an invoice becomes a pay link, the sandbox buyer pays, and the verified webhook marks it paid. Then three messy payments arrive, the agent proposes matches with reasons, and you approve the partial one. End on an overdue reminder with a fresh pay link.

**Noir × Velo:** set a ₱ limit as an on-chain policy. The agent pays an invoice within the limit and it succeeds. The agent then tries to pay above the limit and the **contract refuses it**. Show both transaction hashes in the audit trail.

## 12. Success metrics

- **Submission:** all three submitted before the self-imposed deadlines, each meeting its checklist (repo, licence, video, working demo).
- **Extraction accuracy:** at least 90% of the evaluation set produces a correct draft with no manual edits.
- **Safety:** zero actions executed without approval and zero status changes without evidence, verified by audit log queries.
- **Reconciliation:** all seeded messy payments are matched correctly or flagged.

## 13. Milestones and checkpoints

| Checkpoint | Date (PHT) | Must be true |
| --- | --- | --- |
| M1 | 3 Nov, 10 PM | F1–F5 work on the live URL |
| M2 | 4 Nov, 1 PM | F6 works, or is cut |
| M3 | 4 Nov, 11:59 PM | Meta submitted, `meta-submission` tagged (official cutoff 5 Nov, 10:00 AM PHT) |
| M4 | 5 Nov, 10 PM | F8–F9: one sandbox payment verified through the webhook |
| M5 | 6 Nov, midnight | Noir × Velo scope decided after the testnet test |
| M6 | 8 Nov, midnight | Noir × Velo submitted as is |
| M7 | 10 Nov, 10 PM | Full PayPal demo flow recorded |
| M8 | 11 Nov, noon | PayPal feature freeze |
| M9 | 12 Nov, 6 PM | PayPal submitted |

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| Solo schedule overrun | Hard checkpoints. When one is missed, cut to that phase's P0 features. |
| Meta model is unreliable at JSON output or Taglish | Schema validation and retry. Fall back to English demo inputs. |
| PayPal Sandbox handles PHP poorly | 30-minute test on 5 Nov. If it fails, switch the PayPal demo to USD. |
| Noir contracts change or are redeployed | Contract IDs live in config and the SDK version is pinned. Re-check addresses on 6 Nov. |
| No PHP asset on Stellar | Use a testnet stablecoin or a custom test asset and show conversion honestly, or invoice that demo in USD. |
| Meta API credits not active in time (credits come in batches and need a credit card) | Claim first thing on 3 Nov and set a spend limit. Baseten credits are not guaranteed, so open-weight support stays optional. |
| Project read as a "simple image analyzer" (a listed anti-project) | Lead the demo with the agent workflow and approval, not the screenshot parsing. |
| Rules on reusing code | Read each hackathon's rules, tag each submission, and include a built-before/during section. |

## 15. Open questions

1. What are the Noir × Velo official rules, required integrations and deadline?
2. ~~Which Meta models are eligible, and does the Meta hackathon restrict pre-existing code?~~ Answered by the participant guide: Muse Spark series, Muse Voice Transcribe and others via the API, or open weights (Muse Spark Open, Muse Glimmer); only work built 27 Oct to 4 Nov may be demoed.
3. Does PayPal Sandbox support PHP for the chosen API with a PH business account?
4. Does Velo expose an SDK or API suitable for invoice payments, or should Phase 3 use Noir contracts only?
