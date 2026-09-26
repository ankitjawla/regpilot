# RegPilot — Regulatory Reporting AI Console

A working demo of the **System One + LLM pattern**: TypeSafe's **Jev** (System One)
handles triage, guardrails and confidence scoring with typed judgments, while
Azure OpenAI (`gpt-5.4`) is reserved for heavy drafting. A router picks the path
per item, and a confidence gate decides what a human must review. Every decision
lands in an audit table.

> **Jev is TypeSafe System One** (`POST https://api.typesafe.ai/v1/systemone`) via
> `@typesafe-ai/sdk`. Local TF-IDF classifiers in `jev/` remain as automatic
> fallback when `TYPESAFE_API_KEY` is unset or unreachable; Azure small deployment
> is the final fallback. See [jev/README.md](jev/README.md) and
> [TypeSafe docs](https://docs.typesafe.ai/).

## How it works

```
paste / upload / sample
        │
        ▼
┌───────────────┐
│  GUARDRAIL    │  regex PII redaction FIRST (SSN, account #, phone, email, names)
│  (Jev / S1)   │  + TypeSafe Noul injection screen (+ regex)
└───────┬───────┘  blocked inputs never reach the large model
        ▼
┌───────────────┐
│  TRIAGE       │  TypeSafe Choice → category / urgency / jurisdiction + confidence
│  (Jev / S1)   │
└───────┬───────┘
        ▼
┌───────────────┐
│  ROUTER       │  high-confidence + routine → FAST PATH (Azure small drafts)
│  (rules)      │  critical / novel / low-confidence → FULL ANALYSIS (gpt-5.4)
└───────┬───────┘
        ▼
┌───────────────┐
│  OBLIGATIONS  │  Azure large model, JSON mode → owner / action / due date / quote
│  + MEMO       │  Azure drafts the regulatory memo (System One does not generate text)
└───────┬───────┘
        ▼
┌───────────────┐
│  GROUNDING    │  TypeSafe Nouls: obligations vs source; invented-claims screen
│  (Jev / S1)   │  soft-fail caps confidence (≤0.49) before the gate
└───────┬───────┘
        ▼
┌───────────────┐
│  CONFIDENCE   │  TypeSafe Nouls + Score → composite 0–1 with reasons
│  GATE         │  >0.90 auto-approve · 0.50–0.90 human confirm · <0.50 human review
└───────────────┘
```

All samples are **fictional** and labeled as such. The PII sample uses obviously fake
values (`999-99-9999`, `(555) 010-2030`, `example.com`) to demo redaction.

## Decision-layer priority

1. **TypeSafe System One** (`TYPESAFE_API_KEY`) — primary for guardrail / triage / confidence
2. **Local jev** (`api/jev.py` + `jev/models`) — offline fallback
3. **Azure small deployment** (`AZURE_OPENAI_SMALL_DEPLOYMENT`) — final fallback

`AZURE_OPENAI_DEPLOYMENT` (`gpt-5.4`) always handles obligation extraction and full-path
memo drafting. Fast-path memo drafting uses the small Azure deployment when set.

## Env vars (Vercel: Production + Preview + Development)

| Var | Purpose |
|---|---|
| `TYPESAFE_API_KEY` | TypeSafe API key from [console.typesafe.ai](https://console.typesafe.ai/settings/keys) |
| `TYPESAFE_MODEL` | optional, default `jev-latest` |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key (server-side only) |
| `AZURE_OPENAI_ENDPOINT` | e.g. `https://<resource>.cognitiveservices.azure.com` |
| `AZURE_OPENAI_API_VERSION` | e.g. `2024-12-01-preview` |
| `AZURE_OPENAI_DEPLOYMENT` | heavy model (`gpt-5.4`) |
| `AZURE_OPENAI_SMALL_DEPLOYMENT` | cheap model for fast-path drafting (optional) |
| `DATABASE_URL` | Neon Postgres (tables self-create on first use) |

Never commit `.env*` — `.gitignore` covers them. Copy `.env.example` to `.env.local`.

## Database

Tables (prefixed `regpilot_`) are created automatically on first query —
no manual migration step:

- `regpilot_items` — triage result, route, confidence, status
- `regpilot_obligations` — extracted obligations per item
- `regpilot_drafts` — memo text + which model drafted it
- `regpilot_audit` — every model + human decision (actor, action, detail, timestamp)

## API

- `POST /api/triage` — `{text, title?}` → guardrail + triage + route
- `POST /api/analyze` — `{itemId}` → obligations + memo + confidence + grounding + gate
- `POST /api/pipeline` — `{text, title?}` → one-shot triage → draft → grounding → gate
- `GET /api/detail?item_id=` — examiner package (item + obligations + draft + audit + grounding)
- `GET /api/export?item_id=&format=json|md` — downloadable examiner package
- `GET /api/review` — review queue · `POST /api/review` — `{itemId|itemIds, decision, note?}` approve / request changes (bulk up to 50)
- `GET /api/audit` — filterable audit log (`?actor=&q=&item_id=`)
- `GET /api/samples` — fictional + custom samples (CCAR, Dodd-Frank, COREP, FINREP, Call Report, BSA/AML, …)
- `POST /api/samples` · `DELETE /api/samples?id=` — save / delete operator custom samples
- `GET /api/agents` · `PUT /api/agents` — editable agent policy (thresholds / labels / draft prompts / console branding)
- `POST /api/agents` — `{reset:true}` or `{preset:"strict"|"balanced"|"lenient"|"exam_ready"}`
- `GET /api/stats` — dashboard numbers (incl. grounding soft-fail count)
- `GET /api/jevmeta` — TypeSafe + local model metadata
- `GET /api/health` — readiness (TypeSafe / Azure / DB configured; no secrets)

UI: `/settings` presets + memo/export prompts · `/agents` thresholds · `/workflow` live map · `/items/[id]` package + framework playbooks · Review filters/bulk.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
npm run smoke                # end-to-end TypeSafe + Azure + Neon checks
```
