import type { AuthSession, DemoUser } from "@/entities/auth/model/types";
import { apiGet } from "@/shared/api/client";

export async function getAuthSession(signal?: AbortSignal): Promise<AuthSession> {
  const response = await apiGet<AuthSession>("/api/v1/auth/session", {
    signal,
    responseSchema: "AuthSession",
  });
  return response.data;
}

export async function getDemoUsers(signal?: AbortSignal): Promise<DemoUser[]> {
  const response = await apiGet<DemoUser[]>("/api/v1/auth/users", {
    signal,
    responseSchema: "DemoUserList",
  });
  return response.data;
}
