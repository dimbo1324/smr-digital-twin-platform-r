import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { getDemoUsers } from "@/entities/auth/api/authApi";
import {
  getSelectedDemoUserId,
  setSelectedDemoUserId,
  subscribeDemoUserChange,
} from "@/entities/auth/model/storage";
import { queryKeys } from "@/shared/api/query-keys";

export function useDemoUsers() {
  const selectedUserId = useSyncExternalStore(
    subscribeDemoUserChange,
    getSelectedDemoUserId,
    getSelectedDemoUserId,
  );
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.auth.users,
    queryFn: ({ signal }) => getDemoUsers(signal),
    staleTime: 300_000,
  });

  const setDemoUser = (userId: string) => {
    setSelectedDemoUserId(userId);
    void queryClient.invalidateQueries();
  };

  return {
    users: query.data ?? [],
    selectedUserId,
    setDemoUser,
    state: query.isLoading ? "loading" : query.isError ? "degraded" : "connected",
  } as const;
}
