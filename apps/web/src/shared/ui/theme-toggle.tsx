import { MonitorCog, Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/providers/theme/themeContext";
import { Button } from "@/shared/ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="relative min-w-[128px] overflow-hidden rounded-full bg-card/70 px-3"
    >
      <span className="absolute inset-y-1 left-1 w-[58px] rounded-full bg-primary/10 transition-transform duration-300 ease-out data-[dark=true]:translate-x-[62px]" data-dark={isDark} />
      <span className="relative z-10 flex items-center gap-2 text-xs">
        {isDark ? (
          <>
            <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            Dark
          </>
        ) : (
          <>
            <Sun className="h-3.5 w-3.5" aria-hidden="true" />
            Light
          </>
        )}
      </span>
      <MonitorCog className="relative z-10 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
    </Button>
  );
}
