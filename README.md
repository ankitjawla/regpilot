# RegPilot — Regulatory Reporting AI Console

A working demo of the **small-model ("Jev") pattern**: a cheap small model handles
triage, guardrails and confidence scoring, while Azure OpenAI (`gpt-5.4`) is reserved
for heavy drafting. A router picks the path per item, and a confidence gate decides
what a human must review. Every decision lands in an audit table.

## How it works

```
paste / upload / sample
        │
        ▼
┌───────────────┐
│  GUARDRAIL    │  regex PII redaction FIRST (SSN, account #, phone, email, names)
│  (jev-small)  │  + regex injection screen + small-model second opinion
└───────┬───────┘  blocked inputs never reach the large model
        ▼
┌───────────────┐
│  TRIAGE       │  small model → category / urgency / jurisdiction / confidence
│  (jev-small)  │
└───────┬───────┘
        ▼
┌───────────────┐
│  ROUTER       │  high-confidence + routine → FAST PATH (small model drafts)
│  (rules)      │  critical / novel / low-confidence → FULL ANALYSIS (gpt-5.4)
└───────┬───────┘
        ▼
┌───────────────┐
│  OBLIGATIONS  │  large model, JSON mode → owner / action / due date / source quote
│  + MEMO       │  routed model drafts the regulatory memo
└───────┬───────┘
        ▼
┌───────────────┐
│  CONFIDENCE   │  small model scores the draft 0–1 with reasons
│  GATE         │  >0.90 auto-approve · 0.50–0.90 human confirm · <0.50 human review
└───────────────┘
```

All samples are **fictional** and labeled as such. The PII sample uses obviously fake
values (`999-99-9999`, `(555) 010-2030`, `example.com`) to demo redaction.

## The small-model slot

`AZURE_OPENAI_SMALL_DEPLOYMENT` is the cheap-model deployment used for guardrail,
triage and confidence calls. If it is unset, the code falls back to
`AZURE_OPENAI_DEPLOYMENT` (currently `gpt-5.4`) — the architecture is identical, but
**point it at a real small deployment (e.g. `gpt-4o-mini`) to light up the cost
savings** the router is designed for.

## Env vars (Vercel: Production + Preview)

| Var | Purpose |
|---|---|
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key (server-side only) |
| `AZURE_OPENAI_ENDPOINT` | e.g. `https://<resource>.openai.azure.com` |
| `AZURE_OPENAI_API_VERSION` | e.g. `2024-12-01-preview` |
| `AZURE_OPENAI_DEPLOYMENT` | heavy model (`gpt-5.4`) |
| `AZURE_OPENAI_SMALL_DEPLOYMENT` | cheap model slot (see above) |
| `DATABASE_URL` | Neon Postgres (tables self-create on first use) |

Never commit `.env*` — `.gitignore` covers them.

## Database

Tables (prefixed `regpilot_`) are created automatically on first query —
no manual migration step:

- `regpilot_items` — triage result, route, confidence, status
- `regpilot_obligations` — extracted obligations per item
- `regpilot_drafts` — memo text + which model drafted it
- `regpilot_audit` — every model + human decision (actor, action, detail, timestamp)

## API

- `POST /api/triage` — `{text, title?}` → guardrail + triage + route
- `POST /api/analyze` — `{itemId}` → obligations + memo + confidence + gate
- `GET /api/review` — review queue · `POST /api/review` — approve / request changes
- `GET /api/audit` — filterable audit log (`?actor=&q=&item_id=`)
- `GET /api/samples` — the five fictional samples
- `GET /api/stats` — dashboard numbers

## Develop

```bash
npm install
npm run dev
```
