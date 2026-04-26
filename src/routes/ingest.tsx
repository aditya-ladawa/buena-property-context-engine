import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { TerminalWindow } from "@/components/TerminalWindow";

export const Route = createFileRoute("/ingest")({
  head: () => ({
    meta: [
      { title: "Ingest Data - Buena" },
      { name: "description", content: "Run historic and incremental Buena context ingestion from the browser." },
    ],
  }),
  component: IngestPage,
});

type Delta = {
  day: string;
  path: string;
  fileCount: number;
  totalBytes: number;
  applied: boolean;
  manifest?: Record<string, unknown>;
};

type DeltasResponse = {
  running: boolean;
  noticed: number;
  message: string;
  deltas: Delta[];
};

type LogEvent = {
  id: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  data?: unknown;
  createdAt: string;
};

type StreamEvent =
  | { type: "log"; level: LogEvent["level"]; message: string; data?: unknown }
  | { type: "done"; result: unknown; deltas?: Delta[] }
  | { type: "error"; error: string };

const AGENT_API = import.meta.env.VITE_AGENT_API_URL ?? "http://localhost:8787";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function logColor(level: LogEvent["level"]) {
  if (level === "success") return "text-[var(--chart-3)]";
  if (level === "warning") return "text-[var(--chart-4)]";
  if (level === "error") return "text-destructive";
  return "text-[var(--chart-2)]";
}

function summarizeManifest(manifest: Record<string, unknown> | undefined) {
  if (!manifest) return "No delta manifest preview.";
  const entries = Object.entries(manifest).slice(0, 4);
  if (!entries.length) return "Empty delta manifest.";
  return entries.map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value).slice(0, 80) : String(value)}`).join(" | ");
}

function IngestPage() {
  const [deltas, setDeltas] = useState<Delta[]>([]);
  const [notice, setNotice] = useState("Loading incremental deltas...");
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [activeRun, setActiveRun] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const pushLog = (level: LogEvent["level"], message: string, data?: unknown) => {
    setLogs((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        level,
        message,
        data,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      },
    ]);
  };

  const loadDeltas = async () => {
    const response = await fetch(`${AGENT_API}/api/ingest/deltas`);
    if (!response.ok) throw new Error("Could not load incremental deltas");
    const data = (await response.json()) as DeltasResponse;
    setDeltas(data.deltas);
    setNotice(data.message);
    setRunning(data.running);
  };

  useEffect(() => {
    void loadDeltas().catch((error) => {
      setNotice(error instanceof Error ? error.message : "Could not load incremental deltas");
    });
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const runStream = async (label: string, url: string, body?: unknown) => {
    setRunning(true);
    setActiveRun(label);
    setLastResult(null);
    pushLog("info", `${label} requested from web UI.`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error(`Ingest request failed with ${response.status}`);
      if (!response.body) throw new Error("Ingest stream is unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleEvent = (event: StreamEvent) => {
        if (event.type === "log") {
          pushLog(event.level, event.message, event.data);
          return;
        }
        if (event.type === "done") {
          pushLog("success", `${label} completed.`);
          setLastResult(event.result);
          if (event.deltas) setDeltas(event.deltas);
          return;
        }
        pushLog("error", event.error);
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          handleEvent(JSON.parse(line) as StreamEvent);
        }
        if (done) break;
      }
      if (buffer.trim()) handleEvent(JSON.parse(buffer) as StreamEvent);
      await loadDeltas();
    } catch (error) {
      pushLog("error", error instanceof Error ? error.message : "Ingest failed");
    } finally {
      setRunning(false);
      setActiveRun(null);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden grid-bg flex flex-col">
      <SiteHeader />
      <div className="flex-1 min-h-0 overflow-hidden grid w-full grid-cols-1 gap-2 px-2 pb-2 pt-16 sm:px-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:px-3">
        <TerminalWindow title="INGEST.LOG" className="min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col p-3 sm:p-4">
            <div className="mb-3 grid gap-2 border border-border/70 bg-background/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span className="text-mono-xs text-foreground">HISTORIC DATA INGEST</span>
                <span className={running ? "text-[var(--chart-1)]" : "text-[var(--chart-3)]"}>{running ? `RUNNING ${activeRun ?? "INGEST"}` : "READY"}</span>
              </div>
              <p>
                Historic ingest scans the base `data/` set and skips `data/incremental/`. Re-runs are safe because unchanged sources are reused by hash/version.
              </p>
              <button
                type="button"
                disabled={running}
                onClick={() => void runStream("Historic ingest", `${AGENT_API}/api/ingest/historic`)}
                className="w-fit border border-border px-3 py-2 text-mono-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                RUN HISTORIC INGEST
              </button>
            </div>

            <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin border border-border/70 bg-background/20 p-3">
              {logs.length ? (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={log.id} className="border border-border/60 bg-background/40 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                        <span className={`min-w-0 flex-1 truncate ${logColor(log.level)}`}>{log.message}</span>
                        <span className="text-[0.62rem] text-muted-foreground">{log.createdAt}</span>
                      </div>
                      {log.data !== undefined && (
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap border border-border/50 bg-background/60 p-2 text-[0.68rem] text-muted-foreground">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
                  Run historic ingest or apply an incremental delta to stream terminal-style logs here.
                </div>
              )}
            </div>
          </div>
        </TerminalWindow>

        <TerminalWindow title="INCREMENTAL.DELTAS" className="min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col p-3 sm:p-4">
            <div className="mb-3 border border-border/70 bg-background/30 p-3 text-xs text-muted-foreground">
              <div className="mb-1 text-mono-xs text-foreground">{notice}</div>
              <div>Each update runs ingestion through that delta day. Already-ingested files are reused; changed files are reprocessed.</div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin border border-border/70 bg-background/20 p-3">
              <div className="grid gap-2">
                {deltas.map((delta) => (
                  <div key={delta.day} className="border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-mono-xs text-foreground">{delta.day.toUpperCase()}</div>
                        <div>{delta.path}</div>
                      </div>
                      <span className={delta.applied ? "text-[var(--chart-3)]" : "text-[var(--chart-1)]"}>{delta.applied ? "APPLIED" : "NEW"}</span>
                    </div>
                    <div className="mb-2 grid grid-cols-2 gap-2">
                      <div className="border border-border/50 px-2 py-1">Files: {delta.fileCount}</div>
                      <div className="border border-border/50 px-2 py-1">Size: {formatBytes(delta.totalBytes)}</div>
                    </div>
                    <div className="mb-3 line-clamp-2 leading-relaxed">{summarizeManifest(delta.manifest)}</div>
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => void runStream(`Update ${delta.day}`, `${AGENT_API}/api/ingest/incremental`, { day: delta.day })}
                      className="border border-border px-3 py-1.5 text-mono-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      {delta.applied ? "RE-RUN UPDATE" : "UPDATE"}
                    </button>
                  </div>
                ))}
                {!deltas.length && (
                  <div className="grid h-48 place-items-center text-center text-xs text-muted-foreground">
                    No `data/incremental/day-*` folders found.
                  </div>
                )}
              </div>
            </div>

            {lastResult !== null && (
              <details className="mt-3 border border-border/70 bg-background/30 p-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer text-mono-xs text-foreground">LAST RESULT JSON</summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap border border-border/50 bg-background/60 p-2 text-[0.68rem]">
                  {JSON.stringify(lastResult, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </TerminalWindow>
      </div>
    </div>
  );
}
