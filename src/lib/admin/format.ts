export function formatAdminDate(
  value: Date | string | null | undefined,
  fallback = "—",
) {
  if (!value) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString("en-NG");
}
