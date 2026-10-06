const shortDateFormatter = new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', timeZone:'UTC'});

/** Date-only labels preserve the supplied calendar day, independent of TV timezone. */
export function shortDateLabel(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return value;
  return shortDateFormatter.format(date);
}
