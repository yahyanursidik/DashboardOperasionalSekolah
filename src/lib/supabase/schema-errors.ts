export function isMissingSupabaseRelation(error: unknown, relation?: string) {
  const value = error as { code?: string; message?: string; details?: string } | null;
  const message = `${value?.message || ""} ${value?.details || ""}`.toLowerCase();
  const relationMatches = !relation || message.includes(relation.toLowerCase());
  return relationMatches && (
    value?.code === "42P01"
    || value?.code === "PGRST205"
    || message.includes("schema cache")
    || message.includes("does not exist")
    || message.includes("could not find the table")
  );
}

export function isMissingSupabaseColumn(error: unknown, column: string, relation?: string) {
  const value = error as { code?: string; message?: string; details?: string } | null;
  const message = `${value?.message || ""} ${value?.details || ""}`.toLowerCase();
  const columnMatches = message.includes(column.toLowerCase());
  const relationMatches = !relation || message.includes(relation.toLowerCase());
  return columnMatches && relationMatches && (
    value?.code === "42703"
    || value?.code === "PGRST204"
    || message.includes("schema cache")
    || message.includes("could not find the")
  );
}
