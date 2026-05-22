import { useQuery } from "@tanstack/react-query";
import { getAuthSession } from "@/entities/auth/api/authApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useAuthSession() {
  const query = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: ({ signal }) => getAuthSession(signal),
    staleTime: 30_000,
  });

  return {
    session: query.data,
    state: query.isLoading ? "loading" : query.isError ? "degraded" : "connected",
  } as const;
}
