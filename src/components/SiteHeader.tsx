import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 px-6 py-5 flex items-start justify-between text-mono-xs text-muted-foreground">
      <div className="leading-tight max-w-[200px]">
        TECHNOLOGY ◇ REAL
        <br />
        ESTATE RUNS ON.
      </div>
      <nav className="flex gap-8 mt-6">
        <Link to="/" className="hover:text-foreground transition-colors">BUENA</Link>
        <Link to="/chat" className="hover:text-foreground transition-colors">CHAT</Link>
      </nav>
      <a
        href="https://cal.com/team/buena-ops/buena-big-hack-berlin"
        target="_blank"
        rel="noreferrer"
        className="hover:text-foreground transition-colors"
      >
        APPLY
      </a>
    </header>
  );
}
