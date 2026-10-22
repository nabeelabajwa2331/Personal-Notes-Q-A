export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function snippet(content: string, maxLength = 120): string {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "No content yet.";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function countWords(content: string): number {
  const normalized = content.trim();

  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).length;
}
