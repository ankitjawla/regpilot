import { query, audit } from "@/lib/db";
import {
  DEFAULT_AGENT_CONFIG,
  normalizeAgentConfig,
  type AgentConfig,
} from "@/lib/agents";

let cache: { config: AgentConfig; at: number } | null = null;
const CACHE_MS = 5_000;

export async function getAgentConfig(): Promise<AgentConfig> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.config;
  try {
    const rows = await query<{ config: AgentConfig }>(
      `SELECT config FROM regpilot_agent_config WHERE id=1`
    );
    const config = rows[0]?.config
      ? normalizeAgentConfig(rows[0].config)
      : structuredClone(DEFAULT_AGENT_CONFIG);
    cache = { config, at: Date.now() };
    return config;
  } catch {
    return structuredClone(DEFAULT_AGENT_CONFIG);
  }
}

export async function saveAgentConfig(
  incoming: unknown
): Promise<AgentConfig> {
  const config = normalizeAgentConfig(incoming);
  config.updatedAt = new Date().toISOString();
  const prev = await getAgentConfig();
  config.version = (prev.version || 1) + 1;

  await query(
    `INSERT INTO regpilot_agent_config(id, config, updated_at)
     VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET config=$1::jsonb, updated_at=NOW()`,
    [JSON.stringify(config)]
  );
  await audit(
    null,
    "human",
    "agents.config_update",
    `version=${config.version}`
  );
  cache = { config, at: Date.now() };
  return config;
}

export function clearAgentConfigCache() {
  cache = null;
}
