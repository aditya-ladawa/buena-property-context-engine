import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { TerminalWindow } from "@/components/TerminalWindow";
import { BuenaLogo } from "@/components/BuenaLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Buena Context Engine — Hackathon Demo" },
      {
        name: "description",
        content:
          "A hackathon prototype for source-backed property context ingestion, graph exploration, and agent chat over real estate operations data.",
      },
      { property: "og:title", content: "Buena Context Engine — Hackathon Demo" },
      {
        property: "og:description",
        content:
          "Ingest property data, build source-backed context, inspect entity relations, and chat with an agent over the generated property brain.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="relative min-h-screen w-full grid-bg overflow-x-hidden">
      <SiteHeader />

      <main className="relative z-10 px-6 pt-40 pb-20 max-w-5xl mx-auto flex flex-col items-center">
        <section className="w-full text-center mb-24">
          <p className="text-mono-xs text-muted-foreground mb-6">[ HACKATHON PROJECT ]</p>
          <h1 className="text-2xl md:text-3xl leading-relaxed text-foreground max-w-3xl mx-auto">
            Buena Context Engine turns messy property data into an agent-readable property brain.
          </h1>
          <p className="mt-6 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            This demo ingests historic records, incremental deltas, PDFs, bank files, email threads,
            and master data, then materializes source-backed facts into Context.md and entity views.
          </p>
          <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The goal is not a marketing site. It is an operational prototype: run ingestion, inspect
            what changed, explore entity relations, and ask an agent questions with provenance.
          </p>
          <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Our core idea: invert the agent's random walk through raw data. Instead of letting an
            LLM wander files at answer time, we reshape the data space into a grid of glimpses,
            entity links, and KV-style pointers the agent can traverse deliberately.
          </p>
        </section>

        <section className="w-full grid md:grid-cols-3 gap-px bg-border border border-border mb-24">
          {[
            {
              n: "01",
              t: "Ingest",
              d: "Scan source folders, normalize PDFs/emails/CSVs, dedupe unchanged files, and process historic or incremental updates from the browser.",
            },
            {
              n: "02",
              t: "Materialize",
              d: "Reduce observations into durable facts, patch Context.md with conflict protection, and generate entity-scoped context views.",
            },
            {
              n: "03",
              t: "Operate",
              d: "Use the graph and chat UI to understand buildings, units, owners, tenants, invoices, risks, and source-backed answers.",
            },
          ].map((s) => (
            <div key={s.n} className="bg-background p-8">
              <div className="text-mono-xs text-muted-foreground mb-6">{s.n}</div>
              <h3 className="text-lg uppercase tracking-wider text-foreground mb-4">{s.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </section>

        <section className="w-full mb-24">
          <div className="mb-8 text-center">
            <p className="text-mono-xs text-muted-foreground mb-4">[ CONTEXT ENGINE ]</p>
            <h2 className="text-2xl md:text-3xl tracking-wider text-foreground uppercase">
              From Data Space To Context Grid
            </h2>
          </div>

          <div className="grid gap-px border border-border bg-border md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <div className="bg-background p-7">
              <div className="mb-5 text-mono-xs text-muted-foreground">BEFORE</div>
              <h3 className="mb-4 text-lg uppercase tracking-wider text-foreground">Random Walk Data Space</h3>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                A normal agent has to wander through emails, PDFs, CSVs, master data, invoices,
                bank exports, and folders for every question. It repeatedly searches, guesses what
                matters, and risks missing evidence.
              </p>
              <div className="grid grid-cols-2 gap-2 text-mono-xs text-muted-foreground">
                {["/emails", "/briefe", "/rechnungen", "/bank", "/stammdaten", "/incremental"].map((item) => (
                  <div key={item} className="border border-border px-3 py-2">{item}</div>
                ))}
              </div>
            </div>

            <div className="grid place-items-center bg-background px-5 py-8 text-mono-xs text-[var(--chart-1)]">
              INGEST\nNORMALIZE\nLINK\nREDUCE
            </div>

            <div className="bg-background p-7">
              <div className="mb-5 text-mono-xs text-muted-foreground">AFTER</div>
              <h3 className="mb-4 text-lg uppercase tracking-wider text-foreground">Guided Context Grid</h3>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                The context engine turns messy data into source-backed facts, entity views, graph
                edges, change sets, and managed Markdown. The agent traverses a structured grid with
                property-management semantics instead of crawling raw data blindly.
              </p>
              <div className="grid grid-cols-2 gap-2 text-mono-xs text-muted-foreground">
                {["Context.md", "fact-index.json", "entity views", "entity graph", "change set", "corrections"].map((item) => (
                  <div key={item} className="border border-border px-3 py-2">{item}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 border border-border bg-background/40 p-7">
            <p className="mb-4 text-mono-xs text-muted-foreground">[ APPROACH ]</p>
            <h3 className="mb-5 text-xl uppercase tracking-wider text-foreground">
              Invert The Random Walk
            </h3>
            <div className="grid gap-6 text-sm leading-relaxed text-muted-foreground md:grid-cols-3">
              <p>
                Raw property operations data is not agent-friendly. It is a loose space of emails,
                bank rows, invoices, letters, PDFs, and master records. A generic agent has to search
                that space repeatedly and can easily miss the one source that matters.
              </p>
              <p>
                We make the data space itself traversable. Ingestion turns each source into stable
                normalized artifacts, compact glimpses, entity candidates, durable facts, and
                addressable pointers. The agent starts from the grid, not from a blind filesystem crawl.
              </p>
              <p>
                The result is a property-specific context substrate: sourceId to workItem to glimpse to
                entity to fact to Context.md section. Those KV-like pointers let the agent jump to
                evidence, explain provenance, and update context without losing human corrections.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-px border border-border bg-border md:grid-cols-4">
            {[
              ["01", "Incremental", "Detects day-by-day deltas under data/incremental and updates only the affected source/fact/context surface."],
              ["02", "Append-Safe", "Human notes and agent notes live outside managed sections, so ingestion can preserve them across rebuilds."],
              ["03", "Agent Edits", "Corrections are captured as provenance-backed proposals instead of silently overwriting generated facts."],
              ["04", "Source-Backed", "Durable facts require evidence, source IDs, entity links, and materialized views the agent can inspect."],
            ].map(([n, title, body]) => (
              <div key={n} className="bg-background p-6">
                <div className="mb-4 text-mono-xs text-muted-foreground">{n}</div>
                <h3 className="mb-3 text-sm uppercase tracking-wider text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full mb-24 border border-border bg-background/40 p-8 md:p-10">
          <p className="text-mono-xs text-muted-foreground mb-4">[ SEMANTIC CONTEXT LAYER ]</p>
          <h2 className="mb-6 text-2xl md:text-3xl tracking-wider text-foreground uppercase">
            How Context Is Created
          </h2>
          <div className="grid gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                We do not ask an agent to recursively browse the whole file system. First, the
                pipeline converts raw data into a navigable semantic layer: sources become normalized
                artifacts, artifacts become work items, work items get entity candidates, and only
                then do LLM calls happen on bounded high-signal slices.
              </p>
              <p>
                This is the inversion: the expensive exploration happens once during ingestion. At
                question time, the agent reads compact glimpses and follows stable IDs instead of
                performing a fresh random walk through raw documents.
              </p>
              <p>
                Every work item carries a glimpse: a compact summary, date range, source kinds,
                metrics, entity hints, and preview fields. Glimpses let the system triage thousands
                of records without loading every full email/PDF into the model.
              </p>
              <p>
                Durable facts keep pointers back to source IDs, normalized paths, evidence quotes,
                entity IDs, and managed Context.md sections. The agent traverses those pointers like
                a map instead of guessing where evidence might live.
              </p>
            </div>

            <div className="grid gap-px border border-border bg-border text-xs">
              {[
                ["01", "Source Registry", "Tracks raw path, hash, kind, source date, duplicate/ignore state, and incremental day."],
                ["02", "Normalized Artifacts", "Turns PDFs, emails, CSVs, bank files, and master data into stable markdown/json views."],
                ["03", "Work Items + Glimpses", "Groups sources into bounded extraction units with previews, metrics, labels, and date ranges."],
                ["04", "Entity Linking", "Adds deterministic candidate links to property, building, unit, owner, tenant, contractor, invoice, and letter entities."],
                ["05", "Semantic Extractor", "Gemini/Gemma only sees selected high-signal work items plus candidate entities and must return quoted evidence."],
                ["06", "Fact + View Layer", "Facts are reduced into Context.md, entity views, graph edges, change sets, corrections, and coverage reports."],
              ].map(([n, title, body]) => (
                <div key={n} className="grid grid-cols-[3rem_minmax(0,1fr)] bg-background p-4">
                  <div className="text-mono-xs text-muted-foreground">{n}</div>
                  <div>
                    <div className="mb-1 text-mono-xs text-foreground">{title}</div>
                    <p className="leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <TerminalWindow title="CONTEXT.ENGINE.DEMO" className="w-full max-w-3xl">
          <div className="p-10 md:p-16">
            <BuenaLogo size={42} />
            <p className="text-mono-xs text-muted-foreground mt-12 mb-3">[ DEMO BRIEF ]</p>
            <h2 className="text-2xl md:text-3xl tracking-wider text-foreground mb-8 uppercase">
              Property Context, Not Another Chatbot
            </h2>
            <div className="space-y-5 text-mono-xs leading-relaxed text-muted-foreground">
              <p>
                Property management runs on context scattered across master data, emails, invoices,
                bank exports, letters, and scanned PDFs. A useful agent needs a durable context layer,
                not a fresh blind search for every answer.
              </p>
              <p>
                This hackathon build produces a single managed Context.md per property, plus structured
                JSON/JSONL artifacts and entity-specific views. Each fact is traceable to sources, and
                managed sections are patched without overwriting human notes.
              </p>
              <p>Think CLAUDE.md for a building, with ingestion logs, incremental updates, graph navigation, and an agent UI layered on top.</p>
            </div>

            <div className="flex items-center gap-2 mt-10 mb-6 text-mono-xs text-muted-foreground">
              <span className="text-[var(--accent-pink)]">♥</span>
              <span>2500€</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/chat"
                className="text-mono-xs px-5 py-2.5 border border-border text-foreground hover:bg-accent transition-colors"
              >
                OPEN CHAT
              </Link>
              <Link
                to="/ingest"
                className="text-mono-xs px-5 py-2.5 border border-border text-foreground hover:bg-accent transition-colors"
              >
                RUN INGEST
              </Link>
            </div>
          </div>
        </TerminalWindow>
      </main>
    </div>
  );
}
