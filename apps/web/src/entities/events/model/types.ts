import type { components } from "@/shared/api/generated/schema";

export type EventRecord = components["schemas"]["Event"];
export type EventSeverity = EventRecord["severity"];
