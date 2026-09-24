// Deterministic PII redaction. Runs BEFORE any text is sent to an LLM.

export type RedactResult = {
  redacted: string;
  redactions: string[]; // human-readable list of what was found, e.g. ["SSN", "account number"]
  piiFound: boolean;
};

const PATTERNS: { label: string; re: RegExp }[] = [
  { label: "SSN", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  {
    label: "account number",
    re: /\b(?:account|acct\.?|member|customer)\s*(?:no\.?|number|#)?\s*:?\s*[A-Za-z0-9][A-Za-z0-9-]{3,}\b/gi,
  },
  { label: "phone number", re: /\b(?:\(\d{3}\)\s?|\d{3}[-.\s])\d{3}[-.\s]\d{4}\b/g },
  {
    label: "email address",
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    label: "personal name",
    re: /\b(?:borrower|customer|client|name|officer)\s*:\s*[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,2}/g,
  },
];

const TOKEN: Record<string, string> = {
  SSN: "[SSN REDACTED]",
  "account number": "[ACCOUNT REDACTED]",
  "phone number": "[PHONE REDACTED]",
  "email address": "[EMAIL REDACTED]",
  "personal name": "[NAME REDACTED]",
};

export function redactPII(text: string): RedactResult {
  let redacted = text;
  const redactions: string[] = [];
  for (const { label, re } of PATTERNS) {
    // fresh regex each pass (global flag state)
    const rx = new RegExp(re.source, re.flags);
    if (rx.test(redacted)) {
      redactions.push(label);
      redacted = redacted.replace(new RegExp(re.source, re.flags), TOKEN[label]);
    }
  }
  return { redacted, redactions, piiFound: redactions.length > 0 };
}

// Cheap prompt-injection screen (the small model gets a second opinion).
const INJECTION_RES = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions)/i,
  /jailbreak/i,
  /do\s+anything\s+now/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /bypass\s+(the\s+)?(guardrail|filter|safety)/i,
  /\[system\]/i,
];

export function injectionScreen(text: string): { hit: boolean; matched?: string } {
  for (const re of INJECTION_RES) {
    if (re.test(text)) return { hit: true, matched: re.source };
  }
  return { hit: false };
}
