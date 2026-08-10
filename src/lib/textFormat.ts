export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*+]\s+/gm, "- ")
    .trim();
}

// Models sometimes wrap JSON in markdown fences or add surrounding prose despite instructions —
// this strips fences first, then falls back to extracting the first {...} block.
export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const braced = raw.match(/\{[\s\S]*\}/);
  if (braced) return braced[0];
  return raw.trim();
}
