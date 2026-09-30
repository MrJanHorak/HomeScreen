const test = require("node:test");
const assert = require("node:assert/strict");
const {buildCalendarFeed} = require("../lib/services/googleCalendar");

const primary = {id: "primary", summary: "Personal", primary: true};
const work = {id: "work", summary: "Work", primary: false};
const now = new Date("2026-09-30T03:30:00Z"); // Sep 29 in New York
const zone = "America/New_York";

function entry(calendar, id, start, end, summary = id) {
  return {calendar, event: {id, summary, start, end}};
}

test("separates today's events from the next 14 local dates", () => {
  const feed = buildCalendarFeed([
    entry(primary, "today", {dateTime: "2026-09-29T10:00:00-04:00"},
      {dateTime: "2026-09-29T11:00:00-04:00"}),
    entry(work, "tomorrow", {dateTime: "2026-09-30T09:00:00-04:00"},
      {dateTime: "2026-09-30T10:00:00-04:00"}),
    entry(primary, "last-day", {date: "2026-10-13"}, {date: "2026-10-14"}),
    entry(primary, "outside", {date: "2026-10-14"}, {date: "2026-10-15"}),
  ], now, zone);

  assert.deepEqual(feed.today.map((event) => event.title), ["today"]);
  assert.deepEqual(feed.upcoming.map((event) => [event.title, event.date]), [
    ["tomorrow", "2026-09-30"], ["last-day", "2026-10-13"],
  ]);
});

test("uses exclusive end dates and includes each occupied day of multi-day events", () => {
  const feed = buildCalendarFeed([
    entry(primary, "all-day", {date: "2026-09-29"}, {date: "2026-10-01"}),
    entry(primary, "overnight", {dateTime: "2026-09-29T23:00:00-04:00"},
      {dateTime: "2026-09-30T00:00:00-04:00"}),
    entry(primary, "spans-midnight", {dateTime: "2026-09-29T23:30:00-04:00"},
      {dateTime: "2026-09-30T01:00:00-04:00"}),
  ], now, zone);

  assert.deepEqual(feed.upcoming.map((event) => event.title), ["all-day", "spans-midnight"]);
  assert.equal(feed.upcoming[1].time, "Continues");
  assert.equal(feed.upcoming[1].endTime, "1:00 AM");
  assert.equal(feed.today.find((event) => event.title === "overnight").date, "2026-09-29");
});

test("keeps event IDs unique across calendars and dates", () => {
  const feed = buildCalendarFeed([
    entry(primary, "same-id", {date: "2026-09-29"}, {date: "2026-10-01"}),
    entry(work, "same-id", {date: "2026-09-30"}, {date: "2026-10-01"}),
  ], now, zone);
  const ids = [...feed.today, ...feed.upcoming].map((event) => event.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("keeps today's primary calendar first and future days in time order", () => {
  const feed = buildCalendarFeed([
    entry(primary, "late", {dateTime: "2026-09-30T16:00:00-04:00"},
      {dateTime: "2026-09-30T17:00:00-04:00"}),
    entry(work, "early", {dateTime: "2026-09-30T08:00:00-04:00"},
      {dateTime: "2026-09-30T09:00:00-04:00"}),
    entry(primary, "today-primary", {dateTime: "2026-09-29T16:00:00-04:00"},
      {dateTime: "2026-09-29T17:00:00-04:00"}),
    entry(work, "today-work", {dateTime: "2026-09-29T08:00:00-04:00"},
      {dateTime: "2026-09-29T09:00:00-04:00"}),
  ], now, zone);
  assert.deepEqual(feed.today.map((event) => event.title), ["today-primary", "today-work"]);
  assert.deepEqual(feed.upcoming.map((event) => event.title), ["early", "late"]);
});
