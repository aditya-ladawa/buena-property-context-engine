import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TerminalWindow({
  title,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("terminal-window flex flex-col", className)}>
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border">
        <div className="flex shrink-0 gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
        </div>
        {title && (
          <span className="min-w-0 flex-1 truncate text-center text-mono-xs text-muted-foreground">
            {title}
          </span>
        )}
        <div className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
      </div>
      <div className={cn("flex-1 min-h-0", bodyClassName)}>{children}</div>
    </div>
  );
}
