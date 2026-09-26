import { Pool } from "pg";

// Neon Postgres. Tables are created lazily on first use so a fresh deploy
// self-initializes without a separate migration step.
let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not configured");
    pool = new Pool({
      connectionString,
      max: 3,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS regpilot_items(
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  source_text_redacted TEXT NOT NULL,
  category TEXT,
  urgency TEXT,
  jurisdiction TEXT,
  confidence DOUBLE PRECISION,
  fast_path BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'triaged',
  policy_version INTEGER,
  preset TEXT,
  judgments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS regpilot_obligations(
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES regpilot_items(id) ON DELETE CASCADE,
  owner TEXT,
  action TEXT,
  due_date TEXT,
  source_quote TEXT,
  due_date_iso TEXT,
  date_confidence DOUBLE PRECISION,
  needs_review BOOLEAN DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS regpilot_drafts(
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES regpilot_items(id) ON DELETE CASCADE,
  memo_text TEXT NOT NULL,
  model_used TEXT
);
CREATE TABLE IF NOT EXISTS regpilot_audit(
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES regpilot_items(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_regpilot_audit_item ON regpilot_audit(item_id);
CREATE INDEX IF NOT EXISTS idx_regpilot_items_status ON regpilot_items(status);
CREATE TABLE IF NOT EXISTS regpilot_agent_config(
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS regpilot_custom_samples(
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  framework TEXT NOT NULL DEFAULT 'Custom',
  label TEXT NOT NULL DEFAULT 'CUSTOM SAMPLE',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS regpilot_eval_runs(
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sample_count INTEGER NOT NULL DEFAULT 0,
  summary JSONB NOT NULL,
  suggestions JSONB,
  policy_version INTEGER
);
`;

/** Idempotent column adds for examiner provenance + cookbook fields. */
const SCHEMA_MIGRATIONS = `
ALTER TABLE regpilot_items ADD COLUMN IF NOT EXISTS policy_version INTEGER;
ALTER TABLE regpilot_items ADD COLUMN IF NOT EXISTS preset TEXT;
ALTER TABLE regpilot_items ADD COLUMN IF NOT EXISTS judgments JSONB;
ALTER TABLE regpilot_obligations ADD COLUMN IF NOT EXISTS due_date_iso TEXT;
ALTER TABLE regpilot_obligations ADD COLUMN IF NOT EXISTS date_confidence DOUBLE PRECISION;
ALTER TABLE regpilot_obligations ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE;
`;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await getPool().query(SCHEMA);
      await getPool().query(SCHEMA_MIGRATIONS);
    })().catch((e) => {
      schemaReady = null; // retry next time
      throw e;
    });
  }
  return schemaReady;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  await ensureSchema();
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

export async function audit(
  itemId: number | null,
  actor: string,
  action: string,
  detail?: string
): Promise<void> {
  await query(
    `INSERT INTO regpilot_audit(item_id, actor, action, detail) VALUES ($1,$2,$3,$4)`,
    [itemId, actor, action, detail ?? null]
  );
}
