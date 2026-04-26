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

const INITIAL_MESSAGES: Msg[] = [
  {
    role: "agent",
    content:
      "Connected to property **Maximilianstraße 14, Berlin**. I have the live Context.md loaded. Ask me anything — rent roll, open tickets, vendor history, lease milestones.",
  },
];

function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [threadsOpen, setThreadsOpen] = useState(true);
  const [todosOpen, setTodosOpen] = useState(true);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [contextMarkdown, setContextMarkdown] = useState("Loading generated context...");
  const [contextGraph, setContextGraph] = useState<ContextGraph>({ nodes: [], edges: [] });
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | null>(null);
  const [hoveredGraphNodeId, setHoveredGraphNodeId] = useState<string | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [liveBrief, setLiveBrief] = useState<LiveBrief>({
    question: "",
    status: "idle",
    touchedTools: [],
    ids: [],
    answerPreview: "Ask a question to stream a query-specific brief here.",
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [activities]);

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

  const createThread = async () => {
    const response = await fetch(`${AGENT_API}/api/threads`, { method: "POST" });
    if (!response.ok) throw new Error("Could not create thread");
    const data = (await response.json()) as { thread: ThreadRecord };
    setThreadId(data.thread.threadId);
    setMessages(data.thread.messages.length ? data.thread.messages : INITIAL_MESSAGES);
    setTodos(data.thread.todos ?? []);
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

  const send = async () => {
    const t = input.trim();
    if (!t || isSending) return;
    const activeThreadId = threadId;
    if (!activeThreadId) {
      setApiError("No active thread. Create a new thread first.");
      return;
    }

    setIsSending(true);
    setApiError(null);
    setActivities([]);
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
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Agent request failed");
      }
      if (!response.body) throw new Error("Agent response stream is unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleEvent = (event: ChatStreamEvent) => {
        if (event.type === "delta") {
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

  const contextOverview = useMemo(() => parseContextOverview(contextMarkdown), [contextMarkdown]);
  const visibleGraph = useMemo(() => {
    const nodeById = new Map(contextGraph.nodes.map((node) => [node.id, node]));
    const queryFocusIds = liveBrief.ids.filter((id) => nodeById.has(id) && id !== "LIE-001");
    const focusIds = selectedGraphNodeId && nodeById.has(selectedGraphNodeId)
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
      for (const node of contextGraph.nodes) {
        if (["property", "building"].includes(node.type)) visibleIds.add(node.id);
      }
      for (const edge of contextGraph.edges) {
        if (visibleIds.has(edge.from) || visibleIds.has(edge.to)) {
          if (visibleIds.size < 12 && contextGraph.nodes.find((node) => node.id === edge.to)?.type === "unit") {
            visibleIds.add(edge.from);
            visibleIds.add(edge.to);
          }
        }
      }
    }

    const nodes = [...visibleIds].map((id) => nodeById.get(id)).filter((node): node is ContextGraphNode => Boolean(node)).slice(0, 36);
    const ids = new Set(nodes.map((node) => node.id));
    const edges = contextGraph.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)).slice(0, 70);
    return { nodes, edges, focusIds: new Set(focusIds) };
  }, [contextGraph, liveBrief.ids, selectedGraphNodeId, entityTypeFilter]);
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

  const flowGraph = useMemo(() => {
    const count = Math.max(visibleGraph.nodes.length, 1);
    const centerId = selectedGraphNodeId && visibleGraph.nodes.some((node) => node.id === selectedGraphNodeId)
      ? selectedGraphNodeId
      : visibleGraph.focusIds.values().next().value ?? "LIE-001";
    const relatedToSelected = new Set<string>();
    const activeNodeId = hoveredGraphNodeId ?? selectedGraphNodeId;
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
      const hovered = hoveredGraphNodeId === node.id;
      const related = relatedToSelected.has(node.id);
      const typeFiltered = entityTypeFilter ? node.type === entityTypeFilter : false;
      const muted = Boolean(activeNodeId) && !related || Boolean(entityTypeFilter) && !typeFiltered && node.id !== "LIE-001";
      const radiusX = index === 0 ? 0 : 220 + (index % 2) * 38;
      const radiusY = index === 0 ? 0 : 128 + (index % 3) * 22;
      const angle = (index / count) * Math.PI * 2;
      return {
        id: node.id,
        position: {
          x: Math.cos(angle) * radiusX,
          y: Math.sin(angle) * radiusY,
        },
        data: {
          label: (
            <div className="max-w-40 text-center">
              <div className="truncate text-[10px] text-foreground">{node.id}</div>
              <div className="truncate text-[9px] text-muted-foreground">{node.label}</div>
            </div>
          ),
        },
        style: {
          width: selected || focused || hovered ? 148 : 124,
          opacity: muted ? 0.28 : 1,
          border: `${selected || focused || hovered || typeFiltered ? 2 : 1}px solid ${entityColor(node.type)}`,
          background: "var(--terminal-bg)",
          color: "var(--terminal-fg)",
          boxShadow: "none",
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
          animated: false,
          style: { stroke: focused || selected ? "var(--chart-1)" : "var(--terminal-border)", strokeWidth: focused || selected ? 2 : 1, opacity: muted ? 0.16 : 0.75 },
          labelStyle: { fill: "var(--terminal-muted)", fontSize: 9 },
        };
      });
    return { nodes, edges };
  }, [visibleGraph, selectedGraphNodeId, hoveredGraphNodeId, entityTypeFilter]);

  const selectedGraphNode = useMemo(
    () => contextGraph.nodes.find((node) => node.id === selectedGraphNodeId) ?? null,
    [contextGraph.nodes, selectedGraphNodeId],
  );
  const selectedGraphRelations = useMemo(() => {
    if (!selectedGraphNodeId) return [];
    return contextGraph.edges
      .filter((edge) => edge.from === selectedGraphNodeId || edge.to === selectedGraphNodeId)
      .slice(0, 8)
      .map((edge) => ({ ...edge, other: edge.from === selectedGraphNodeId ? edge.to : edge.from }));
  }, [contextGraph.edges, selectedGraphNodeId]);

  const getMessageLabel = (role: Msg["role"]) => {
    if (role === "user") return "YOU";
    if (role === "tool") return "TOOL";
    return "AGENT";
  };

  return (
    <div className="h-screen w-screen overflow-hidden grid-bg flex flex-col">
      <SiteHeader />

      <div className="flex-1 min-h-0 overflow-hidden grid w-full grid-cols-1 gap-4 px-3 pb-4 pt-16 sm:px-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] xl:px-5">
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

            <div className="flex min-w-0 flex-1 flex-col h-full min-h-0">
              {apiError && (
                <div className="border-b border-border px-4 py-2 text-xs text-[var(--chart-4)]">
                  {apiError}
                </div>
              )}

              <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 py-5 space-y-5 sm:px-5 sm:py-6"
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
                      <div className="space-y-1">
                        {todos.map((todo, index) => (
                          <div
                            key={`${todo.content}-${index}`}
                            className="flex items-center gap-2 border border-border/70 px-2 py-1.5 text-xs text-muted-foreground"
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                todo.status === "completed"
                                  ? "bg-[var(--chart-3)]"
                                  : todo.status === "in_progress"
                                    ? "bg-[var(--chart-1)]"
                                    : "bg-muted-foreground/50"
                              }`}
                            />
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
              <div className="border-t border-border p-3 flex gap-2 sm:p-4">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void send()}
                  placeholder={threadId ? "ask the agent…" : "creating thread…"}
                  disabled={!threadId || isSending}
                  className="flex-1 bg-transparent border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 disabled:opacity-50"
                />
                <button
                  onClick={() => void send()}
                  disabled={!threadId || isSending}
                  className="text-mono-xs px-4 py-2 border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {isSending ? "..." : "SEND"}
                </button>
              </div>
            </div>
          </div>
        </TerminalWindow>

        {/* RIGHT: 2 stacked panels */}
        <div className="grid h-full min-h-0 min-w-0 overflow-hidden grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
          <TerminalWindow title="ENTITY.GRAPH" className="min-h-0">
            <div className="h-full min-h-0 min-w-0 p-4 flex flex-col sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3 text-mono-xs text-muted-foreground">
                <span>LIVE ENTITY RELATIONSHIPS</span>
                <span>{visibleGraph.nodes.length ? `${visibleGraph.nodes.length} FOCUSED NODES` : "NO GRAPH"}</span>
              </div>
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
                  onNodeClick={(_, node) => setSelectedGraphNodeId(node.id)}
                  onPaneClick={() => setSelectedGraphNodeId(null)}
                  proOptions={{ hideAttribution: true }}
                  className="bg-background/20"
                >
                  <Background color="var(--terminal-border)" gap={22} size={1} />
                  <Controls className="!bg-background/80 !border !border-border [&_button]:!bg-background [&_button]:!border-border [&_button_svg]:!fill-foreground" />
                </ReactFlow>
                {(hoveredGraphNodeId || selectedGraphNode) && (
                <div className="pointer-events-none absolute right-3 top-3 max-w-[44%] border border-border/80 bg-background/90 p-2 text-xs text-muted-foreground shadow-xl backdrop-blur">
                  {(() => {
                    const node = hoveredGraphNodeId ? contextGraph.nodes.find((candidate) => candidate.id === hoveredGraphNodeId) : selectedGraphNode;
                    const nodeId = node?.id;
                    const relations = nodeId ? contextGraph.edges
                      .filter((edge) => edge.from === nodeId || edge.to === nodeId)
                      .slice(0, 4)
                      .map((edge) => ({ ...edge, other: edge.from === nodeId ? edge.to : edge.from })) : [];
                    if (!node) return null;
                    return (
                    <div>
                      <div className="mb-1 text-mono-xs text-foreground">{node.id}</div>
                      <div className="mb-2 text-mono-xs" style={{ color: entityColor(node.type) }}>{node.type}</div>
                      <div className="line-clamp-2">{node.label}</div>
                      <div className="mt-2 space-y-1">
                        {relations.length ? relations.map((edge) => (
                          <div key={`${edge.from}-${edge.to}-${edge.label}`} className="truncate">{edge.label}: {edge.other}</div>
                        )) : <div>No direct visible relations.</div>}
                      </div>
                    </div>
                    );
                  })()}
                </div>
                )}
                <div className="absolute right-2 top-2 text-mono-xs">
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

          <TerminalWindow title="AGENT.STREAM" className="min-h-0 overflow-hidden">
            <div className="flex h-full min-h-0 min-w-0 flex-col p-3 text-sm text-foreground sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-3 border border-border/70 bg-background/30 p-2.5 text-mono-xs text-muted-foreground">
                <span>SEQUENTIAL RUN LOG</span>
                <span className={liveBrief.status === "complete" ? "text-[var(--chart-3)]" : "text-[var(--chart-1)]"}>{liveBrief.status.toUpperCase()}</span>
              </div>
              <div ref={streamRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin border border-border/70 bg-background/20 p-3">
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
                    {activities.map((event, index) => (
                      <div key={event.id} className="grid grid-cols-[1.6rem_4.8rem_minmax(0,1fr)] gap-2 border border-border/60 bg-background/40 px-2 py-2 text-xs">
                        <span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                        <span className="truncate text-[var(--chart-2)]">{event.phase}</span>
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-foreground">{summarizeActivity(event)}</span>
                            <span className="shrink-0 text-[0.62rem] text-muted-foreground">{event.createdAt}</span>
                          </div>
                          {event.label === "create_context_correction" && correctionActivity && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {[...(correctionActivity.targetEntityIds ?? []), correctionActivity.correctionId].filter(Boolean).slice(0, 5).map((id) => (
                                <span key={id} className="border border-border px-1.5 py-0.5 text-[0.62rem] text-muted-foreground">{id}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
                    Ask a question to stream reads, writes, todo updates, corrections, and completion steps here.
                  </div>
                )}
              </div>
            </div>
          </TerminalWindow>
        </div>
      </div>
    </div>
  );
}
