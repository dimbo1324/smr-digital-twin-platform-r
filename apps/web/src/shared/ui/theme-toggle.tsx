import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/providers/theme/themeContext";
import { Button } from "@/shared/ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="group relative h-9 w-9 overflow-hidden border-border/80 bg-card/80 p-0 shadow-[0_10px_28px_hsl(var(--foreground)/0.08)] transition-[background-color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.015] hover:bg-surface-elevated hover:shadow-panel"
    >
      <span className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-warning/10 opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
      <span className="relative z-10 grid h-full w-full place-items-center">
        {isDark ? (
          <Moon className="h-4 w-4 text-primary transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-[-8deg]" aria-hidden="true" />
        ) : (
          <Sun className="h-4 w-4 text-warning transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45" aria-hidden="true" />
        )}
      </span>
    </Button>
  );
}
