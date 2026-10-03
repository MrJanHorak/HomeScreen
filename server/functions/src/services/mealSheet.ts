import {google} from "googleapis";
import {MealPlanItem, MealPlanSummary, StoredUserTokens} from "../types";
import {getOAuth2Client} from "./googleAuth";
import {logSafeError} from "../utils/safeLog";

type Cell = string | number | boolean | null;

const DATE_HEADERS = ["date", "mealdate", "dinnerdate", "scheduleddate"];
const TITLE_HEADERS = ["main", "maindish", "dish", "meal", "dinner", "mealname", "dinnername", "title"];
const TYPE_HEADERS = ["mealtype", "type", "course"];
const SIDE_HEADERS = ["side", "sides", "sidedish"];
const COOK_HEADERS = ["cook", "cooking", "chef", "assignedcook", "preparedby"];
const SERVINGS_HEADERS = ["servings", "serves", "people"];
const RECIPE_ID_HEADERS = ["recipeid", "recipekey"];
const NOTE_HEADERS = ["notesprepstyle", "notes", "prepstyle", "preparationnotes"];
const RECIPE_HEADERS = ["recipeurl", "recipelink", "recipe", "link"];

function normalized(value: Cell | undefined): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: Cell[], names: string[]): number {
  return headers.findIndex((value) => names.includes(normalized(value)));
}

function validDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

export function mealDate(value: Cell | undefined): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    // Google Sheets' default unformatted date representation is a serial day.
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/.exec(text);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (us) return validDate(Number(us[3]), Number(us[1]), Number(us[2]));
  return null;
}

function safeText(value: Cell | undefined): string {
  return String(value ?? "").trim().slice(0, 250);
}

function safeUrl(value: Cell | undefined): string | undefined {
  const raw = safeText(value);
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Finds a header row near the top and reads one dinner per dated row. */
export function parseMealRows(rows: Cell[][]): {foundHeader: boolean; items: MealPlanItem[]} {
  const headerIndex = rows.slice(0, 10).findIndex((row) =>
    findColumn(row, DATE_HEADERS) >= 0 && findColumn(row, TITLE_HEADERS) >= 0);
  if (headerIndex < 0) return {foundHeader: false, items: []};
  const headers = rows[headerIndex];
  const dateColumn = findColumn(headers, DATE_HEADERS);
  const titleColumn = findColumn(headers, TITLE_HEADERS);
  const typeColumn = findColumn(headers, TYPE_HEADERS);
  const sideColumn = findColumn(headers, SIDE_HEADERS);
  const cookColumn = findColumn(headers, COOK_HEADERS);
  const servingsColumn = findColumn(headers, SERVINGS_HEADERS);
  const recipeIdColumn = findColumn(headers, RECIPE_ID_HEADERS);
  const noteColumn = findColumn(headers, NOTE_HEADERS);
  const recipeColumn = findColumn(headers, RECIPE_HEADERS);
  const items: MealPlanItem[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const date = mealDate(row[dateColumn]);
    const title = safeText(row[titleColumn]);
    if (!date || !title) continue;
    const mealType = typeColumn < 0 ? "dinner" : normalized(row[typeColumn]);
    if (mealType && !["dinner", "supper", "eveningmeal"].includes(mealType)) continue;
    const side = sideColumn < 0 ? "" : safeText(row[sideColumn]);
    const cook = cookColumn < 0 ? "" : safeText(row[cookColumn]);
    const servings = servingsColumn < 0 ? "" : safeText(row[servingsColumn]);
    const recipeId = recipeIdColumn < 0 ? "" : safeText(row[recipeIdColumn]);
    const note = noteColumn < 0 ? "" : safeText(row[noteColumn]);
    const recipeUrl = recipeColumn < 0 ? undefined : safeUrl(row[recipeColumn]);
    items.push({date, title, ...(side ? {side} : {}), ...(cook ? {cook} : {}),
      ...(servings ? {servings} : {}), ...(recipeId ? {recipeId} : {}),
      ...(note ? {note} : {}), ...(recipeUrl ? {recipeUrl} : {})});
  }
  return {foundHeader: true, items};
}

export function spreadsheetIdFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" || url.hostname !== "docs.google.com") return null;
    const match = /^\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})(?:\/|$)/.exec(url.pathname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function readMealSheet(
  connection: NonNullable<StoredUserTokens["mealSheet"]>, spreadsheetId: string
): Promise<{title: string; items: MealPlanItem[]; foundHeader: boolean}> {
  const sheets = google.sheets({version: "v4", auth: getOAuth2Client(connection)});
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId, fields: "properties(title),sheets(properties(title,hidden))",
  });
  const tabs = (metadata.data.sheets || []).map((tab) => tab.properties)
    .filter((tab) => tab?.title && tab.hidden !== true);
  const candidates = tabs.filter((tab) => /meal|menu|week/i.test(tab!.title!));
  const selected = (candidates.length ? candidates : tabs.slice(0, 1)).slice(0, 20);
  if (!selected.length) {
    return {title: metadata.data.properties?.title || "Meal plan",
      items: [], foundHeader: false};
  }
  const ranges = selected.map((tab) => `'${tab!.title!.replace(/'/g, "''")}'!A1:Z1000`);
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId, ranges, valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER",
  });
  let foundHeader = false;
  const items: MealPlanItem[] = [];
  for (const range of response.data.valueRanges || []) {
    const parsed = parseMealRows((range.values || []) as Cell[][]);
    foundHeader ||= parsed.foundHeader;
    items.push(...parsed.items);
  }
  const unique = new Map<string, MealPlanItem>();
  for (const item of items) unique.set(`${item.date}|${item.title.toLowerCase()}`, item);
  return {
    title: metadata.data.properties?.title || "Meal plan",
    items: [...unique.values()].sort((a, b) => a.date.localeCompare(b.date)),
    foundHeader,
  };
}

export async function fetchMealPlan(
  connection: StoredUserTokens["mealSheet"]
): Promise<MealPlanSummary> {
  if (!connection?.spreadsheetId || !connection.refreshToken) {
    return {status: "not_connected", items: []};
  }
  try {
    const result = await readMealSheet(connection, connection.spreadsheetId);
    if (!result.foundHeader) {
      return {status: "unavailable", items: [],
        message: "The meal Sheet needs Date and Main columns."};
    }
    return {status: "ok", items: result.items};
  } catch (error) {
    logSafeError("Could not read meal Sheet", error);
    return {status: "unavailable", items: [],
      message: "The meal Sheet is unavailable. Check its connection on your phone."};
  }
}
