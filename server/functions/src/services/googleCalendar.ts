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

function dateInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatTimeString(isoString: string, timeZone: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    timeZone,
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
  try {
    // 1. Fetch all user's calendars (Work, Personal, Family, etc.)
    const calendarListRes = await calendar.calendarList.list({ minAccessRole: "reader" });
    const userCalendars = (calendarListRes.data.items || []).filter((c) => c.selected !== false);
    const timeZone = userCalendars.find((cal) => cal.primary)?.timeZone ||
      userCalendars[0]?.timeZone || "UTC";
    const today = dateInZone(now, timeZone);

    // Default to 'primary' if list is empty
    const calendarsToFetch =
      userCalendars.length > 0
        ? userCalendars
        : [{ id: "primary", summary: "General", backgroundColor: "#3f51b5", primary: true }];

    // The full local day lies within this 48-hour UTC window in every time zone.
    // Filter to the user's date after fetching, including across daylight saving changes.
    const timeMin = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // 2. Fetch events from each calendar in parallel
    const eventPromises = calendarsToFetch.map(async (cal) => {
      try {
        const eventsRes = await calendar.events.list({
          calendarId: cal.id || "primary",
          timeMin,
          timeMax,
          timeZone,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 100,
        });

        return (eventsRes.data.items || []).flatMap((item) => {
          const startIso = item.start?.dateTime;
          const endIso = item.end?.dateTime;
          const allDayStart = item.start?.date;
          const allDayEnd = item.end?.date;
          const isAllDay = !!allDayStart;
          const occursToday = isAllDay
            ? allDayStart! <= today && (!allDayEnd || allDayEnd > today)
            : !!startIso && dateInZone(new Date(startIso), timeZone) <= today &&
              (!endIso || dateInZone(new Date(endIso), timeZone) >= today);
          if (!occursToday) return [];

          const summary = item.summary || "Untitled Event";

          // Resolve color: individual event color > calendar color > fallback blue
          const eventColor =
            (item.colorId && GOOGLE_EVENT_COLORS[item.colorId]) ||
            cal.backgroundColor ||
            "#039be5";

          // The Category is the calendar name (e.g. "Work", "Fitness", "Personal")
          const category = cal.summary || "General";

          const event: CalendarEventSummary = {
            id: item.id || `cal-${Math.random().toString(36).substring(2, 9)}`,
            title: summary,
            time: isAllDay ? "All Day" : formatTimeString(startIso!, timeZone),
            endTime: isAllDay ? "All Day" : endIso ? formatTimeString(endIso, timeZone) : "",
            category,
            color: eventColor,
            date: today,
          };
          return [{ event, primary: cal.primary === true,
            startTime: isAllDay ? 0 : Date.parse(startIso!) }];
        });
      } catch (err) {
        console.warn(`Failed to fetch events for calendar ${cal.summary}:`, err);
        return [];
      }
    });

    const allEvents = (await Promise.all(eventPromises)).flat();

    // Prioritize the primary calendar so subscribed calendars do not crowd out
    // the user's events in the compact TV card.
    return allEvents
      .sort((a, b) => Number(b.primary) - Number(a.primary) || a.startTime - b.startTime)
      .map((item) => item.event);
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
    return [];
  }
}
