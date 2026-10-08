export function validTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en", {timeZone: value}).format(); return true;
  } catch {
    return false;
  }
}

function dayParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const get = (part: string) => Number(parts.find((item) => item.type === part)?.value);
  return {year: get("year"), month: get("month"), day: get("day"),
    hour: get("hour"), minute: get("minute"), second: get("second")};
}

export function zonedDateKey(instant: Date, timeZone: string): string {
  const {year, month, day} = dayParts(instant, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Existing Fit day-boundary calculation, shared with Calendar's occurrence windows. */
export function zonedMidnight(date: string, timeZone: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const desired = Date.UTC(year, month - 1, day);
  let guess = desired;
  for (let i = 0; i < 3; i++) {
    const p = dayParts(new Date(guess), timeZone);
    const represented = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += desired - represented;
  }
  return guess;
}
