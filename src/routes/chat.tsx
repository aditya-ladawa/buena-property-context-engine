import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SiteHeader } from "@/components/SiteHeader";
import { TerminalWindow } from "@/components/TerminalWindow";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat with Agent — Buena" },
      {
        name: "description",
        content:
          "Talk to the Buena context agent. Watch live property signals and the auto-updating Context.md.",
      },
      { property: "og:title", content: "Chat with Agent — Buena" },
      {
        property: "og:description",
        content: "Live property context, charted signals, and a self-updating Markdown brief.",
      },
    ],
  }),
  component: ChatPage,
});

type Msg = { role: "user" | "agent" | "tool"; content: string };
type Todo = { content: string; status: "pending" | "in_progress" | "completed" };
type ThreadSummary = { threadId: string; shortId: string; title: string; updatedAt: string };
type ThreadRecord = {
  threadId: string;
  title: string;
  messages: Msg[];
  todos: Todo[];
};
type AgentActivity = {
  id: string;
  phase: string;
  label: string;
  detail: string;
  createdAt: string;
};
type ChatStreamEvent =
  | { type: "delta"; content: string }
  | { type: "activity"; phase: string; label: string; detail: string }
  | { type: "todos"; todos: Todo[] }
  | { type: "done"; thread: ThreadRecord; todos?: Todo[] }
  | { type: "error"; error: string };

type ContextOverview = {
  title: string;
  generated: string;
  profile: string[];
  counts: { label: string; value: string }[];
  review: string[];
  snippets: { title: string; lines: string[] }[];
};
type ContextGraphNode = { id: string; label: string; type: string };
type ContextGraphEdge = { from: string; to: string; label: string };
type ContextGraph = { nodes: ContextGraphNode[]; edges: ContextGraphEdge[] };

type LiveBrief = {
  question: string;
  status: string;
  activeTool?: string;
  touchedTools: string[];
  ids: string[];
  answerPreview: string;
};

type CorrectionActivity = {
  correctionId?: string;
  correction?: string;
  section?: string;
  targetEntityIds: string[];
  targetSourceIds: string[];
  targetFactIds: string[];
};

const AGENT_API = import.meta.env.VITE_AGENT_API_URL ?? "http://localhost:8787";

type VoiceRecorder = {
  startedAt: number;
  stop: () => Promise<ArrayBuffer>;
  cancel: () => void;
};

function mergeAudioChunks(chunks: Float32Array[]) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function encodePcm16(samples: Float32Array, sourceSampleRate: number, targetSampleRate = 24000) {
  const ratio = sourceSampleRate / targetSampleRate;
  const outputLength = Math.max(1, Math.round(samples.length / ratio));
  const buffer = new ArrayBuffer(outputLength * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < outputLength; i += 1) {
    const sourceIndex = i * ratio;
    const leftIndex = Math.floor(sourceIndex);
    const rightIndex = Math.min(leftIndex + 1, samples.length - 1);
    const fraction = sourceIndex - leftIndex;
    const sample = (samples[leftIndex] ?? 0) * (1 - fraction) + (samples[rightIndex] ?? 0) * fraction;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return buffer;
}

async function createVoiceRecorder(): Promise<VoiceRecorder> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access is not available in this browser.");

  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio is not available in this browser.");

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const context = new AudioContextClass();
  await context.resume().catch(() => undefined);
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let stopped = false;

  processor.onaudioprocess = (event) => {
    if (stopped) return;
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };

  source.connect(processor);
  processor.connect(context.destination);

  const cleanup = async () => {
    if (stopped) return;
    stopped = true;
    processor.onaudioprocess = null;
    try {
      source.disconnect();
      processor.disconnect();
    } catch {
      // Already disconnected by a concurrent stop/cancel path.
    }
    stream.getTracks().forEach((track) => track.stop());
    await context.close().catch(() => undefined);
  };

  return {
    startedAt: Date.now(),
    stop: async () => {
      await cleanup();
      return encodePcm16(mergeAudioChunks(chunks), context.sampleRate);
    },
    cancel: () => {
      void cleanup();
    },
  };
}

async function readApiError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string; reason?: string; message?: string } | null;
  return body?.error ?? body?.reason ?? body?.message ?? fallback;
}

function extractSection(markdown: string, title: string) {
  const match = markdown.match(new RegExp(`## ${title}\\n\\n([\\s\\S]*?)(?=\\n<!-- BCE:SECTION|\\n## |$)`, "i"));
  return match?.[1]?.trim() ?? "";
}

function extractBullets(text: string, limit = 8) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^-\s*/, ""))
    .slice(0, limit);
}

function extractTableRows(text: string, limit = 5) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !/^\|\s*-/.test(line) && !line.includes("| ID |") && !line.includes("| Thread/Fact |"))
    .slice(1, limit + 1)
    .map((line) => line.replace(/^\|\s*/, "").replace(/\s*\|$/, "").split("|").map((cell) => cell.trim()).slice(0, 4).join(" · "));
}

function parseContextOverview(markdown: string): ContextOverview {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1] ?? "Context: LIE-001";
  const generated = markdown.match(/^Generated:\s*(.+)$/m)?.[1] ?? "unknown";
  const property = extractSection(markdown, "Property Profile");
  const buildings = extractSection(markdown, "Buildings");
  const units = extractSection(markdown, "Units");
  const owners = extractSection(markdown, "Owners");
  const tenants = extractSection(markdown, "Tenants");
  const invoices = extractSection(markdown, "Invoices");
  const communications = extractSection(markdown, "High-Signal Communications Queue") || extractSection(markdown, "Communications Needing Review");
  const risks = extractSection(markdown, "Risks / Needs Review");

  return {
    title,
    generated,
    profile: extractBullets(property, 6),
    counts: [
      { label: "Buildings", value: String(extractTableRows(buildings, 20).length) },
      { label: "Units", value: String(extractTableRows(units, 80).length) },
      { label: "Owners", value: String(extractTableRows(owners, 80).length) },
      { label: "Tenants", value: String(extractTableRows(tenants, 80).length) },
    ],
    review: [...extractBullets(invoices, 4), ...extractBullets(communications, 4), ...extractBullets(risks, 3)].slice(0, 8),
    snippets: [
      { title: "Invoice Review", lines: extractTableRows(invoices, 4) },
      { title: "Communication Triage", lines: extractTableRows(communications, 5) },
      { title: "Risks", lines: extractTableRows(risks, 4) },
    ],
  };
}

function sectionTitleFromId(sectionId: string | undefined) {
  const titles: Record<string, string> = {
    "property-profile": "Property Profile",
    buildings: "Buildings",
    units: "Units",
    owners: "Owners",
    tenants: "Tenants",
    contractors: "Contractors",
    financials: "Financials",
    invoices: "Invoices",
    documents: "Letters And Documents",
    "current-open-issues": "Current Open Issues",
    "recent-important-changes": "Recent Important Changes",
    "risks-needs-review": "Risks / Needs Review",
    "communications-review": "High-Signal Communications Queue",
    provenance: "Provenance And Source Of Truth",
  };
  return sectionId ? titles[sectionId] : undefined;
}

function extractContextIds(text: string) {
  return [...new Set(text.match(/\b(?:LIE|HAUS|EH|EIG|MIE|DL|INV|LTR|EMAIL|FACT|WI|CORR)-[A-Z0-9-]+\b/g) ?? [])].slice(0, 18);
}

