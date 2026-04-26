import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BuenaLogo } from "./BuenaLogo";

type ThemeMode = "dark" | "light";

export function SiteHeader() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(localStorage.getItem("buena-theme") === "light" ? "light" : "dark");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("buena-theme", theme);
  }, [mounted, theme]);

  return (
    <header className="absolute top-0 left-0 right-0 z-20 px-4 py-4 text-sm font-medium text-muted-foreground sm:px-5 xl:px-6">
      <div className="flex items-center gap-2.5 whitespace-nowrap text-[0.98rem] leading-none tracking-[0.14em]">
        <span>TECHNOLOGY</span>
        <BuenaLogo size={18} />
        <span>REAL ESTATE RUNS ON.</span>
      </div>
      <nav className="absolute left-1/2 top-4 flex -translate-x-1/2 gap-10 text-[0.95rem] tracking-[0.14em]">
        <Link to="/" className="hover:text-foreground transition-colors">BUENA</Link>
        <Link to="/chat" className="hover:text-foreground transition-colors">CHAT</Link>
        <Link to="/ingest" className="hover:text-foreground transition-colors">INGEST</Link>
      </nav>
      <button
        type="button"
        onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        className="absolute right-4 top-3.5 border border-border bg-background/60 px-3 py-1.5 text-[0.85rem] font-medium tracking-[0.12em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:right-5 xl:right-6"
        aria-label={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle color mode"}
      >
        {mounted ? theme === "dark" ? "LIGHT" : "DARK" : "THEME"}
      </button>
    </header>
  );
}
