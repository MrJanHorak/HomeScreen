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

test("exports absolute clipped occurrence bounds for timed and overnight events", () => {
  const feed=buildCalendarFeed([
    entry(primary,"overnight",{dateTime:"2026-09-29T23:30:00-04:00"},{dateTime:"2026-09-30T01:00:00-04:00"}),
  ],now,zone);
  assert.equal(feed.today[0].startMs,Date.parse("2026-09-30T03:30:00Z"));
  assert.equal(feed.today[0].endMs,Date.parse("2026-09-30T04:00:00Z"));
  assert.equal(feed.upcoming[0].startMs,Date.parse("2026-09-30T04:00:00Z"));
  assert.equal(feed.upcoming[0].endMs,Date.parse("2026-09-30T05:00:00Z"));
  assert.equal(feed.today[0].allDay,false);
  assert.equal(feed.today[0].timeZone,zone);
});

test("all-day occurrence bounds follow 23- and 25-hour daylight-saving days", () => {
  for(const [date,next,hours,start,end] of [
    ["2026-03-08","2026-03-09",23,"2026-03-08T05:00:00Z","2026-03-09T04:00:00Z"],
    ["2026-11-01","2026-11-02",25,"2026-11-01T04:00:00Z","2026-11-02T05:00:00Z"],
  ]) {
    const feed=buildCalendarFeed([entry(primary,"day",{date},{date:next})],new Date(start),zone);
    assert.equal(feed.today[0].startMs,Date.parse(start));
    assert.equal(feed.today[0].endMs,Date.parse(end));
    assert.equal((feed.today[0].endMs-feed.today[0].startMs)/3600000,hours);
    assert.equal(feed.today[0].allDay,true);
  }
});
