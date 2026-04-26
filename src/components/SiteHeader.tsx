import { Link } from "@tanstack/react-router";
import { BuenaLogo } from "./BuenaLogo";

export function SiteHeader() {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 px-3 py-3 text-mono-xs text-muted-foreground sm:px-4 xl:px-5">
      <div className="flex items-center gap-2 whitespace-nowrap text-[0.82rem] leading-none tracking-[0.1em]">
        <span>TECHNOLOGY</span>
        <BuenaLogo size={14} />
        <span>REAL ESTATE RUNS ON.</span>
      </div>
      <nav className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-8">
        <Link to="/" className="hover:text-foreground transition-colors">BUENA</Link>
        <Link to="/chat" className="hover:text-foreground transition-colors">CHAT</Link>
      </nav>
    </header>
  );
}
