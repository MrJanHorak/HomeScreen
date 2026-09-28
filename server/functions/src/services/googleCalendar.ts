import { google } from "googleapis";
import { GoogleTokens, CalendarEventSummary } from "../types";
import { getOAuth2Client } from "./googleAuth";

// Google Calendar's standard 11 event colors
const GOOGLE_EVENT_COLORS: Record<string, string> = {
  "1": "#7986cb", // Lavender
  "2": "#33b679", // Sage
  "3": "#8e24aa", // Grape
  "4": "#e67c73", // Flamingo
  "5": "#f6bf26", // Banana
  "6": "#f4511e", // Tangerine
  "7": "#039be5", // Peacock
  "8": "#616161", // Graphite
  "9": "#3f51b5", // Blueberry
  "10": "#0b8043", // Basil
  "11": "#d50000", // Tomato
};

function formatTimeString(isoString?: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Fetch calendar events for today across all user calendars with real Google colors and categories
 */
export async function fetchCalendarEvents(tokens: GoogleTokens): Promise<CalendarEventSummary[]> {
  if (!tokens?.accessToken && !tokens?.refreshToken) return [];

  const auth = getOAuth2Client(tokens);
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);

  try {
    // 1. Fetch all user's calendars (Work, Personal, Family, etc.)
    const calendarListRes = await calendar.calendarList.list({ minAccessRole: "reader" });
    const userCalendars = (calendarListRes.data.items || []).filter((c) => c.selected !== false);

    // Default to 'primary' if list is empty
    const calendarsToFetch =
      userCalendars.length > 0
        ? userCalendars
        : [{ id: "primary", summary: "General", backgroundColor: "#3f51b5" }];

    // 2. Fetch today's events from each calendar in parallel
    const eventPromises = calendarsToFetch.map(async (cal) => {
      try {
        const eventsRes = await calendar.events.list({
          calendarId: cal.id || "primary",
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 15,
        });

        return (eventsRes.data.items || []).map((item) => {
          const summary = item.summary || "Untitled Event";
          const startIso = item.start?.dateTime || item.start?.date;
          const endIso = item.end?.dateTime || item.end?.date;

          // Resolve color: individual event color > calendar color > fallback blue
          const eventColor =
            (item.colorId && GOOGLE_EVENT_COLORS[item.colorId]) ||
            cal.backgroundColor ||
            "#039be5";

          // The Category is the calendar name (e.g. "Work", "Fitness", "Personal")
          const category = cal.summary || "General";

          return {
            id: item.id || `cal-${Math.random().toString(36).substring(2, 9)}`,
            title: summary,
            time: formatTimeString(startIso) || "All Day",
            endTime: formatTimeString(endIso) || "All Day",
            category,
            color: eventColor,
            date: startIso ? startIso.split("T")[0] : undefined,
          };
        });
      } catch (err) {
        console.warn(`Failed to fetch events for calendar ${cal.summary}:`, err);
        return [];
      }
    });

    const allEvents = (await Promise.all(eventPromises)).flat();

    // 3. Sort chronologically
    return allEvents.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
    return [];
  }
}
