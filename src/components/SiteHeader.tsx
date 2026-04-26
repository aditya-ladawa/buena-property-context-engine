import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BuenaLogo } from "./BuenaLogo";

type ThemeMode = "dark" | "light";

export function SiteHeader() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("buena-theme") === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("buena-theme", theme);
  }, [theme]);

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
      <button
        type="button"
        onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        className="absolute right-3 top-3 border border-border bg-background/60 px-2 py-1 text-mono-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:right-4 xl:right-5"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "LIGHT" : "DARK"}
      </button>
    </header>
  );
}
