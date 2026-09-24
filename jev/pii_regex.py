"""Deterministic PII redaction + prompt-injection screen.

Python port of the TypeScript layer in lib/redact.ts — kept in sync deliberately.
This is the PRIMARY PII layer: it runs before any model (local or remote) sees
the text, so PII handling is deterministic rather than probabilistic.

Why regex-first is the right call here:
  * SSNs, phone numbers, emails and account numbers follow rigid formats that a
    regex matches with ~100% recall on known patterns; an ML model can only
    approximate this and will miss edge cases.
  * It is explainable to examiners ("show me the rule") and auditable — each
    redaction is logged with the pattern that fired.
  * It runs in microseconds with zero dependencies, versus a model round-trip.
  * The small ML model is the *second* opinion for ambiguous cases (free-text
    names without labels, novel exfiltration phrasing), not the first line.
"""

import re

PII_PATTERNS = [
    ("SSN", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    # account number: the keyword must be followed by a token containing a digit,
    # so "Customer complaint" no longer false-positives.
    ("account number", re.compile(
        r"\b(?:account|acct\.?|member|customer)\s*(?:no\.?|number|#)?\s*:?\s*"
        r"(?=[A-Za-z0-9\-]*\d)[A-Za-z0-9][A-Za-z0-9\-]{3,}\b", re.IGNORECASE)),
    # phone: no leading \b before "(...)"; there is no word boundary between a
    # space and "(" so the old pattern missed "(555) 010-2030" after a space.
    ("phone number", re.compile(r"(?:\(\d{3}\)\s?|\b\d{3}[-.\s])\d{3}[-.\s]\d{4}\b")),
    ("email address", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("personal name", re.compile(
        r"\b(?:borrower|customer|client|name|officer)\s*:\s*"
        r"[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,2}")),
]

TOKENS = {
    "SSN": "[SSN REDACTED]",
    "account number": "[ACCOUNT REDACTED]",
    "phone number": "[PHONE REDACTED]",
    "email address": "[EMAIL REDACTED]",
    "personal name": "[NAME REDACTED]",
}

INJECTION_RES = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.I),
    re.compile(r"disregard\s+(all\s+)?(previous|prior|above)\s+instructions", re.I),
    re.compile(r"reveal\s+(your\s+)?(system\s+prompt|instructions)", re.I),
    re.compile(r"jailbreak", re.I),
    re.compile(r"do\s+anything\s+now", re.I),
    re.compile(r"you\s+are\s+now\s+(a|an)\s+", re.I),
    re.compile(r"bypass\s+(the\s+)?(guardrail|filter|safety)", re.I),
    re.compile(r"\[system\]", re.I),
]


def redact_pii(text):
    """Returns (redacted_text, [labels found])."""
    redacted = text
    found = []
    for label, rx in PII_PATTERNS:
        if rx.search(redacted):
            found.append(label)
            redacted = rx.sub(TOKENS[label], redacted)
    return redacted, found


def injection_screen(text):
    """Returns (hit: bool, matched_pattern_source or None)."""
    for rx in INJECTION_RES:
        if rx.search(text):
            return True, rx.pattern
    return False, None
