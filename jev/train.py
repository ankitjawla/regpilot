#!/usr/bin/env python3
"""Train the Jev local small models.

Four independent text classifiers, all TF-IDF + LogisticRegression with
CalibratedClassifierCV (sigmoid) so predict_proba is an honest confidence:
  - category_clf    : Capital | Liquidity | AML-BSA | Consumer Compliance | Operational Risk | Other
  - urgency_clf     : low | medium | high | critical
  - jurisdiction_clf: OCC | Federal Reserve | SEC | FinCEN | CFPB | State | Other
  - injection_clf   : legitimate (0) | injection (1)

Also verifies the deterministic PII redaction layer against jev/data/pii.jsonl
(fake values only) and writes jev/meta.json + jev/README.md.

Quality bar: >= 0.85 holdout accuracy per task, else the script exits non-zero
so template quality problems are caught, not shipped.
"""

import datetime
import json
import os
import sys

import joblib
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.pipeline import Pipeline

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pii_regex import redact_pii  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
MODELS_DIR = os.path.join(HERE, "models")
ACCURACY_BAR = 0.85
SIZE_BUDGET_BYTES = 30 * 1024 * 1024

TASKS = {
    "category": ("train.jsonl", "holdout.jsonl", "category"),
    "urgency": ("train.jsonl", "holdout.jsonl", "urgency"),
    "jurisdiction": ("train.jsonl", "holdout.jsonl", "jurisdiction"),
    "injection": ("injection_train.jsonl", "injection_holdout.jsonl", "injection"),
}


def load(path):
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]


