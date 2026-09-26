"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PIPELINE_STAGE_IDS,
  isPipelineStageId,
  stagesFromPayload,
  type PipelineResultPayload,
  type PipelineStageId,
  type PipelineStreamMessage,
  type StageState,
} from "@/lib/pipeline-events";

const STORAGE_KEY = "regpilot.pipelineRun.v1";

export type StageRecord = {
  id: PipelineStageId;
  state: StageState;
  detail?: string;
};

export type PipelineRun = {
  id: string;
  status: "running" | "done" | "error";
  startedAt: string;
  finishedAt?: string;
  title: string;
  sourceText: string;
  itemId?: number;
  blocked?: boolean;
  fastPath?: boolean;
  stages: StageRecord[];
  /** How many SSE stage events were applied. Zero means the body was one JSON result. */
  stageEvents?: number;
  result?: PipelineResultPayload | null;
  error?: string;
};

type PipelineRunContextValue = {
  run: PipelineRun | null;
  hydrated: boolean;
  startPipeline: (input: { text: string; title: string }) => void;
  clearRun: () => void;
};

const PipelineRunContext = createContext<PipelineRunContextValue | null>(null);

function blankStages(): StageRecord[] {
  return PIPELINE_STAGE_IDS.map((id) => ({
    id,
    state: id === "intake" ? "running" : "pending",
  }));
}

function applyStage(run: PipelineRun, event: PipelineStreamMessage): PipelineRun {
  if (event.type !== "stage") return run;
  const stages = run.stages.map((s) =>
    s.id === event.id ? { ...s, state: event.state, detail: event.detail } : s
  );
  return { ...run, stages, stageEvents: (run.stageEvents ?? 0) + 1 };
}

/**
 * Prefer live SSE states. If none arrived, rebuild the trail from the result
 * so a JSON response cannot paint every later block as skipped.
 */
function finishFromPayload(run: PipelineRun, payload: PipelineResultPayload): PipelineRun {
  const blocked = Boolean(payload.blocked);
  const derived = stagesFromPayload(payload);
  const sawEvents = (run.stageEvents ?? 0) > 0;
  const stages: StageRecord[] = sawEvents
    ? run.stages.map((s) => {
        const next = derived.find((d) => d.id === s.id);
        if (!next) return s;
        if (s.state === "pending" || s.state === "running") {
          return {
            id: s.id,
            state: next.state,
            detail: s.detail || next.detail,
          };
        }
        return { ...s, detail: s.detail || next.detail };
      })
    : derived;
  return {
    ...run,
    status: "done",
    finishedAt: new Date().toISOString(),
    itemId: payload.itemId,
    blocked,
    fastPath: payload.route?.fastPath,
    result: payload,
    stages,
    error: undefined,
  };
}

/** Repair a stored run whose graph was saved before stage events were applied. */
function healRun(run: PipelineRun): PipelineRun {
  if (run.status !== "done" || !run.result || (run.stageEvents ?? 0) > 0) return run;
  const triage = run.stages.find((s) => s.id === "triage");
  const lied = Boolean(run.result.triage) && triage?.state === "skipped";
  if (!lied) return run;
  return { ...run, stages: stagesFromPayload(run.result) };
}

function readStored(): PipelineRun | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PipelineRun;
    if (!parsed || !Array.isArray(parsed.stages)) return null;
    if (parsed.status === "running") {
      return {
        ...parsed,
        status: "error",
        finishedAt: parsed.finishedAt || new Date().toISOString(),
        error:
          "This run stopped when the tab reloaded. Start the pipeline again from Intake.",
        stages: parsed.stages.map((s) =>
          s.state === "running" ? { ...s, state: "done" as const, detail: s.detail || "interrupted" } : s
        ),
      };
    }
    return healRun(parsed);
  } catch {
    return null;
  }
}

