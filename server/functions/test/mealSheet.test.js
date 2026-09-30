const test = require("node:test");
const assert = require("node:assert/strict");
const {mealDate, parseMealRows, spreadsheetIdFromUrl} = require("../lib/services/mealSheet");

test("reads the user's Meals tab columns and ignores non-dinner rows", () => {
  const rows = [
    ["Date", "Week", "Day", "Meal_Name", "Recipe_ID", "Servings", "Notes/Prep_Style"],
    ["2026-10-05", "Week 1", "Monday", "Baked Greek Chicken", "REC-W1-01", 4, "Sheet pan"],
    ["2026-10-06", "Week 1", "Tuesday", "Turkey Taco Bowls", "REC-W1-02", 4, ""],
  ];
  const parsed = parseMealRows(rows);
  assert.equal(parsed.foundHeader, true);
  assert.deepEqual(parsed.items[0], {
    date: "2026-10-05", title: "Baked Greek Chicken", servings: "4",
    recipeId: "REC-W1-01", note: "Sheet pan",
  });
  assert.equal(parsed.items.length, 2);
});

test("accepts Google Sheets serial dates and rejects invalid dates", () => {
  assert.equal(mealDate(46300), "2026-10-05");
  assert.equal(mealDate("2026-02-30"), null);
  assert.equal(mealDate("Monday"), null);
});

test("accepts only Google Sheets links", () => {
  const id = "1tiqyWJTxWYjB4ycm9B851JMQcl0dqTkOX1AQYQn8Up4";
  assert.equal(spreadsheetIdFromUrl(`https://docs.google.com/spreadsheets/d/${id}/edit?usp=sharing`), id);
  assert.equal(spreadsheetIdFromUrl(`https://example.com/spreadsheets/d/${id}/edit`), null);
});
