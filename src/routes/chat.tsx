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

type Msg = { role: "user" | "agent"; content: string };

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    setMessages((m) => [...m, { role: "user", content: t }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          content: `Pulling from Context.md...\n\n**${t}** — based on the current property record, occupancy is at 98% with one renewal pending. Let me know if you want the full vendor history or financial trace.`,
        },
      ]);
    }, 600);
  };

  const chartData = useMemo(() => SIGNAL_DATA, []);

  return (
    <div className="h-screen w-screen overflow-hidden grid-bg flex flex-col">
      <SiteHeader />

      <div className="flex-1 min-h-0 pt-24 pb-6 px-6 grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-[1600px] w-full mx-auto">
        {/* LEFT: Chat */}
        <TerminalWindow title="AGENT.BUENA.COM" className="h-full min-h-0">
          <div className="flex flex-col h-full min-h-0">
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-5 py-6 space-y-5"
            >
              {messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="text-mono-xs text-muted-foreground">
                    {m.role === "agent" ? "> AGENT" : "> YOU"}
                  </div>
                  <div className="text-sm text-foreground leading-relaxed prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="ask the agent…"
                className="flex-1 bg-transparent border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
              />
              <button
                onClick={send}
                className="text-mono-xs px-4 py-2 border border-border text-foreground hover:bg-accent transition-colors"
              >
                SEND
              </button>
            </div>
          </div>
        </TerminalWindow>

        {/* RIGHT: 2 stacked panels */}
        <div className="grid grid-rows-2 gap-4 h-full min-h-0">
          <TerminalWindow title="SIGNALS.GRAPH" className="min-h-0">
            <div className="h-full p-4 flex flex-col">
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
            <div className="h-full overflow-y-auto scrollbar-thin p-5 text-sm text-foreground prose-invert max-w-none">
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