export function PipelineRunProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    setRun(readStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (!run) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(run));
    } catch {
      // Quota or private mode — in-memory state still works for this navigation.
    }
  }, [run, hydrated]);

  const clearRun = useCallback(() => {
    activeId.current = null;
    setRun(null);
  }, []);

  const startPipeline = useCallback((input: { text: string; title: string }) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `run-${Date.now()}`;
    activeId.current = id;
    const title =
      input.title.trim().slice(0, 120) ||
      input.text.trim().replace(/\s+/g, " ").slice(0, 80);
    const next: PipelineRun = {
      id,
      status: "running",
      startedAt: new Date().toISOString(),
      title,
      sourceText: input.text,
      stages: blankStages().map((s) =>
        s.id === "intake" ? { ...s, state: "done" } : s.id === "guardrail" ? { ...s, state: "running" } : s
      ),
    };
    setRun(next);

    void (async () => {
      const belongs = () => activeId.current === id;
      try {
        const res = await fetch("/api/pipeline", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ text: input.text, title: input.title }),
        });
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok && !contentType.includes("text/event-stream")) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          if (!belongs()) return;
          setRun((prev) =>
            prev && prev.id === id
              ? {
                  ...prev,
                  status: "error",
                  finishedAt: new Date().toISOString(),
                  error: d.error || "Pipeline failed",
                }
              : prev
          );
          return;
        }
        if (!res.body || !contentType.includes("text/event-stream")) {
          const d = (await res.json()) as PipelineResultPayload;
          if (!belongs()) return;
          if (!res.ok || d.error) {
            setRun((prev) =>
              prev && prev.id === id
                ? {
                    ...prev,
                    status: "error",
                    finishedAt: new Date().toISOString(),
                    error: d.error || "Pipeline failed",
                    result: d,
                  }
                : prev
            );
            return;
          }
          setRun((prev) => (prev && prev.id === id ? finishFromPayload(prev, d) : prev));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let settled = false;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";
          for (const chunk of chunks) {
            const line = chunk
              .split("\n")
              .filter((l) => l.startsWith("data:"))
              .map((l) => l.slice(5).trim())
              .join("");
            if (!line) continue;
            let msg: PipelineStreamMessage;
            try {
              msg = JSON.parse(line) as PipelineStreamMessage;
            } catch {
              continue;
            }
            if (!belongs()) return;
            if (msg.type === "stage" && isPipelineStageId(msg.id)) {
              setRun((prev) => (prev && prev.id === id ? applyStage(prev, msg) : prev));
            } else if (msg.type === "result") {
              settled = true;
              setRun((prev) =>
                prev && prev.id === id ? finishFromPayload(prev, msg.payload) : prev
              );
            } else if (msg.type === "error") {
              settled = true;
              setRun((prev) =>
                prev && prev.id === id
                  ? {
                      ...prev,
                      status: "error",
                      finishedAt: new Date().toISOString(),
                      error: msg.error,
                    }
                  : prev
              );
            }
          }
        }
        if (!belongs() || settled) return;
        setRun((prev) => {
          if (!prev || prev.id !== id || prev.status !== "running") return prev;
          return {
            ...prev,
            status: "error",
            finishedAt: new Date().toISOString(),
            error: "Pipeline stream ended before a result.",
          };
        });
      } catch (e) {
        if (!belongs()) return;
        setRun((prev) =>
          prev && prev.id === id
            ? {
                ...prev,
                status: "error",
                finishedAt: new Date().toISOString(),
                error: (e as Error).message || "Pipeline failed",
              }
            : prev
        );
      }
    })();
  }, []);

  const value = useMemo(
    () => ({ run, hydrated, startPipeline, clearRun }),
    [run, hydrated, startPipeline, clearRun]
  );

  return (
    <PipelineRunContext.Provider value={value}>{children}</PipelineRunContext.Provider>
  );
}

export function usePipelineRun(): PipelineRunContextValue {
  const ctx = useContext(PipelineRunContext);
  if (!ctx) {
    throw new Error("usePipelineRun must be used within PipelineRunProvider");
  }
  return ctx;
}