function mergeUnique(current: string[], next: string[], limit = 18) {
  return [...new Set([...current, ...next])].slice(0, limit);
}

function parseActivityJson(detail: string) {
  try {
    return JSON.parse(detail) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function summarizeActivity(event: AgentActivity) {
  const data = parseActivityJson(event.detail);
  if (event.label === "create_context_correction" && event.phase === "tool_call") {
    const targets = Array.isArray(data?.targetEntityIds) ? data.targetEntityIds.join(", ") : "target IDs pending";
    return `Proposed correction for ${targets}`;
  }
  if (event.label === "create_context_correction" && event.phase === "tool_result") {
    const correctionId = event.detail.match(/CORR-[A-Z0-9]+/)?.[0];
    return correctionId ? `Recorded ${correctionId}` : "Correction recorded";
  }
  if (event.label === "write_todos") {
    return event.phase === "tool_call" ? "Updated task checklist" : event.detail;
  }
  if (event.phase === "done") return "Response complete";
  if (event.phase === "start") return "Started answering the request";
  return `${event.label}: ${event.detail}`;
}

function activityVisual(event: AgentActivity) {
  if (event.phase === "start") return { tone: "var(--chart-1)", icon: "01", title: "Agent started", badge: "START" };
  if (event.phase === "done") return { tone: "var(--chart-3)", icon: "OK", title: "Response complete", badge: "DONE" };
  if (event.phase === "tool_call") return { tone: "var(--chart-2)", icon: "TC", title: toolCallLabel(event), badge: "CALL" };
  if (event.phase === "tool_result") return { tone: "var(--chart-3)", icon: "TR", title: toolResultLabel(event), badge: "RESULT" };
  if (/error|fail/i.test(event.phase)) return { tone: "var(--destructive)", icon: "!!", title: "Needs attention", badge: "ERROR" };
  return { tone: "var(--chart-5)", icon: "EV", title: event.phase.replace(/_/g, " "), badge: "EVENT" };
}

function toolResultLabel(event: AgentActivity) {
  if (event.label === "read_property_context") return "Property context loaded";
  if (event.label === "read_entity_context") return "Entity context loaded";
  if (event.label === "append_context_note") return "Context note saved";
  if (event.label === "create_context_correction") return "Correction recorded";
  if (event.label === "search_local_services") return "Local services returned";
  if (event.label === "write_todos") return "Checklist updated";
  return `${event.label.replace(/_/g, " ")} finished`;
}

function activityChips(event: AgentActivity) {
  const data = parseActivityJson(event.detail);
  const chips: string[] = [];
  if (event.label) chips.push(event.label.replace(/_/g, " "));
  for (const id of extractContextIds(`${event.label} ${event.detail}`).slice(0, 4)) chips.push(id);
  if (data) {
    for (const key of ["targetSectionId", "entityId", "propertyId", "query", "city"] as const) {
      const value = data[key];
      if (typeof value === "string" && value.trim()) chips.push(value.trim());
    }
    for (const key of ["targetEntityIds", "targetSourceIds", "targetFactIds"] as const) {
      const value = data[key];
      if (Array.isArray(value) && value.length) chips.push(`${key.replace(/^target/, "")}: ${value.length}`);
    }
  }
  return [...new Set(chips)].slice(0, 6);
}

function activityDescription(event: AgentActivity) {
  const data = parseActivityJson(event.detail);
  if (!data) return summarizeActivity(event).slice(0, 220);
  if (event.label === "create_context_correction") {
    const correction = typeof data.correction === "string" ? data.correction : undefined;
    return correction ?? summarizeActivity(event);
  }
  if (event.label === "write_todos") return "Task plan changed while answering.";
  if (event.phase === "tool_call") return "The agent is using a capability instead of exposing the raw request payload.";
  if (event.phase === "tool_result") return "The capability returned data and the agent is folding it into the answer.";
  return summarizeActivity(event);
}

function nodeTypeLabel(type: string) {
  if (type === "property") return "Property";
  if (type === "building") return "Building";
  if (type === "unit") return "Unit";
  if (type === "owner") return "Owner";
  if (type === "tenant") return "Tenant";
  if (type === "contractor") return "Contractor";
  if (type === "invoice") return "Invoice";
  if (type === "letter") return "Document";
  return type.replace(/_/g, " ");
}

function managementNote(node: ContextGraphNode, relations: Array<ContextGraphEdge & { other: string }>, hiddenRelationCount: number) {
  const byLabel = (label: string) => relations.find((edge) => edge.label === label)?.other;
  const related = (label: string) => relations.filter((edge) => edge.label === label).map((edge) => edge.other).slice(0, 3).join(", ");
  const hidden = hiddenRelationCount > 0 ? ` ${hiddenRelationCount} more linked record${hiddenRelationCount === 1 ? "" : "s"} available on click.` : "";

  if (node.type === "property") return `Property command center. Prioritize open risks, unpaid/duplicate invoices, tenant issues, owner/ETV decisions, and building-wide maintenance.${hidden}`;
  if (node.type === "building") return `Building ${node.id}. Units: ${related("unit_in_building") || "linked below"}. Watch shared repairs, access/door issues, utilities, roof, and anything affecting multiple residents.${hidden}`;
  if (node.type === "unit") return `Unit ${node.id}. Building: ${byLabel("unit_in_building") || "unknown"}. Owner: ${byLabel("owner_owned_unit") || "unknown"}. Tenant: ${byLabel("tenant_occupied_unit") || "check context"}. Prioritize arrears, lease dates, damages, and active messages.${hidden}`;
  if (node.type === "tenant") return `Tenant ${node.id}. Unit: ${byLabel("tenant_occupied_unit") || "unknown"}. Check occupancy dates, complaints, arrears, handover, and unresolved correspondence before replying.${hidden}`;
  if (node.type === "owner") return `Owner ${node.id}. Units: ${related("owner_owned_unit") || "unknown"}. Check balances, ETV/voting relevance, approvals, and document history before commitments.${hidden}`;
  if (node.type === "contractor") return `Vendor ${node.id}. Check related invoices, recurring defects, service quality, duplicates, and payment status before assigning work.${hidden}`;
  if (node.type === "invoice") return `Invoice ${node.id}. Verify vendor, amount, duplicate risk, payment status, and whether it belongs to this property/unit before approval.${hidden}`;
  if (node.type === "letter") return `Document ${node.id}. Check deadlines, ETV decisions, monetary relevance, affected entity, and whether it changes obligations or status.${hidden}`;
  return `${node.label}.${hidden}`;
}

function toolCallLabel(event: AgentActivity) {
  if (event.label === "read_property_context") return "Reading property context";
  if (event.label === "read_entity_context") return "Reading entity context";
  if (event.label === "append_context_note") return "Writing context note";
  if (event.label === "create_context_correction") return "Preparing context correction";
  if (event.label === "search_local_services") return "Searching local services";
  return event.label.replace(/_/g, " ");
}

const INITIAL_MESSAGES: Msg[] = [
  {
    role: "agent",
    content:
      "Connected to property **WEG Immanuelkirchstraße 26, Berlin**. I have the live Context.md loaded. Ask me anything — rent roll, open tickets, vendor history, lease milestones, or local vendors near HAUS-12.",
  },
];

function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [todosOpen, setTodosOpen] = useState(false);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [contextMarkdown, setContextMarkdown] = useState("Loading generated context...");
  const [editingContext, setEditingContext] = useState(false);
  const [contextDraft, setContextDraft] = useState("");
  const [contextEditStatus, setContextEditStatus] = useState("NOTE: Human corrections saved here become protected context and are wrapped in <user> tags.");
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [contextGraph, setContextGraph] = useState<ContextGraph>({ nodes: [], edges: [] });
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | null>(null);
  const [hoveredGraphNodeId, setHoveredGraphNodeId] = useState<string | null>(null);
  const [expandedGraphNodeIds, setExpandedGraphNodeIds] = useState<Set<string>>(() => new Set(["LIE-001"]));
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [agentStreamOpen, setAgentStreamOpen] = useState(true);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [toolCallNotices, setToolCallNotices] = useState<AgentActivity[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceBusy, setIsVoiceBusy] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [liveBrief, setLiveBrief] = useState<LiveBrief>({
    question: "",
    status: "idle",
    touchedTools: [],
    ids: [],
    answerPreview: "Ask a question to stream a query-specific brief here.",
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const playbackUrlRef = useRef<string | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [activities]);

  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      playbackRef.current?.pause();
      if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
    };
  }, []);

  const loadThreads = async () => {
    const response = await fetch(`${AGENT_API}/api/threads`);
    if (!response.ok) throw new Error("Could not load threads");
    const data = (await response.json()) as { threads: ThreadSummary[] };
    setThreads(data.threads);
  };

  const loadThread = async (id: string) => {
    const response = await fetch(`${AGENT_API}/api/threads/${id}`);
    if (!response.ok) throw new Error("Could not load thread");
    const data = (await response.json()) as { thread: ThreadRecord };
    setThreadId(data.thread.threadId);
    setMessages(data.thread.messages.length ? data.thread.messages : INITIAL_MESSAGES);
    setTodos(data.thread.todos ?? []);
    setTodosOpen(false);
  };

  const loadContext = async () => {
    const [contextResponse, graphResponse] = await Promise.all([
      fetch(`${AGENT_API}/api/context`),
      fetch(`${AGENT_API}/api/context/graph`),
    ]);
    if (!contextResponse.ok) throw new Error("Could not load context");
    if (!graphResponse.ok) throw new Error("Could not load context graph");
    const contextData = (await contextResponse.json()) as { markdown: string };
    const graphData = (await graphResponse.json()) as ContextGraph;
    setContextMarkdown(contextData.markdown);
    setContextGraph(graphData);
  };

  const beginContextEdit = () => {
    setEditingContext(true);
    setContextDraft(contextMarkdown);
    setContextEditStatus("NOTE: Human corrections saved here become protected context and are wrapped in <user> tags.");
  };

  const cancelContextEdit = () => {
    setEditingContext(false);
    setContextDraft("");
  };

  const saveContextEdit = async () => {
    setIsSavingContext(true);
    setApiError(null);
    try {
      const response = await fetch(`${AGENT_API}/api/context`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contextDraft, author: "frontend-user" }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Could not save context edit"));

      const result = (await response.json()) as { status: string; content: string; message?: string; reason?: string };
      if (result.status === "blocked") throw new Error(result.reason ?? "Protected <user> blocks changed.");

      setContextMarkdown(result.content);
      setContextDraft("");
      setEditingContext(false);
      setContextEditStatus(result.message ?? "Saved direct artifact edits with protected <user> tags.");
      await loadContext();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not save context edit");
      setContextEditStatus(error instanceof Error ? error.message : "Could not save context edit");
    } finally {
      setIsSavingContext(false);
    }
  };

  const createThread = async () => {
    const response = await fetch(`${AGENT_API}/api/threads`, { method: "POST" });
    if (!response.ok) throw new Error("Could not create thread");
    const data = (await response.json()) as { thread: ThreadRecord };
    setThreadId(data.thread.threadId);
    setMessages(data.thread.messages.length ? data.thread.messages : INITIAL_MESSAGES);
    setTodos(data.thread.todos ?? []);
    setTodosOpen(false);
    localStorage.setItem("buena-thread-id", data.thread.threadId);
    await loadThreads();
  };

  const deleteThread = async (id: string) => {
    setDeletingThreadId(id);
    setApiError(null);
    setThreads((current) => current.filter((thread) => thread.threadId !== id));

    const wasActiveThread = id === threadId;
    if (wasActiveThread) {
      localStorage.removeItem("buena-thread-id");
      setThreadId(null);
      setMessages(INITIAL_MESSAGES);
      setTodos([]);
      setTodosOpen(false);
    }

    const response = await fetch(`${AGENT_API}/api/threads/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not delete thread");
    const data = (await response.json()) as { threads?: ThreadSummary[] };
    if (data.threads) setThreads(data.threads);

    if (wasActiveThread) {
      await createThread();
    }

    setDeletingThreadId(null);
  };

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setApiError(null);
        await Promise.all([loadThreads(), loadContext()]);
        const savedThreadId = localStorage.getItem("buena-thread-id");
        if (savedThreadId) {
          await loadThread(savedThreadId);
          return;
        }
        if (!cancelled) await createThread();
      } catch (error) {
        if (!cancelled) {
          setApiError(error instanceof Error ? error.message : "Agent API is unavailable");
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  const playSpeech = async (text: string) => {
    const spokenText = text.replace(/\s+/g, " ").trim().slice(0, 6000);
    if (!spokenText) return;

    setVoiceStatus("Generating Gradium voice reply...");
    const response = await fetch(`${AGENT_API}/api/voice/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: spokenText }),
    });
    if (!response.ok) throw new Error(await readApiError(response, "Gradium voice synthesis failed"));

    const blob = await response.blob();
    if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
    playbackRef.current?.pause();

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    playbackUrlRef.current = url;
    playbackRef.current = audio;
    setVoiceStatus("Playing Gradium voice reply...");

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("Voice playback failed."));
      void audio.play().catch(reject);
    });

    setVoiceStatus("Voice reply finished.");
    window.setTimeout(() => {
      setVoiceStatus((current) => current === "Voice reply finished." ? null : current);
    }, 2500);
  };

  const sendMessage = async (messageText: string, options: { speakReply?: boolean } = {}) => {
    const t = messageText.trim();
    if (!t || isSending) return;
    const activeThreadId = threadId;
    if (!activeThreadId) {
      setApiError("No active thread. Create a new thread first.");
      return;
    }

    setIsSending(true);
    setApiError(null);
    setActivities([]);
    setToolCallNotices([]);
    setTodosOpen(false);
    setLiveBrief({
      question: t,
      status: "starting",
      touchedTools: [],
      ids: extractContextIds(t),
      answerPreview: "Waiting for the agent to inspect context...",
    });
    setMessages((m) => [...m, { role: "user", content: t }, { role: "agent", content: "" }]);
    setInput("");

    try {
      const response = await fetch(`${AGENT_API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeThreadId, message: t }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Agent request failed"));
      }
      if (!response.body) throw new Error("Agent response stream is unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalAgentText = "";

      const handleEvent = (event: ChatStreamEvent) => {
        if (event.type === "delta") {
          finalAgentText += event.content;
          setLiveBrief((current) => ({
            ...current,
            status: current.activeTool ? `using ${current.activeTool}` : "answering",
            ids: mergeUnique(current.ids, extractContextIds(event.content)),
            answerPreview: `${current.answerPreview === "Waiting for the agent to inspect context..." ? "" : current.answerPreview}${event.content}`.slice(-420),
          }));
          setMessages((current) => {
            const next = [...current];
            const last = next[next.length - 1];
            if (last?.role === "agent") {
              next[next.length - 1] = { ...last, content: `${last.content}${event.content}` };
              return next;
            }
            return [...next, { role: "agent", content: event.content }];
          });
          return;
        }
        if (event.type === "activity") {
          if (["create_context_correction", "append_context_note", "write_todos"].includes(event.label) || /write|edit|correct|doc/i.test(`${event.label} ${event.detail}`)) {
            setAgentStreamOpen(true);
          }
          if (event.phase === "tool_call" && event.label !== "write_todos") {
            setToolCallNotices((current) => [
              ...current.slice(-3),
              {
                id: `${Date.now()}-${current.length}`,
                phase: event.phase,
                label: event.label,
                detail: event.detail,
                createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              },
            ]);
          }
          setLiveBrief((current) => ({
            ...current,
            status: event.phase === "done" ? "complete" : event.phase.replace(/_/g, " "),
            activeTool: event.phase.includes("tool") ? event.label : current.activeTool,
            touchedTools: event.phase.includes("tool") ? mergeUnique(current.touchedTools, [event.label], 8) : current.touchedTools,
            ids: mergeUnique(current.ids, extractContextIds(`${event.label} ${event.detail}`)),
          }));
          setActivities((current) => [
            ...current.slice(-11),
            {
              id: `${Date.now()}-${current.length}`,
              phase: event.phase,
              label: event.label,
              detail: event.detail,
              createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            },
          ]);
          return;
        }
        if (event.type === "todos") {
          setTodos(event.todos);
          return;
        }
        if (event.type === "done") {
          const lastAgentMessage = [...event.thread.messages].reverse().find((message) => message.role === "agent" && message.content.trim());
          if (lastAgentMessage) finalAgentText = lastAgentMessage.content;
          setMessages(event.thread.messages);
          setTodos(event.todos ?? event.thread.todos ?? []);
          setLiveBrief((current) => ({ ...current, status: "complete", activeTool: undefined }));
          return;
        }
        throw new Error(event.error);
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          handleEvent(JSON.parse(line) as ChatStreamEvent);
        }
        if (done) break;
      }
      if (buffer.trim()) handleEvent(JSON.parse(buffer) as ChatStreamEvent);

      await Promise.all([loadThreads(), loadContext()]);
      if (options.speakReply) {
        try {
          await playSpeech(finalAgentText);
        } catch (error) {
          setVoiceStatus("Voice reply failed.");
          setApiError(error instanceof Error ? error.message : "Voice reply failed.");
        }
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Agent request failed");
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          content: "Agent API request failed. Check that `npm run dev` is running both the API and frontend.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const send = async () => {
    await sendMessage(input);
  };

  const startVoiceRecording = async () => {
    if (isRecording || isVoiceBusy || isSending) return;
    try {
      setApiError(null);
      setVoiceStatus("Requesting microphone access...");
      recorderRef.current = await createVoiceRecorder();
      setIsRecording(true);
      setVoiceStatus("Listening. Click STOP when done.");
    } catch (error) {
      setVoiceStatus(null);
      setApiError(error instanceof Error ? error.message : "Could not start microphone recording.");
    }
  };

  const stopVoiceRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder || isVoiceBusy) return;

    setIsRecording(false);
    setIsVoiceBusy(true);
    setApiError(null);
    setVoiceStatus("Transcribing with Gradium...");

    try {
      const pcm = await recorder.stop();
      recorderRef.current = null;
      const response = await fetch(`${AGENT_API}/api/voice/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: pcm,
      });
      if (!response.ok) throw new Error(await readApiError(response, "Gradium transcription failed"));

      const data = (await response.json()) as { transcript?: string };
      const transcript = data.transcript?.trim();
      if (!transcript) throw new Error("Gradium did not return a transcript. Try speaking closer to the microphone.");

      setVoiceStatus(`Heard: ${transcript}`);
      await sendMessage(transcript, { speakReply: true });
    } catch (error) {
      setVoiceStatus("Voice request failed.");
      setApiError(error instanceof Error ? error.message : "Voice request failed.");
    } finally {
      recorderRef.current = null;
      setIsVoiceBusy(false);
    }
  };

  const contextOverview = useMemo(() => parseContextOverview(contextMarkdown), [contextMarkdown]);
  const graphNodeById = useMemo(() => new Map(contextGraph.nodes.map((node) => [node.id, node])), [contextGraph.nodes]);
  const graphRelationsById = useMemo(() => {
    const relations = new Map<string, Array<ContextGraphEdge & { other: string }>>();
    for (const edge of contextGraph.edges) {
      const fromRelations = relations.get(edge.from) ?? [];
      fromRelations.push({ ...edge, other: edge.to });
      relations.set(edge.from, fromRelations);

      const toRelations = relations.get(edge.to) ?? [];
      toRelations.push({ ...edge, other: edge.from });
      relations.set(edge.to, toRelations);
    }
    return relations;
  }, [contextGraph.edges]);
  const visibleGraph = useMemo(() => {
    const queryFocusIds = liveBrief.ids.filter((id) => graphNodeById.has(id) && id !== "LIE-001");
    const focusIds = selectedGraphNodeId && graphNodeById.has(selectedGraphNodeId)
      ? [selectedGraphNodeId, ...queryFocusIds.filter((id) => id !== selectedGraphNodeId)]
      : queryFocusIds;
    const visibleIds = new Set<string>();

    if (entityTypeFilter) {
      visibleIds.add("LIE-001");
      for (const node of contextGraph.nodes) {
        if (node.type === entityTypeFilter && visibleIds.size < 22) visibleIds.add(node.id);
      }
      for (const edge of contextGraph.edges) {
        if (visibleIds.has(edge.from) || visibleIds.has(edge.to)) {
          if (visibleIds.size < 28) {
            visibleIds.add(edge.from);
            visibleIds.add(edge.to);
          }
        }
      }
    } else if (focusIds.length > 0) {
      visibleIds.add("LIE-001");
      for (const id of focusIds.slice(0, 4)) visibleIds.add(id);
      for (const edge of contextGraph.edges) {
        if (visibleIds.has(edge.from) || visibleIds.has(edge.to)) {
          if (visibleIds.size < 16) {
            visibleIds.add(edge.from);
            visibleIds.add(edge.to);
          }
        }
      }
    } else {
      visibleIds.add("LIE-001");
      for (const edge of graphRelationsById.get("LIE-001") ?? []) {
        if (visibleIds.size < 10) visibleIds.add(edge.other);
      }
    }

    for (const id of expandedGraphNodeIds) {
      if (!graphNodeById.has(id)) continue;
      visibleIds.add(id);
      for (const edge of graphRelationsById.get(id) ?? []) {
        if (visibleIds.size < 42) visibleIds.add(edge.other);
      }
    }

    if (selectedGraphNodeId && graphNodeById.has(selectedGraphNodeId)) {
      visibleIds.add(selectedGraphNodeId);
      for (const edge of graphRelationsById.get(selectedGraphNodeId) ?? []) {
        if (visibleIds.size < 42) visibleIds.add(edge.other);
      }
    }

    const nodes = [...visibleIds].map((id) => graphNodeById.get(id)).filter((node): node is ContextGraphNode => Boolean(node)).slice(0, 42);
    const ids = new Set(nodes.map((node) => node.id));
    const edges = contextGraph.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)).slice(0, 90);
    return { nodes, edges, focusIds: new Set([...focusIds, ...expandedGraphNodeIds]) };
  }, [contextGraph.edges, contextGraph.nodes, expandedGraphNodeIds, graphNodeById, graphRelationsById, liveBrief.ids, selectedGraphNodeId, entityTypeFilter]);
  const activeContextMetrics = useMemo(() => {
    const correctionCall = [...activities].reverse().find((event) => event.label === "create_context_correction" && event.phase === "tool_call");
    const correctionResult = [...activities].reverse().find((event) => event.label === "create_context_correction" && event.phase === "tool_result");
    const correctionData = correctionCall ? parseActivityJson(correctionCall.detail) : undefined;
    if (correctionData || correctionResult) {
      return [
        { label: "Action", value: correctionResult ? "Recorded" : "Proposing" },
        { label: "Section", value: String(correctionData?.targetSectionId ?? "n/a") },
        { label: "Entities", value: String(Array.isArray(correctionData?.targetEntityIds) ? correctionData.targetEntityIds.length : 0) },
        { label: "Sources", value: String(Array.isArray(correctionData?.targetSourceIds) ? correctionData.targetSourceIds.length : 0) },
        { label: "Facts", value: String(Array.isArray(correctionData?.targetFactIds) ? correctionData.targetFactIds.length : 0) },
        { label: "Todos", value: `${todos.filter((todo) => todo.status === "completed").length}/${todos.length}` },
      ];
    }
    return [
      { label: "IDs", value: String(liveBrief.ids.length) },
      { label: "Tools", value: String(liveBrief.touchedTools.length) },
      { label: "Events", value: String(activities.length) },
      { label: "Todos", value: todos.length ? `${todos.filter((todo) => todo.status === "completed").length}/${todos.length}` : "0" },
      { label: "Review", value: String(contextOverview.review.length) },
      { label: "IDs touched", value: String(liveBrief.ids.length) },
    ];
  }, [activities, contextOverview.review.length, liveBrief.ids.length, liveBrief.touchedTools.length, todos]);
  const correctionActivity = useMemo<CorrectionActivity | undefined>(() => {
    const correctionCall = [...activities].reverse().find((event) => event.label === "create_context_correction" && event.phase === "tool_call");
    const correctionResult = [...activities].reverse().find((event) => event.label === "create_context_correction" && event.phase === "tool_result");
    const data = correctionCall ? parseActivityJson(correctionCall.detail) : undefined;
    if (!data && !correctionResult) return undefined;
    return {
      correctionId: correctionResult?.detail.match(/CORR-[A-Z0-9]+/)?.[0],
      correction: typeof data?.correction === "string" ? data.correction : undefined,
      section: typeof data?.targetSectionId === "string" ? data.targetSectionId : undefined,
      targetEntityIds: Array.isArray(data?.targetEntityIds) ? data.targetEntityIds.map(String) : [],
      targetSourceIds: Array.isArray(data?.targetSourceIds) ? data.targetSourceIds.map(String) : [],
      targetFactIds: Array.isArray(data?.targetFactIds) ? data.targetFactIds.map(String) : [],
    };
  }, [activities]);
  const affectedSection = useMemo(() => {
    const title = sectionTitleFromId(correctionActivity?.section);
    if (!title) return undefined;
    const content = extractSection(contextMarkdown, title);
    return content ? { title, content } : undefined;
  }, [contextMarkdown, correctionActivity?.section]);

  const entityColor = (type: string) => {
    if (type === "property") return "var(--chart-1)";
    if (type === "building") return "var(--chart-2)";
    if (type === "unit") return "var(--chart-3)";
    if (type === "tenant" || type === "owner") return "var(--chart-4)";
    if (type === "contractor") return "var(--chart-5)";
    return "var(--terminal-muted)";
  };

  const entityFill = (type: string, active: boolean) => {
    const color = entityColor(type);
    return `color-mix(in srgb, ${color} ${active ? 52 : 38}%, var(--terminal-bg))`;
  };

  const flowGraph = useMemo(() => {
    const count = Math.max(visibleGraph.nodes.length, 1);
    const centerId = selectedGraphNodeId && visibleGraph.nodes.some((node) => node.id === selectedGraphNodeId)
      ? selectedGraphNodeId
      : visibleGraph.focusIds.values().next().value ?? "LIE-001";
    const relatedToSelected = new Set<string>();
    const activeNodeId = selectedGraphNodeId;
    if (activeNodeId) {
      relatedToSelected.add(activeNodeId);
      for (const edge of visibleGraph.edges) {
        if (edge.from === activeNodeId) relatedToSelected.add(edge.to);
        if (edge.to === activeNodeId) relatedToSelected.add(edge.from);
      }
    }
    const orderedNodes = [...visibleGraph.nodes].sort((a, b) => {
      if (a.id === centerId) return -1;
      if (b.id === centerId) return 1;
      if (a.type === "property") return -1;
      if (b.type === "property") return 1;
      return a.id.localeCompare(b.id);
    });
    const nodes: Node[] = orderedNodes.map((node, index) => {
      const focused = visibleGraph.focusIds.has(node.id);
      const selected = selectedGraphNodeId === node.id;
      const related = relatedToSelected.has(node.id);
      const typeFiltered = entityTypeFilter ? node.type === entityTypeFilter : false;
      const muted = Boolean(activeNodeId) && !related || Boolean(entityTypeFilter) && !typeFiltered && node.id !== "LIE-001";
      const tier = index === 0 ? 0 : Math.ceil(index / 10);
      const slot = index === 0 ? 0 : (index - 1) % 10;
      const tierCount = Math.min(10, count - 1 - (tier - 1) * 10);
      const radius = 150 + tier * 120;
      const angle = index === 0 ? 0 : (slot / Math.max(tierCount, 1)) * Math.PI * 2 + tier * 0.28;
      const directRelationCount = graphRelationsById.get(node.id)?.length ?? 0;
      const visibleRelationCount = visibleGraph.edges.filter((edge) => edge.from === node.id || edge.to === node.id).length;
      const hiddenRelationCount = Math.max(0, directRelationCount - visibleRelationCount);
      return {
        id: node.id,
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        },
        data: {
          label: (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full px-2 text-center">
              <div className="max-w-[5.6rem] truncate text-[10px] text-foreground drop-shadow-sm">{node.id}</div>
              <div className="mt-0.5 max-w-[5.8rem] truncate text-[8px] uppercase tracking-wide text-foreground/75">{nodeTypeLabel(node.type)}</div>
              {hiddenRelationCount > 0 && <div className="mt-1 text-[9px] text-foreground">+{hiddenRelationCount}</div>}
            </div>
          ),
        },
        style: {
          width: 96,
          height: 96,
          opacity: muted ? 0.28 : 1,
          border: `${selected || focused || typeFiltered ? 2 : 1}px solid ${entityColor(node.type)}`,
          borderRadius: "9999px",
          background: entityFill(node.type, selected || focused || typeFiltered),
          color: "var(--terminal-fg)",
          boxShadow: selected ? `0 0 0 4px color-mix(in srgb, ${entityColor(node.type)} 18%, transparent), 0 0 28px color-mix(in srgb, ${entityColor(node.type)} 30%, transparent)` : "none",
          transition: "opacity 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease",
        },
      };
    });
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges: Edge[] = visibleGraph.edges
      .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
      .map((edge) => {
        const focused = visibleGraph.focusIds.has(edge.from) || visibleGraph.focusIds.has(edge.to);
        const selected = activeNodeId && (edge.from === activeNodeId || edge.to === activeNodeId);
        const filterMatch = entityTypeFilter && visibleGraph.nodes.some((node) => [edge.from, edge.to].includes(node.id) && node.type === entityTypeFilter);
        const muted = Boolean(activeNodeId) && !selected || Boolean(entityTypeFilter) && !filterMatch;
        return {
          id: `${edge.from}-${edge.to}-${edge.label}`,
          source: edge.from,
          target: edge.to,
          label: undefined,
          animated: Boolean(selected),
          style: { stroke: focused || selected ? "var(--chart-1)" : "var(--terminal-border)", strokeWidth: focused || selected ? 2 : 1, opacity: muted ? 0.16 : 0.75 },
          labelStyle: { fill: "var(--terminal-muted)", fontSize: 9 },
        };
      });
    return { nodes, edges };
  }, [visibleGraph, selectedGraphNodeId, entityTypeFilter, graphRelationsById]);

  const selectedGraphNode = useMemo(
    () => contextGraph.nodes.find((node) => node.id === selectedGraphNodeId) ?? null,
    [contextGraph.nodes, selectedGraphNodeId],
  );
  const selectedGraphRelations = useMemo(() => {
    if (!selectedGraphNodeId) return [];
    return (graphRelationsById.get(selectedGraphNodeId) ?? [])
      .slice(0, 8)
      .map((edge) => ({ ...edge, otherNode: graphNodeById.get(edge.other) }));
  }, [graphNodeById, graphRelationsById, selectedGraphNodeId]);
  const hoverGraphNode = hoveredGraphNodeId ? graphNodeById.get(hoveredGraphNodeId) ?? null : null;
  const activeGraphNode = hoverGraphNode ?? selectedGraphNode;
  const activeGraphRelations = activeGraphNode ? (graphRelationsById.get(activeGraphNode.id) ?? []) : [];
  const visibleRelationCount = activeGraphNode ? visibleGraph.edges.filter((edge) => edge.from === activeGraphNode.id || edge.to === activeGraphNode.id).length : 0;
  const hiddenRelationCount = Math.max(0, activeGraphRelations.length - visibleRelationCount);

  const getMessageLabel = (role: Msg["role"]) => {
    if (role === "user") return "YOU";
    if (role === "tool") return "TOOL";
    return "AGENT";
  };

  return (
    <div className="h-screen w-screen overflow-hidden grid-bg flex flex-col">
      <SiteHeader />

      <div className="flex-1 min-h-0 overflow-hidden grid w-full grid-cols-1 gap-2 px-2 pb-2 pt-16 sm:px-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:px-3">
        {/* LEFT: Chat */}
        <TerminalWindow title="AGENT.BUENA.COM" className="h-full min-h-0">
          <div className="flex h-full min-h-0">
            <aside
              className={`min-h-0 shrink-0 border-r border-border transition-[width] duration-200 ${
                threadsOpen ? "w-[30%]" : "w-10"
              }`}
            >
              <div className="flex h-full min-h-0 flex-col">
                <button
                  onClick={() => setThreadsOpen((open) => !open)}
                  aria-label={threadsOpen ? "Collapse thread list" : "Expand thread list"}
                  className="group grid place-items-center border-b border-border px-2 py-2 text-muted-foreground hover:text-foreground"
                >
                  <span
                    className={`inline-block text-lg leading-none transition-transform duration-300 ease-out group-hover:translate-x-0.5 ${
                      threadsOpen ? "rotate-180" : "rotate-0"
                    }`}
                  >
                    →
                  </span>
                </button>
                {threadsOpen && (
                  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-2">
                    <button
                      onClick={createThread}
                      className="mb-2 w-full border border-border px-2 py-1.5 text-left text-mono-xs text-foreground hover:bg-accent"
                    >
                      + NEW THREAD
                    </button>
                    <div className="space-y-1">
                      {threads.map((thread) => (
                        <div
                          key={thread.threadId}
                          className={`w-full border px-2 py-2 text-left transition-colors ${
                            thread.threadId === threadId
                              ? "border-foreground/40 bg-accent text-foreground"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => {
                                localStorage.setItem("buena-thread-id", thread.threadId);
                                void loadThread(thread.threadId);
                              }}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="text-mono-xs">#{thread.shortId}</div>
                              <div className="truncate text-[0.7rem] normal-case tracking-normal">
                                {thread.title}
                              </div>
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                void deleteThread(thread.threadId).catch((error) => {
                                  setDeletingThreadId(null);
                                  setApiError(error instanceof Error ? error.message : "Could not delete thread");
                                  void loadThreads();
                                });
                              }}
                              disabled={deletingThreadId === thread.threadId}
                              aria-label={`Delete thread ${thread.shortId}`}
                              className="shrink-0 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                            >
                              {deletingThreadId === thread.threadId ? "…" : "×"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

              <div className="flex min-w-0 flex-1 flex-col h-full min-h-0 bg-background/10">
              {apiError && (
                <div className="border-b border-border px-4 py-2 text-xs text-[var(--chart-4)]">
                  {apiError}
                </div>
              )}

              <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 py-4 space-y-4 sm:px-4 sm:py-5"
              >
                {messages.filter((message) => message.role !== "tool").map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[86%] border px-3 py-2 shadow-[0_0_0_1px_var(--terminal-bg)] ${
                        m.role === "user"
                          ? "border-foreground/30 bg-foreground/[0.06] text-right"
                          : m.role === "tool"
                            ? "border-[var(--chart-2)]/60 bg-[var(--chart-2)]/10 text-[var(--chart-2)]"
                            : "border-border bg-background/20"
                      }`}
                    >
                      <div
                        className={`mb-1 text-mono-xs ${
                          m.role === "tool" ? "text-[var(--chart-2)]" : "text-muted-foreground"
                        }`}
                      >
                        {m.role === "tool" ? ":: " : "> "}
                        {getMessageLabel(m.role)}
                      </div>
                      <div
                        className={`text-sm leading-relaxed prose-sm max-w-none ${
                          m.role === "tool" ? "font-mono text-xs" : "text-foreground"
                        }`}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {toolCallNotices.length > 0 && (
                <div className="border-t border-[var(--chart-2)]/40 bg-[var(--chart-2)]/5 px-3 py-2 sm:px-4">
                  <div className="mb-1 text-mono-xs text-[var(--chart-2)]">TOOL CALLS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {toolCallNotices.map((event) => (
                      <div key={event.id} className="border border-[var(--chart-2)]/60 bg-[var(--chart-2)]/10 px-2 py-1 text-xs text-[var(--chart-2)]">
                        {toolCallLabel(event)} <span className="text-[0.62rem] opacity-70">{event.createdAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {todos.length > 0 && (
                <div className="border-t border-border">
                  <button
                    onClick={() => setTodosOpen((open) => !open)}
                    className="flex w-full items-center justify-between px-3 py-2 text-mono-xs text-muted-foreground hover:text-foreground sm:px-4"
                  >
                    <span>AGENT TODOS</span>
                    <span className="flex items-center gap-2">
                      {todos.filter((todo) => todo.status === "completed").length}/{todos.length}
                      <span
                        className={`inline-block transition-transform duration-300 ${
                          todosOpen ? "rotate-90" : "rotate-0"
                        }`}
                      >
                        →
                      </span>
                    </span>
                  </button>
                  {todosOpen && (
                    <div className="max-h-36 overflow-y-auto scrollbar-thin px-3 pb-3 sm:px-4">
                      <div className="border-l border-border/80 bg-background/20 py-1 pl-3 font-mono text-xs leading-relaxed text-muted-foreground">
                        {todos.map((todo, index) => (
                          <div
                            key={`${todo.content}-${index}`}
                            className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2 py-0.5"
                          >
                            <span
                              className={`text-[0.68rem] ${
                                todo.status === "completed"
                                  ? "text-[var(--chart-3)]"
                                  : todo.status === "in_progress"
                                    ? "text-[var(--chart-1)]"
                                    : "text-muted-foreground/70"
                              }`}
                            >
                              {todo.status === "completed" ? "[x]" : todo.status === "in_progress" ? "[~]" : "[ ]"}
                            </span>
                            <span className={todo.status === "completed" ? "line-through opacity-70" : ""}>
                              {todo.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {voiceStatus && (
                <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground sm:px-4">
                  <span className={`mr-2 text-mono-xs ${isRecording ? "text-[var(--chart-4)]" : "text-[var(--chart-2)]"}`}>VOICE</span>
                  {voiceStatus}
                </div>
              )}
              <div className="border-t border-border p-3 flex gap-2 sm:p-4">
                <button
                  type="button"
                  onClick={() => void (isRecording ? stopVoiceRecording() : startVoiceRecording())}
                  disabled={!isRecording && (!threadId || isSending || isVoiceBusy)}
                  className={`text-mono-xs px-3 py-2 border transition-colors disabled:opacity-50 ${
                    isRecording
                      ? "border-[var(--chart-4)] bg-[var(--chart-4)]/10 text-[var(--chart-4)] hover:bg-[var(--chart-4)]/15"
                      : "border-border text-foreground hover:bg-accent"
                  }`}
                >
                  {isRecording ? "STOP" : isVoiceBusy ? "VOICE..." : "VOICE"}
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void send()}
                  placeholder={threadId ? "ask the agent…" : "creating thread…"}
                  disabled={!threadId || isSending || isRecording || isVoiceBusy}
                  className="flex-1 bg-transparent border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 disabled:opacity-50"
                />
                <button
                  onClick={() => void send()}
                  disabled={!threadId || isSending || isRecording || isVoiceBusy}
                  className="text-mono-xs px-4 py-2 border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {isSending ? "..." : "SEND"}
                </button>
              </div>
            </div>
          </div>
        </TerminalWindow>

        {/* RIGHT: graph, context artifact, stream */}
        <div className={`grid h-full min-h-0 min-w-0 overflow-hidden gap-2 ${agentStreamOpen ? "grid-rows-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.9fr)]" : "grid-rows-[minmax(0,1fr)_minmax(0,1fr)_auto]"}`}>
          <TerminalWindow title="LIVE ENTITY RELATIONSHIPS" className="min-h-0">
            <div className="h-full min-h-0 min-w-0 flex flex-col">
              <div className="relative flex-1 min-h-0 overflow-hidden border border-border/60 bg-background/20">
                <ReactFlow
                  nodes={flowGraph.nodes}
                  edges={flowGraph.edges}
                  fitView
                  fitViewOptions={{ padding: 0.25 }}
                  minZoom={0.25}
                  maxZoom={1.6}
                  nodesDraggable
                  nodesConnectable={false}
                  elementsSelectable
                  onNodeMouseEnter={(_, node) => setHoveredGraphNodeId(node.id)}
                  onNodeMouseLeave={() => setHoveredGraphNodeId(null)}
                  onNodeClick={(_, node) => {
                    setSelectedGraphNodeId(node.id);
                    setExpandedGraphNodeIds((current) => {
                      const next = new Set(current);
                      next.add(node.id);
                      return next;
                    });
                  }}
                  onPaneClick={() => setSelectedGraphNodeId(null)}
                  proOptions={{ hideAttribution: true }}
                  className="bg-background/20"
                >
                  <Background color="var(--terminal-border)" gap={22} size={1} />
                  <Controls className="!bg-background/80 !border !border-border [&_button]:!bg-background [&_button]:!border-border [&_button_svg]:!fill-foreground" />
                </ReactFlow>
                {activeGraphNode && (
                <div className="pointer-events-none absolute left-3 top-3 max-w-[52%] border border-border/80 bg-background/90 p-3 text-xs text-muted-foreground shadow-xl backdrop-blur">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: entityColor(activeGraphNode.type) }} />
                    <span className="text-mono-xs text-foreground">{activeGraphNode.id}</span>
                    <span className="text-mono-xs" style={{ color: entityColor(activeGraphNode.type) }}>{nodeTypeLabel(activeGraphNode.type)}</span>
                  </div>
                  <div className="line-clamp-2 text-foreground/90">{activeGraphNode.label}</div>
                  <div className="mt-2 leading-relaxed">
                    {managementNote(activeGraphNode, activeGraphRelations, hiddenRelationCount)}
                  </div>
                </div>
                )}
                {selectedGraphNode && selectedGraphRelations.length > 0 && (
                  <div className="absolute bottom-3 left-3 max-w-[58%] border border-border/80 bg-background/90 p-2 text-xs text-muted-foreground shadow-xl backdrop-blur">
                    <div className="mb-1 text-mono-xs text-foreground">NEXT RELATIONS</div>
                    <div className="grid grid-cols-2 gap-1">
                      {selectedGraphRelations.slice(0, 6).map((edge) => (
                        <button
                          key={`${edge.from}-${edge.to}-${edge.label}`}
                          type="button"
                          onClick={() => {
                            setSelectedGraphNodeId(edge.other);
                            setExpandedGraphNodeIds((current) => {
                              const next = new Set(current);
                              next.add(edge.other);
                              return next;
                            });
                          }}
                          className="pointer-events-auto truncate border border-border bg-background/75 px-2 py-1 text-left hover:bg-accent hover:text-foreground"
                        >
                          <span style={{ color: entityColor(edge.otherNode?.type ?? "") }}>{edge.other}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="absolute right-2 top-2 text-mono-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGraphNodeId(null);
                      setExpandedGraphNodeIds(new Set(["LIE-001"]));
                    }}
                    className="mr-1 border border-border bg-background/85 px-2 py-1 text-muted-foreground backdrop-blur transition-colors hover:bg-accent hover:text-foreground"
                  >
                    RESET
                  </button>
                  <button
                    type="button"
                    onClick={() => setLegendOpen((open) => !open)}
                    className="border border-border bg-background/85 px-2 py-1 text-muted-foreground backdrop-blur transition-colors hover:bg-accent hover:text-foreground"
                  >
                    LEGEND {legendOpen ? "-" : "+"}
                  </button>
                  {legendOpen && (
                    <div className="mt-1 grid gap-1 border border-border bg-background/90 p-2 shadow-xl backdrop-blur">
                      {[
                        ["property", "PROPERTY"],
                        ["building", "BUILDING"],
                        ["unit", "UNIT"],
                        ["owner", "OWNER"],
                        ["tenant", "TENANT"],
                        ["contractor", "CONTRACTOR"],
                      ].map(([type, label]) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEntityTypeFilter((current) => current === type ? null : type)}
                          className="border bg-background/75 px-2 py-1 text-left transition-colors hover:bg-accent"
                          style={{ borderColor: entityColor(type), color: entityColor(type), opacity: entityTypeFilter && entityTypeFilter !== type ? 0.35 : 1 }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TerminalWindow>

          <TerminalWindow
            title="CONTEXT.MD"
            className="min-h-0 overflow-hidden"
            headerRight={(
              <div className="flex shrink-0 items-center gap-2 text-mono-xs text-muted-foreground">
                {!editingContext ? (
                  <button
                    type="button"
                    onClick={beginContextEdit}
                    className="border border-border bg-background/70 px-2 py-1 transition-colors hover:bg-accent hover:text-foreground"
                  >
                    EDIT
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void saveContextEdit()}
                      disabled={isSavingContext}
                      className="border border-[var(--chart-3)]/70 bg-[var(--chart-3)]/10 px-2 py-1 text-[var(--chart-3)] transition-colors hover:bg-[var(--chart-3)]/15 disabled:opacity-50"
                    >
                      {isSavingContext ? "SAVING" : "SAVE <USER>"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelContextEdit}
                      disabled={isSavingContext}
                      className="border border-border bg-background/70 px-2 py-1 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                    >
                      CANCEL
                    </button>
                  </>
                )}
              </div>
            )}
          >
            <section className="flex h-full min-h-0 flex-col border border-border/70 bg-background/20">
              <div className="border-b border-border/70 px-3 py-2 text-xs text-muted-foreground">
                {contextEditStatus}
              </div>
              {editingContext ? (
                <textarea
                  value={contextDraft}
                  onChange={(event) => setContextDraft(event.target.value)}
                  spellCheck={false}
                  className="min-h-0 flex-1 resize-none bg-background/35 p-3 font-mono text-xs leading-relaxed text-foreground outline-none scrollbar-thin focus:bg-background/50"
                />
              ) : (
                <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed text-foreground scrollbar-thin">
                  {contextMarkdown}
                </pre>
              )}
            </section>
          </TerminalWindow>

          <TerminalWindow
            title="AGENT.STREAM"
            className="min-h-0 overflow-hidden"
            headerRight={(
              <div className="flex shrink-0 items-center gap-3 text-mono-xs text-muted-foreground">
                <span className={liveBrief.status === "complete" ? "text-[var(--chart-3)]" : "text-[var(--chart-1)]"}>{liveBrief.status.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => setAgentStreamOpen((open) => !open)}
                  className="border border-border bg-background/70 px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {agentStreamOpen ? "COLLAPSE" : "EXPAND"}
                </button>
              </div>
            )}
          >
            <div className="flex h-full min-h-0 min-w-0 flex-col text-sm text-foreground">
              {!agentStreamOpen && (
                <button
                  type="button"
                  onClick={() => setAgentStreamOpen(true)}
                  className="border border-border/70 bg-background/20 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {activities.length ? `${activities.length} streamed event${activities.length === 1 ? "" : "s"}. Expand to inspect tool calls, corrections, and writes.` : "Collapsed. Expand when you want to inspect agent activity."}
                </button>
              )}
              {agentStreamOpen && (
              <div ref={streamRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin border border-border/70 bg-background/20 p-2">
                {activities.length ? (
                  <div className="space-y-2">
                    {affectedSection && (
                      <details open className="border border-[var(--chart-1)]/60 bg-background/50 p-3">
                        <summary className="cursor-pointer text-mono-xs text-[var(--chart-1)]">
                          AFFECTED SECTION: {affectedSection.title}
                        </summary>
                        <div className="mt-2 max-h-48 overflow-y-auto scrollbar-thin border border-border/60 bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground prose-sm max-w-none [&_table]:w-full [&_table]:text-xs [&_th]:border-b [&_th]:border-border [&_td]:border-b [&_td]:border-border/50">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{`## ${affectedSection.title}\n\n${affectedSection.content}`}</ReactMarkdown>
                        </div>
                      </details>
                    )}
                    <div className="relative overflow-hidden border border-border/70 bg-background/25 p-3">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--chart-2)] to-transparent opacity-80" />
                      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-mono-xs">
                        <div className="border border-border/60 bg-background/45 p-2">
                          <div className="text-[var(--chart-2)]">{liveBrief.touchedTools.length}</div>
                          <div className="text-muted-foreground">TOOLS</div>
                        </div>
                        <div className="border border-border/60 bg-background/45 p-2">
                          <div className="text-[var(--chart-1)]">{liveBrief.ids.length}</div>
                          <div className="text-muted-foreground">IDS</div>
                        </div>
                        <div className="border border-border/60 bg-background/45 p-2">
                          <div className="text-[var(--chart-3)]">{activities.length}</div>
                          <div className="text-muted-foreground">STEPS</div>
                        </div>
                      </div>
                      <div className="relative space-y-3 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-gradient-to-b before:from-[var(--chart-2)] before:via-border before:to-transparent">
                        {activities.map((event, index) => {
                          const visual = activityVisual(event);
                          const chips = activityChips(event);
                          const isLatest = index === activities.length - 1 && liveBrief.status !== "complete";
                          return (
                            <div key={event.id} className="group relative grid grid-cols-[2.6rem_minmax(0,1fr)] gap-3">
                              <div className="relative z-10 flex h-10 w-10 items-center justify-center border bg-background text-[0.62rem] font-semibold shadow-[0_0_0_4px_var(--terminal-bg)] transition-transform duration-300 group-hover:scale-105" style={{ borderColor: visual.tone, color: visual.tone }}>
                                {isLatest && <span className="absolute inset-[-5px] animate-ping border opacity-30" style={{ borderColor: visual.tone }} />}
                                <span>{visual.icon}</span>
                              </div>
                              <div className="min-w-0 border border-border/70 bg-background/45 p-3 transition-colors duration-200 group-hover:border-foreground/35">
                                <div className="mb-1 flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-mono-xs" style={{ color: visual.tone }}>{visual.badge}</span>
                                      <span className="text-[0.62rem] text-muted-foreground">#{String(index + 1).padStart(2, "0")}</span>
                                    </div>
                                    <div className="mt-1 truncate text-sm text-foreground">{visual.title}</div>
                                  </div>
                                  <span className="shrink-0 text-[0.62rem] text-muted-foreground">{event.createdAt}</span>
                                </div>
                                <div className="text-xs leading-relaxed text-muted-foreground">{activityDescription(event)}</div>
                                {chips.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {chips.map((chip) => (
                                      <span key={chip} className="border border-border/70 bg-background/55 px-1.5 py-0.5 text-[0.62rem] text-muted-foreground">
                                        {chip}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {event.detail.trim().startsWith("{") && (
                                  <details className="mt-2 text-[0.62rem] text-muted-foreground">
                                    <summary className="cursor-pointer text-mono-xs hover:text-foreground">RAW PAYLOAD</summary>
                                    <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap border border-border/60 bg-background/60 p-2 scrollbar-thin">{event.detail}</pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
                    Ask a question to stream reads, writes, todo updates, corrections, and completion steps here.
                  </div>
                )}
              </div>
              )}
            </div>
          </TerminalWindow>
        </div>
      </div>
    </div>
  );
}
