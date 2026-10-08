import {validPollId} from "./widgets";
export {validTimeZone} from "./zonedTime";

export interface PollOption {id: string; label: string}
export interface PollDefinition {
  question: string;
  description: string;
  answerMode: "choices" | "mixed" | "written";
  options: PollOption[];
  resultsVisibility: "live" | "after-vote" | "closed";
  protection: "browser" | "invitation";
  moderate: boolean;
  defaultDurationMinutes: number | null;
}
export interface PollTemplate extends PollDefinition {id: string; revision: number; updatedAtMs: number}
export interface PollRound extends PollDefinition {
  id: string;
  templateId: string;
  referenceDeviceId: string;
  timeZone: string;
  endsAtMs: number | null;
  state: "open" | "closed" | "archived";
  createdAtMs: number;
  revision: number;
  total: number;
  counts: Record<string, number>;
  writtenCount: number;
  pendingCount: number;
  accessHash: string;
  encryptedAccess: string;
  invitationCount: number;
}
export interface PollResult {id: string; label: string; count: number}
export interface PollView extends PollDefinition {
  id: string;
  revision: number;
  total: number;
  pendingCount: number;
  writtenCount: number;
  results: PollResult[] | null;
  state: "open" | "closed" | "archived";
  endsAtMs: number | null;
  timeZone: string;
  joinUrl?: string;
}
export interface PollReceipt {requestId: string; receivedAtMs: number; name: string; optionId: string | null; answer: string | null}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function cleanPollText(value: unknown, max: number, empty = false): string | null {
  if (typeof value !== "string") return null;
  const text = value.normalize("NFKC").trim();
  const controls = [...text].some((c) => {
    const n = c.charCodeAt(0); return n < 9 || n >= 11 && n < 32 || n === 127;
  });
  return (!text && !empty) || [...text].length > max || controls ? null : text;
}
export function parsePollDefinition(value: unknown): PollDefinition | null {
  if (!record(value)) return null;
  const question = cleanPollText(value.question, 160);
  const description = cleanPollText(value.description ?? "", 500, true);
  if (!question || description === null || !["choices", "mixed", "written"].includes(String(value.answerMode)) ||
    !["live", "after-vote", "closed"].includes(String(value.resultsVisibility)) || !["browser", "invitation"].includes(String(value.protection)) ||
    typeof value.moderate !== "boolean" || !Array.isArray(value.options) || value.options.length > 12 ||
    (value.defaultDurationMinutes !== null && (!Number.isInteger(value.defaultDurationMinutes) || Number(value.defaultDurationMinutes) < 1 || Number(value.defaultDurationMinutes) > 525600))) return null;
  const ids = new Set<string>(); const labels = new Set<string>(); const options: PollOption[] = [];
  for (const option of value.options) {
    if (!record(option) || typeof option.id !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(option.id) || ids.has(option.id)) return null;
    const label = cleanPollText(option.label, 80);
    if (!label || labels.has(label.toLocaleLowerCase("en-US"))) return null;
    ids.add(option.id); labels.add(label.toLocaleLowerCase("en-US")); options.push({id: option.id, label});
  }
  if (value.answerMode === "written" ? options.length !== 0 : options.length < 2) return null;
  return {question, description, options, answerMode: value.answerMode as PollDefinition["answerMode"], resultsVisibility: value.resultsVisibility as PollDefinition["resultsVisibility"],
    protection: value.protection as PollDefinition["protection"], moderate: value.moderate, defaultDurationMinutes: value.defaultDurationMinutes as number | null};
}
export const pollState = (round: Pick<PollRound, "state" | "endsAtMs">, now: number): PollRound["state"] =>
  round.state === "open" && round.endsAtMs !== null && now >= round.endsAtMs ? "closed" : round.state;
export function parseBallot(body: unknown, round: PollDefinition) {
  if (!record(body) || !validPollId(body.requestId)) return null;
  const name = cleanPollText(body.name, 60);
  const answer = cleanPollText(body.answer ?? "", 160, true);
  const optionId = body.optionId;
  if (!name || answer === null) return null;
  if (typeof optionId === "string" && optionId && round.answerMode !== "written" && !answer && round.options.some((o) => o.id === optionId)) {
    return {requestId: body.requestId, name, optionId, answer: null};
  }
  if (round.answerMode !== "choices" && answer && (optionId === null || optionId === undefined || optionId === "")) {
    return {requestId: body.requestId, name, optionId: null, answer};
  }
  return null;
}
export function resultsAllowed(round: PollDefinition & {state: PollRound["state"]}, voted: boolean, privileged: boolean): boolean {
  return round.state !== "open" || round.resultsVisibility === "live" || (round.resultsVisibility === "after-vote" && (voted || privileged));
}
/** A local datetime is translated using TV timezone; reject DST gaps and duplicate wall times. */
export function pollLocalDeadline(value: unknown, timeZone: string): number | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Choose a valid closing date and time");
  const target = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(target)) throw new Error("Choose a valid closing date and time");
  const formatter = new Intl.DateTimeFormat("en-CA", {timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
  const format = (time: number) => {
    const p = Object.fromEntries(formatter.formatToParts(time).map((part) => [part.type, part.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  };
  const offsets = new Set<number>();
  for (const delta of [-86400000, 0, 86400000]) {
    const probe = target + delta;
    offsets.add(Date.parse(`${format(probe)}:00Z`) - probe);
  }
  const matches = [...offsets].map((offset) => target - offset).filter((t) => format(t) === value);
  if (matches.length !== 1) throw new Error("This time is ambiguous or skipped by daylight saving. Choose a different time.");
  return matches[0];
}
