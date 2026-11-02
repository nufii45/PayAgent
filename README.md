# Traccoon PayAgent

An AI agent for Filipino freelancers and small businesses: turn chat screenshots, Taglish instructions and voice notes into invoices you approve, then into payment requests and reconciled records.

**The model proposes, code validates, you approve, the payment provider confirms.** The model never calculates amounts or dates, never writes to the database, and never declares a payment successful.

Built for the Meta Global AI Developer Hackathon (Indie Developer track, "Build for Your World"), then extended for the PayPal AI Hackathon and Noir × Velo. See [`docs/PRD.md`](docs/PRD.md) and [`tasks.md`](tasks.md).

## Built during the Meta hackathon

All code in this repository was written from 3 Nov 2026, inside the hackathon building period (27 Oct to 4 Nov 2026). The commit history is the record. The Meta submission is tagged `meta-submission`.

## Run it locally

Requires Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL and the META_* values
pnpm db:migrate              # create tables in your Neon database
pnpm db:seed                 # demo clients and invoices
pnpm smoke                   # checks the Meta API (plain + tool call) and the database
pnpm dev
```

Other scripts: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS with Traccoon design tokens · Drizzle ORM on Neon Postgres · Meta Model API (Muse Spark 1.3, Muse Voice Transcribe) via the OpenAI-compatible SDK · Vitest

## License

MIT
