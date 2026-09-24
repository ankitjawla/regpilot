"""Jev local model — Vercel Python serverless function.

POST /api/jev {"text": "..."} (or {"op": "triage", "text": "..."}) ->
  {
    "category": ..., "category_confidence": ...,
    "urgency": ..., "urgency_confidence": ...,
    "jurisdiction": ..., "jurisdiction_confidence": ...,
    "injection_suspected": bool, "injection_confidence": ...,
    "injection_regex_hit": bool,
    "pii_found": [...], "redacted_text": "...",
    "overall_confidence": ..., "latency_ms": ..., "model": "jev-local-v1"
  }

POST /api/jev {"op": "score", "memo": "...", "obligations_count": n,
               "triage_confidence": x} ->
  { "score": ..., "reasons": [...], "latency_ms": ..., "model": "jev-local-v1" }

GET /api/jev -> health + model metadata.

No external API calls. Models are TF-IDF + LogisticRegression pipelines trained
on synthetic fictional data (see jev/). PII redaction is deterministic regex
(applied BEFORE classification); the classifiers only ever see redacted text.
"""

import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
JEV_DIR = os.path.normpath(os.path.join(HERE, "..", "jev"))
MODELS_DIR = os.path.join(JEV_DIR, "models")
if JEV_DIR not in sys.path:
    sys.path.insert(0, JEV_DIR)

import joblib  # noqa: E402

try:
    from pii_regex import redact_pii, injection_screen  # noqa: E402
except Exception:  # pragma: no cover - fallback if the module is missing
    redact_pii = None
    injection_screen = None

MODEL_VERSION = "jev-local-v1"
MAX_TEXT = 8000
MAX_BODY = 120_000

_cache = {}
_meta = None


def get_models():
    if not _cache:
        for name in ("category", "urgency", "jurisdiction", "injection"):
            path = os.path.join(MODELS_DIR, f"{name}_clf.joblib")
            if not os.path.exists(path):
                raise FileNotFoundError(f"model file missing: {path}")
            _cache[name] = joblib.load(path)
    return _cache


def get_meta():
    global _meta
    if _meta is None:
        try:
            with open(os.path.join(JEV_DIR, "meta.json")) as f:
                _meta = json.load(f)
        except Exception:
            _meta = {"version": MODEL_VERSION}
    return _meta


def predict(pipe, text):
    label = str(pipe.predict([text])[0])
    proba = pipe.predict_proba([text])[0]
    return label, float(proba.max())


def triage(text):
    # 1. Deterministic redaction FIRST — classifiers only see redacted text.
    if redact_pii is None:
        raise RuntimeError("pii_regex module unavailable")
    redacted, pii_found = redact_pii(text)

    # 2. Injection: regex screen OR model (either one fires -> suspected).
    rx_hit, _ = injection_screen(redacted)

    models = get_models()
    inj_label, inj_conf = predict(models["injection"], redacted)
    injection_suspected = bool(rx_hit or inj_label == "1")
    # Confidence reflects the model; a regex hit forces suspicion regardless.
    injection_confidence = max(inj_conf, 0.95) if rx_hit else inj_conf

    category, cat_conf = predict(models["category"], redacted)
    urgency, urg_conf = predict(models["urgency"], redacted)
    jurisdiction, jur_conf = predict(models["jurisdiction"], redacted)

    overall = round((cat_conf + urg_conf + jur_conf) / 3.0, 4)
    return {
        "category": category,
        "category_confidence": round(cat_conf, 4),
        "urgency": urgency,
        "urgency_confidence": round(urg_conf, 4),
        "jurisdiction": jurisdiction,
        "jurisdiction_confidence": round(jur_conf, 4),
        "injection_suspected": injection_suspected,
        "injection_confidence": round(injection_confidence, 4),
        "injection_regex_hit": bool(rx_hit),
        "pii_found": pii_found,
        "redacted_text": redacted,
        "overall_confidence": overall,
        "model": MODEL_VERSION,
    }


REQUIRED_SECTIONS = [
    "## Subject",
    "## Background",
    "## Key obligations",
    "## Recommended actions",
    "## Open questions",
]


def score_memo(memo, obligations_count, triage_confidence):
    """Deterministic heuristic quality score for a draft memo.

    Documented honestly: this is structural completeness + triage confidence,
    not a learned judgment. The human review queue remains the backstop.
    """
    reasons = []
    score = 0.35
    present = [s for s in REQUIRED_SECTIONS if s.lower() in memo.lower()]
    score += 0.09 * len(present)
    reasons.append(f"{len(present)}/5 required memo sections present")
    try:
        n_obl = int(obligations_count or 0)
    except (TypeError, ValueError):
        n_obl = 0
    if n_obl > 0:
        score += 0.08
        reasons.append(f"{n_obl} extracted obligation(s) available to the memo")
    else:
        reasons.append("no obligations extracted — verify coverage before approving")
    try:
        tc = max(0.0, min(1.0, float(triage_confidence)))
    except (TypeError, ValueError):
        tc = 0.5
    score += 0.12 * tc
    reasons.append(f"source triage confidence {tc:.2f} carried into the gate")
    if len(memo) < 200:
        score -= 0.15
        reasons.append("memo unusually short — may lack substance")
    score = max(0.05, min(0.95, round(score, 4)))
    return {"score": score, "reasons": reasons, "model": MODEL_VERSION}


class handler(BaseHTTPRequestHandler):
    def _send(self, status, obj):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        meta = get_meta()
        self._send(200, {"ok": True, "model": MODEL_VERSION, "meta": meta})

    def do_POST(self):
        start = time.perf_counter()
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self._send(400 if length <= 0 else 413,
                        {"error": "empty or oversized request body"})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            self._send(400, {"error": "invalid JSON"})
            return

        try:
            op = payload.get("op", "triage")
            if op == "score":
                result = score_memo(
                    str(payload.get("memo", ""))[:MAX_TEXT],
                    payload.get("obligations_count", 0),
                    payload.get("triage_confidence", 0.5),
                )
            else:
                text = str(payload.get("text", ""))[:MAX_TEXT]
                if len(text.strip()) < 20:
                    self._send(400, {"error": "text too short (min 20 chars)"})
                    return
                result = triage(text)
        except FileNotFoundError as e:
            self._send(503, {"error": "model unavailable", "detail": str(e)[:120]})
            return
        except Exception as e:  # fail closed; TS layer falls back to Azure
            self._send(500, {"error": "jev-local failed",
                             "detail": str(e)[:120]})
            return

        result["latency_ms"] = int((time.perf_counter() - start) * 1000)
        self._send(200, result)

    def log_message(self, *args):  # keep function logs quiet
        pass
