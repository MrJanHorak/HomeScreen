/** Google may use an account address or calendar ID as its display name. */
export function calendarDisplayName(value?: string): string {
  const name = value?.trim() || "";
  return name.includes("@") ? "" : name;
}
