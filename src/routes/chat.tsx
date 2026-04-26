import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
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

const AGENT_API = import.meta.env.VITE_AGENT_API_URL ?? "http://localhost:8787";

const INITIAL_MESSAGES: Msg[] = [
  {
    role: "agent",
    content:
      "Connected to property **Maximilianstraße 14, Berlin**. I have the live Context.md loaded. Ask me anything — rent roll, open tickets, vendor history, lease milestones.",
  },
];

const SIGNAL_DATA = [
  { m: "Jan", occupancy: 92, tickets: 14 },
  { m: "Feb", occupancy: 93, tickets: 11 },
  { m: "Mar", occupancy: 95, tickets: 9 },
  { m: "Apr", occupancy: 95, tickets: 12 },
  { m: "May", occupancy: 97, tickets: 7 },
  { m: "Jun", occupancy: 98, tickets: 6 },
  { m: "Jul", occupancy: 98, tickets: 5 },
];

const CONTEXT_MD = `# Maximilianstraße 14 · Berlin

> Auto-generated context. Last updated 2 min ago.

## Asset
- **Type:** Residential, 6 floors, 24 units
- **Owner:** Schiller Holdings GmbH
- **Acquired:** 2019-04
- **GLA:** 1,840 m²

## Tenancy
- **Occupancy:** 98% (23 / 24)
- **WALT:** 4.2 years
- **Avg rent:** €18.40 / m²

## Open Items
1. Boiler service overdue — Vendor: *Heizung Müller* (last visit 2024-09)
2. Unit 3B lease renewal due **2026-06-30**
3. Roof inspection scheduled **2026-05-12**

## Vendor Trust
| Vendor          | Domain    | Score |
|-----------------|-----------|-------|
| Heizung Müller  | HVAC      | 0.91  |
| Klar Elektrik   | Electric  | 0.86  |
| Schmidt Bau     | General   | 0.78  |

## Notes
- Tenant in 5A is sensitive about noise during business hours.
- Building has a heritage facade — permits required for exterior work.
`;

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
        await loadThreads();
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
    setMessages((m) => [...m, { role: "user", content: t }]);
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
      const data = (await response.json()) as { thread: ThreadRecord; todos: Todo[] };
      setMessages(data.thread.messages);
      setTodos(data.todos ?? data.thread.todos ?? []);
      await loadThreads();
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

  const chartData = useMemo(() => SIGNAL_DATA, []);

  const getMessageLabel = (role: Msg["role"]) => {
    if (role === "user") return "YOU";
    if (role === "tool") return "TOOL";
    return "AGENT";
  };

  return (
    <div className="h-screen w-screen overflow-hidden grid-bg flex flex-col">
      <SiteHeader />

      <div className="flex-1 min-h-0 grid w-full grid-cols-1 gap-4 px-3 pb-4 pt-16 sm:px-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] xl:px-5">
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
                {messages.map((m, i) => (
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
        <div className="grid h-full min-h-0 grid-rows-2 gap-4">
          <TerminalWindow title="SIGNALS.GRAPH" className="min-h-0">
            <div className="h-full p-4 flex flex-col sm:p-5">
              <div className="text-mono-xs text-muted-foreground mb-2">
                OCCUPANCY % · OPEN TICKETS
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="var(--terminal-border)" strokeDasharray="2 4" />
                    <XAxis
                      dataKey="m"
                      stroke="var(--terminal-muted)"
                      style={{ fontSize: 10 }}
                      tickLine={false}
                    />
                    <YAxis stroke="var(--terminal-muted)" style={{ fontSize: 10 }} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--terminal-bg)",
                        border: "1px solid var(--terminal-border)",
                        fontSize: 11,
                        fontFamily: "monospace",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="occupancy"
                      stroke="var(--chart-1)"
                      strokeWidth={1.5}
                      dot={{ r: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tickets"
                      stroke="var(--chart-2)"
                      strokeWidth={1.5}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TerminalWindow>

          <TerminalWindow title="CONTEXT.MD" className="min-h-0">
            <div className="h-full overflow-y-auto scrollbar-thin p-4 text-sm text-foreground prose-invert max-w-none sm:p-5">
              <article className="space-y-2 leading-relaxed [&_h1]:text-base [&_h1]:uppercase [&_h1]:tracking-wider [&_h1]:text-foreground [&_h1]:mb-3 [&_h2]:text-mono-xs [&_h2]:text-muted-foreground [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:uppercase [&_h2]:tracking-wider [&_p]:text-xs [&_p]:text-muted-foreground [&_li]:text-xs [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:py-1 [&_th]:border-b [&_th]:border-border [&_th]:text-foreground [&_td]:py-1 [&_td]:border-b [&_td]:border-border/50 [&_td]:text-muted-foreground [&_strong]:text-foreground [&_code]:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{CONTEXT_MD}</ReactMarkdown>
              </article>
            </div>
          </TerminalWindow>
        </div>
      </div>
    </div>
  );
}
