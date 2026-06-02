import { Moon, Sun, Waves, type LucideIcon } from "lucide-react";
import { THEMES, useTheme, type Theme } from "@/app/providers/theme/themeContext";
import { cn } from "@/shared/lib/cn";

const themeMeta: Record<Theme, { label: string; icon: LucideIcon }> = {
  dark: { label: "Dark", icon: Moon },
  light: { label: "Light", icon: Sun },
  neutral: { label: "Neutral", icon: Waves },
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex min-w-0 items-center gap-0.5 rounded-md border border-border/80 bg-surface-raised/80 p-0.5 shadow-[0_8px_24px_hsl(var(--foreground)/0.08)]"
    >
      {THEMES.map((themeOption) => {
        const Icon = themeMeta[themeOption].icon;
        const selected = theme === themeOption;

        return (
          <button
            key={themeOption}
            type="button"
            aria-label={`Use ${themeMeta[themeOption].label} theme`}
            aria-pressed={selected}
            title={`Use ${themeMeta[themeOption].label} theme`}
            onClick={() => setTheme(themeOption)}
            className={cn(
              "inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-sm px-2 text-[var(--font-size-xs)] font-semibold text-muted-foreground transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "bg-primary text-primary-foreground shadow-[0_6px_16px_hsl(var(--primary)/0.22)]"
                : "hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{themeMeta[themeOption].label}</span>
          </button>
        );
      })}
    </div>
  );
}
