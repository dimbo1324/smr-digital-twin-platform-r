export function timestampMs(timestamp: string | undefined): number {
  if (!timestamp) {
    return 0;
  }

  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) ? value : 0;
}

export function formatRelativeTime(timestamp: string | undefined): string {
  if (!timestamp) {
    return "No timestamp";
  }

  const ageMs = Math.max(0, Date.now() - timestampMs(timestamp));
  if (ageMs < 1000) {
    return "just now";
  }

  const seconds = Math.round(ageMs / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  return new Date(timestamp).toLocaleString();
}

export function sortByTimestampDesc<T>(
  items: T[],
  getTimestamp: (item: T) => string | undefined,
): T[] {
  return [...items].sort(
    (left, right) => timestampMs(getTimestamp(right)) - timestampMs(getTimestamp(left)),
  );
}
