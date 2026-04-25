import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { TerminalWindow } from "@/components/TerminalWindow";
import { BuenaLogo } from "@/components/BuenaLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Buena — Technology real estate runs on" },
      {
        name: "description",
        content:
          "Buena acquires property managers, unifies them on one platform, and deploys AI agents that elevate operations for owners, tenants, and cities.",
      },
      { property: "og:title", content: "Buena — Technology real estate runs on" },
      {
        property: "og:description",
        content:
          "We acquire property managers, unify them on one platform, and deploy AI that runs the physical world.",
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
          <p className="text-mono-xs text-muted-foreground mb-6">[ MISSION ]</p>
          <h1 className="text-2xl md:text-3xl leading-relaxed text-foreground max-w-3xl mx-auto">
            Buena is building the technology the physical world runs on.
          </h1>
          <p className="mt-6 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We acquire property management companies, bring them onto one platform, and deploy AI
            that elevates how they operate — for owners, tenants, and cities.
          </p>
          <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Our software powers real-time, AI-driven decisions and actions in the real world — from
            the single flat to the largest portfolio. Every company we acquire becomes a live
            deployment of our platform.
          </p>
        </section>

        <section className="w-full grid md:grid-cols-3 gap-px bg-border border border-border mb-24">
          {[
            {
              n: "01",
              t: "Acquire",
              d: "We acquire established property managers across Germany — real companies with real customers and decades of trust. Not starting from zero.",
            },
            {
              n: "02",
              t: "Integrate",
              d: "Every company migrates onto the Buena platform. Data, workflows, tenant communication, accounting — all unified. This is where the hardest engineering lives.",
            },
            {
              n: "03",
              t: "Elevate",
              d: "AI agents take over routine work. Property managers shift to high-value problem solving. Owners get better service. Everyone levels up.",
            },
          ].map((s) => (
            <div key={s.n} className="bg-background p-8">
              <div className="text-mono-xs text-muted-foreground mb-6">{s.n}</div>
              <h3 className="text-lg uppercase tracking-wider text-foreground mb-4">{s.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </section>

        <TerminalWindow title="APP.BUENA.COM" className="w-full max-w-3xl">
          <div className="p-10 md:p-16">
            <BuenaLogo size={42} />
            <p className="text-mono-xs text-muted-foreground mt-12 mb-3">[ THE CHALLENGE ]</p>
            <h2 className="text-2xl md:text-3xl tracking-wider text-foreground mb-8 uppercase">
              The Challenge
            </h2>
            <div className="space-y-5 text-mono-xs leading-relaxed text-muted-foreground">
              <p>
                Property management runs on context. Today, that context is scattered across ERPs,
                Gmail, Slack, Google Drive, scanned PDFs, and the head of the property manager
                who's been there twelve years. AI agents have to crawl all of it for every single
                task.
              </p>
              <p>
                Build an engine that produces a single Context Markdown file per property. That's
                a living, self-updating document containing every fact an AI agent needs to act.
                Dense, structured, traced to its source, surgically updated without destroying
                human edits.
              </p>
              <p>Think CLAUDE.md, but for a building. And it writes itself.</p>
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
                START
              </Link>
              <a
                href="https://cal.com/team/buena-ops/buena-big-hack-berlin"
                target="_blank"
                rel="noreferrer"
                className="text-mono-xs px-5 py-2.5 border border-border text-foreground hover:bg-accent transition-colors"
              >
                TALK TO BUENA
              </a>
            </div>
          </div>
        </TerminalWindow>
      </main>
    </div>
  );
}
