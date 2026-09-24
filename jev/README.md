# Jev local model (jev-local-v1)

> **Production primary path** is TypeSafe System One (`TYPESAFE_API_KEY` →
> `lib/typesafe.ts`). This local TF-IDF stack is the **offline fallback** when
> TypeSafe is unset or unreachable (then Azure small deployment as final fallback).

A real, trained small ML model that runs inside the RegPilot app — no API calls,
no GPU, no cost per call. It handles the jobs a giant LLM is overkill for:
triage classification, prompt-injection screening, and confidence scoring.

## Approach

- **Synthetic training data** (`synthesize.py`): template-based generation with slot
  filling across 6 regulatory categories, 4 urgency levels, 7 jurisdictions, plus a
  balanced prompt-injection corpus (overt + embedded attacks vs. legitimate text,
  including tricky benign negatives). All fictional; PII examples use fake values
  (`999-99-9999` style) and are used only to verify redaction, never for training.
- **Model** (`train.py`): per task, `TfidfVectorizer` (15k features, 1–2 grams,
  sublinear TF) + `LogisticRegression` wrapped in `CalibratedClassifierCV`
  (sigmoid, cv=3), so `predict_proba` is an *honest* confidence — the value the
  router and the confidence gate actually consume.
- **Serving** (`api/jev.py`): Vercel Python serverless function, models loaded once
  into a module-level cache. Typical warm latency is tens of milliseconds.

## Why regex-first for PII

The deterministic regex layer (`pii_regex.py`, ported 1:1 from `lib/redact.ts`) is
the *primary* PII defense and runs before any model sees the text:

- SSNs, phone numbers, emails and account numbers follow rigid formats — a regex
  matches them with near-perfect recall, while an ML model can only approximate
  and will miss edge cases.
- It is explainable to examiners and auditable: every redaction is logged with the
  pattern that fired.
- It runs in microseconds with zero dependencies — no model round-trip.

The ML model is the *second opinion* for ambiguous cases, never the first line.

## Results

Trained: 2026-09-24T13:40:43.178096+00:00
Total model size on disk: 2.03 MB
PII redaction verification: 40/40 synthetic examples fully redacted

| Task | Holdout accuracy | Train / holdout | Classes |
|------|------------------|-----------------|---------|
| category | 1.0000 | 960 / 240 | 6 |
| urgency | 1.0000 | 960 / 240 | 4 |
| jurisdiction | 0.9542 | 960 / 240 | 7 |
| injection | 0.8977 | 360 / 88 | 2 |

Quality bar: ≥ 0.85 holdout accuracy per task (`train.py` exits non-zero otherwise).

## Reproducing

```bash
cd jev
python3 -m venv .venv && .venv/bin/pip install -r ../requirements.txt
.venv/bin/python synthesize.py   # regenerates data/ (seeded, deterministic)
.venv/bin/python train.py        # trains, verifies, writes models/ + meta.json
```

## Files

- `synthesize.py` — template-based synthetic data generator
- `train.py` — training + verification + this README
- `pii_regex.py` — deterministic redaction + injection screen (port of lib/redact.ts)
- `data/` — generated JSONL corpora (regenerable, seeded)
- `models/` — trained `*.joblib` pipelines (committed so Vercel serves them)
- `meta.json` — accuracies, sizes, class lists (surfaced in the dashboard)
