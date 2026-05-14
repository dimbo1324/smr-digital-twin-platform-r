import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/app/providers/theme/ThemeProvider";
import { queryClient } from "@/shared/api/query-client";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
