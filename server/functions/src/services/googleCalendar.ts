import { google, calendar_v3 as CalendarV3 } from "googleapis";
import { GoogleTokens, CalendarEventSummary } from "../types";
import { getOAuth2Client } from "./googleAuth";
import {logSafeError} from "../utils/safeLog";
import {zonedDateKey as dateInZone, zonedMidnight} from "../utils/zonedTime";

const UPCOMING_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CalendarFeed {
  today: CalendarEventSummary[];
  upcoming: CalendarEventSummary[];
}

// Google Calendar's standard 11 event colors
const GOOGLE_EVENT_COLORS: Record<string, string> = {
  "1": "#7986cb", "2": "#33b679", "3": "#8e24aa", "4": "#e67c73",
  "5": "#f6bf26", "6": "#f4511e", "7": "#039be5", "8": "#616161",
  "9": "#3f51b5", "10": "#0b8043", "11": "#d50000",
};

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString().slice(0, 10);
}

function formatTimeString(isoString: string, timeZone: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    timeZone, hour: "numeric", minute: "2-digit", hour12: true,
  });
}

type CalendarEntry = Pick<CalendarV3.Schema$CalendarListEntry,
  "id" | "summary" | "backgroundColor" | "primary">;

/** Expand all-day and timed events onto each local date they occupy. */
export function buildCalendarFeed(
  entries: Array<{ calendar: CalendarEntry; event: CalendarV3.Schema$Event }>,
  now: Date,
  timeZone: string
): CalendarFeed {
  const today = dateInZone(now, timeZone);
  const lastDate = addDays(today, UPCOMING_DAYS);
  const occurrences: Array<{ event: CalendarEventSummary; primary: boolean; startTime: number }> = [];

  for (const { calendar, event } of entries) {
    if (event.status === "cancelled") continue;
    const allDayStart = event.start?.date;
    const allDayEnd = event.end?.date;
    const startIso = event.start?.dateTime;
    const endIso = event.end?.dateTime;
    const isAllDay = !!allDayStart;
    const startMs = startIso ? Date.parse(startIso) : NaN;
    const endMs = endIso ? Date.parse(endIso) : NaN;
    if (!isAllDay && (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs)) continue;

    const firstDate = isAllDay ? allDayStart! : dateInZone(new Date(startMs), timeZone);
    // Google all-day end dates are exclusive. Timed event end instants are exclusive too.
    const finalDate = isAllDay
      ? addDays(allDayEnd || addDays(firstDate, 1), -1)
      : dateInZone(new Date(endMs - 1), timeZone);
    if (firstDate > lastDate || finalDate < today) continue;

    const color = (event.colorId && GOOGLE_EVENT_COLORS[event.colorId]) ||
      calendar.backgroundColor || "#039be5";
    for (let date = firstDate < today ? today : firstDate;
      date <= finalDate && date <= lastDate; date = addDays(date, 1)) {
      const startsToday = firstDate === date;
      const endsToday = finalDate === date;
      const dayStart = zonedMidnight(date, timeZone);
      const dayEnd = zonedMidnight(addDays(date, 1), timeZone);
      occurrences.push({
        event: {
          id: `${calendar.id || "primary"}:${event.id || event.iCalUID || "event"}:${date}`,
          title: event.summary || "Untitled Event",
          time: isAllDay ? "All Day" : startsToday ? formatTimeString(startIso!, timeZone) : "Continues",
          endTime: isAllDay ? "All Day" : endsToday ? formatTimeString(endIso!, timeZone) : "Continues",
          category: calendar.summary || "General",
          color,
          date,
          // Each occupied date has its own absolute window, including 23/25-hour DST days.
          startMs: isAllDay ? dayStart : Math.max(startMs, dayStart),
          endMs: isAllDay ? dayEnd : Math.min(endMs, dayEnd),
          allDay: isAllDay,
          timeZone,
        },
        primary: calendar.primary === true,
        startTime: isAllDay || !startsToday ? 0 : startMs,
      });
    }
  }

  occurrences.sort((a, b) =>
    a.event.date!.localeCompare(b.event.date!) ||
    (a.event.date === today ? Number(b.primary) - Number(a.primary) : 0) ||
    a.startTime - b.startTime ||
    Number(b.primary) - Number(a.primary) ||
    a.event.title.localeCompare(b.event.title)
  );
  return {
    today: occurrences.filter(({ event }) => event.date === today).map(({ event }) => event),
    upcoming: occurrences.filter(({ event }) => event.date !== today).map(({ event }) => event),
  };
}

/** Fetch today and the next 14 days across the user's selected calendars. */
export async function fetchCalendarEvents(tokens: GoogleTokens): Promise<CalendarFeed> {
  const empty: CalendarFeed = { today: [], upcoming: [] };
  if (!tokens?.accessToken && !tokens?.refreshToken) return empty;

  const auth = getOAuth2Client(tokens);
  const calendar = google.calendar({ version: "v3", auth });
  const now = new Date();
  try {
    const calendarListRes = await calendar.calendarList.list({ minAccessRole: "reader" });
    const userCalendars = (calendarListRes.data.items || []).filter((c) => c.selected !== false);
    const timeZone = userCalendars.find((cal) => cal.primary)?.timeZone ||
      userCalendars[0]?.timeZone || "UTC";
    const calendarsToFetch: CalendarEntry[] = userCalendars.length > 0
      ? userCalendars.slice(0, 10)
      : [{ id: "primary", summary: "General", backgroundColor: "#3f51b5", primary: true }];

    // UTC bounds cover every local date in the feed, including DST changes.
    const timeMin = new Date(now.getTime() - DAY_MS).toISOString();
    const timeMax = new Date(now.getTime() + 16 * DAY_MS).toISOString();
    const fetchOne = async (entry: CalendarEntry) => {
      try {
        const events: Array<{ calendar: CalendarEntry; event: CalendarV3.Schema$Event }> = [];
        let pageToken: string | undefined;
        let pages = 0;
        do {
          const response = await calendar.events.list({
            calendarId: entry.id || "primary", timeMin, timeMax, timeZone,
            singleEvents: true, orderBy: "startTime", maxResults: 250, pageToken,
          });
          events.push(...(response.data.items || []).map((event) => ({ calendar: entry, event })));
          pageToken = response.data.nextPageToken || undefined;
          pages++;
        } while (pageToken && pages < 2);
        return events;
      } catch (err) {
        logSafeError("Failed to fetch calendar events", err);
        return [];
      }
    };
    const results: Array<{calendar: CalendarEntry; event: CalendarV3.Schema$Event}[]> = [];
    for (let start = 0; start < calendarsToFetch.length; start += 5) {
      results.push(...await Promise.all(calendarsToFetch.slice(start, start + 5).map(fetchOne)));
    }
    return buildCalendarFeed(results.flat(), now, timeZone);
  } catch (error) {
    logSafeError("Error fetching Google Calendar events", error);
    return empty;
  }
}
