// Minimal Azure OpenAI chat-completions client (no SDK).
// All secrets stay server-side; errors never include key material.

export type ChatMsg = {
  role: "system" | "user" | "assistant";
  content: string;
};

function cfg() {
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/$/, "");
  const apiKey = process.env.AZURE_OPENAI_API_KEY || "";
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";
  if (!endpoint || !apiKey) {
    throw new Error("Azure OpenAI is not configured on the server");
  }
  return { endpoint, apiKey, apiVersion };
}

/** Small/cheap model slot ("Jev" role). Falls back to the main deployment if unset. */
export function smallDeployment(): string {
  return (
    process.env.AZURE_OPENAI_SMALL_DEPLOYMENT ||
    process.env.AZURE_OPENAI_DEPLOYMENT ||
    "gpt-5.4"
  );
}

/** Heavy model slot for full analysis and memo drafting. */
export function bigDeployment(): string {
  return process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5.4";
}

export function smallModelLabel(): string {
  return smallDeployment();
}

export async function azureChat(opts: {
  deployment: string;
  messages: ChatMsg[];
  json?: boolean;
  maxTokens?: number;
}): Promise<string> {
  const { endpoint, apiKey, apiVersion } = cfg();
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(
    opts.deployment
  )}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

  const body: Record<string, unknown> = {
    messages: opts.messages,
    // NOTE: gpt-5.x deployments reject `max_tokens`; they require `max_completion_tokens`.
    max_completion_tokens: opts.maxTokens ?? 1200,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Never include the key or full body in the error.
    const text = await res.text().catch(() => "");
    throw new Error(
      `Azure OpenAI request failed (HTTP ${res.status}): ${text.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.length) {
    throw new Error("Azure OpenAI returned an empty response");
  }
  return content;
}

/** Parse model JSON output, tolerating surrounding prose. */
export function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T;
    }
    throw new Error("Model did not return valid JSON");
  }
}