def make_pipeline():
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=15000,
            ngram_range=(1, 2),
            sublinear_tf=True,
            min_df=2,
        )),
        ("clf", CalibratedClassifierCV(
            LogisticRegression(C=2.0, max_iter=2000, class_weight="balanced"),
            cv=3,
            method="sigmoid",
        )),
    ])


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    meta = {
        "version": "jev-local-v1",
        "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "approach": "TF-IDF (15k features, 1-2 grams) + LogisticRegression, "
                    "probability-calibrated with CalibratedClassifierCV (sigmoid, cv=3). "
                    "Trained on template-synthesized fictional regulatory text.",
        "tasks": {},
    }
    failed = []

    for task, (train_f, hold_f, label_key) in TASKS.items():
        train_rows = load(os.path.join(DATA_DIR, train_f))
        hold_rows = load(os.path.join(DATA_DIR, hold_f))
        X_train = [r["text"] for r in train_rows]
        y_train = [r[label_key] for r in train_rows]
        X_hold = [r["text"] for r in hold_rows]
        y_hold = [r[label_key] for r in hold_rows]

        print(f"\n=== {task}: {len(X_train)} train / {len(X_hold)} holdout ===")
        pipe = make_pipeline()
        pipe.fit(X_train, y_train)
        pred = pipe.predict(X_hold)
        acc = accuracy_score(y_hold, pred)
        print(f"holdout accuracy: {acc:.4f}")
        print(classification_report(y_hold, pred, zero_division=0))

        path = os.path.join(MODELS_DIR, f"{task}_clf.joblib")
        joblib.dump(pipe, path)
        size = os.path.getsize(path)
        print(f"saved {path} ({size / 1024:.0f} KB)")

        meta["tasks"][task] = {
            "accuracy": round(float(acc), 4),
            "n_train": len(X_train),
            "n_holdout": len(X_hold),
            "classes": sorted(set(str(c) for c in y_train)),
            "size_kb": round(size / 1024, 1),
        }
        if acc < ACCURACY_BAR:
            failed.append((task, acc))

    # ---- PII redaction verification (deterministic layer, fake values only)
    pii_rows = load(os.path.join(DATA_DIR, "pii.jsonl"))
    missed = 0
    for r in pii_rows:
        redacted, found = redact_pii(r["text"])
        leftover = any(tok in redacted for tok in ("999-99-9999", "078-05-1120", "123-45-6789",
                                                  "(555)", "@example."))
        if not found or leftover:
            missed += 1
            print("PII MISS:", r["text"][:80], "->", redacted[:80])
    print(f"\nPII redaction check: {len(pii_rows) - missed}/{len(pii_rows)} fully redacted")
    meta["pii_check"] = {"total": len(pii_rows), "fully_redacted": len(pii_rows) - missed}

    total_size = sum(
        os.path.getsize(os.path.join(MODELS_DIR, f))
        for f in os.listdir(MODELS_DIR) if f.endswith(".joblib"))
    meta["total_size_kb"] = round(total_size / 1024, 1)
    meta["total_size_mb"] = round(total_size / 1024 / 1024, 2)
    print(f"\nTotal model size: {total_size / 1024 / 1024:.2f} MB "
          f"(budget {SIZE_BUDGET_BYTES / 1024 / 1024:.0f} MB)")
    if total_size > SIZE_BUDGET_BYTES:
        failed.append(("size-budget", total_size))
    if missed:
        failed.append(("pii-redaction", missed))

    with open(os.path.join(HERE, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print("wrote jev/meta.json")
    write_readme(meta)

    if failed:
        print("\nQUALITY BAR FAILED:", failed)
        sys.exit(1)
    print("\nAll quality bars passed.")


def write_readme(meta):
    lines = [
        "# Jev local model (jev-local-v1)",
        "",
        "A real, trained small ML model that runs inside the RegPilot app — no API calls,",
        "no GPU, no cost per call. It handles the jobs a giant LLM is overkill for:",
        "triage classification, prompt-injection screening, and confidence scoring.",
        "",
        "## Approach",
        "",
        "- **Synthetic training data** (`synthesize.py`): template-based generation with slot",
        "  filling across 6 regulatory categories, 4 urgency levels, 7 jurisdictions, plus a",
        "  balanced prompt-injection corpus (overt + embedded attacks vs. legitimate text,",
        "  including tricky benign negatives). All fictional; PII examples use fake values",
        "  (`999-99-9999` style) and are used only to verify redaction, never for training.",
        "- **Model** (`train.py`): per task, `TfidfVectorizer` (15k features, 1–2 grams,",
        "  sublinear TF) + `LogisticRegression` wrapped in `CalibratedClassifierCV`",
        "  (sigmoid, cv=3), so `predict_proba` is an *honest* confidence — the value the",
        "  router and the confidence gate actually consume.",
        "- **Serving** (`api/jev.py`): Vercel Python serverless function, models loaded once",
        "  into a module-level cache. Typical warm latency is tens of milliseconds.",
        "",
        "## Why regex-first for PII",
        "",
        "The deterministic regex layer (`pii_regex.py`, ported 1:1 from `lib/redact.ts`) is",
        "the *primary* PII defense and runs before any model sees the text:",
        "",
        "- SSNs, phone numbers, emails and account numbers follow rigid formats — a regex",
        "  matches them with near-perfect recall, while an ML model can only approximate",
        "  and will miss edge cases.",
        "- It is explainable to examiners and auditable: every redaction is logged with the",
        "  pattern that fired.",
        "- It runs in microseconds with zero dependencies — no model round-trip.",
        "",
        "The ML model is the *second opinion* for ambiguous cases, never the first line.",
        "",
        "## Results",
        "",
        f"Trained: {meta['trained_at']}",
        f"Total model size on disk: {meta['total_size_mb']} MB",
        f"PII redaction verification: {meta['pii_check']['fully_redacted']}/{meta['pii_check']['total']} synthetic examples fully redacted",
        "",
        "| Task | Holdout accuracy | Train / holdout | Classes |",
        "|------|------------------|-----------------|---------|",
    ]
    for task, t in meta["tasks"].items():
        lines.append(
            f"| {task} | {t['accuracy']:.4f} | {t['n_train']} / {t['n_holdout']} | {len(t['classes'])} |"
        )
    lines += [
        "",
        "Quality bar: ≥ 0.85 holdout accuracy per task (`train.py` exits non-zero otherwise).",
        "",
        "## Reproducing",
        "",
        "```bash",
        "cd jev",
        "python3 -m venv .venv && .venv/bin/pip install -r ../requirements.txt",
        ".venv/bin/python synthesize.py   # regenerates data/ (seeded, deterministic)",
        ".venv/bin/python train.py        # trains, verifies, writes models/ + meta.json",
        "```",
        "",
        "## Files",
        "",
        "- `synthesize.py` — template-based synthetic data generator",
        "- `train.py` — training + verification + this README",
        "- `pii_regex.py` — deterministic redaction + injection screen (port of lib/redact.ts)",
        "- `data/` — generated JSONL corpora (regenerable, seeded)",
        "- `models/` — trained `*.joblib` pipelines (committed so Vercel serves them)",
        "- `meta.json` — accuracies, sizes, class lists (surfaced in the dashboard)",
    ]
    with open(os.path.join(HERE, "README.md"), "w") as f:
        f.write("\n".join(lines) + "\n")
    print("wrote jev/README.md")


if __name__ == "__main__":
    main()
