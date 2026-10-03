import {DashboardSummaryResponse} from "../types";

/** Keep cached documents and TV payloads predictably small. */
export function boundSummary(summary: DashboardSummaryResponse): DashboardSummaryResponse {
  // Include yesterday in UTC so a household behind UTC keeps its local dinner.
  const earliestDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    ...summary,
    schedule: summary.schedule.slice(0, 80).map((event) => ({...event,
      id: event.id.slice(0, 512), title: event.title.slice(0, 500),
      category: event.category.slice(0, 120)})),
    upcomingEvents: summary.upcomingEvents.slice(0, 160).map((event) => ({...event,
      id: event.id.slice(0, 512), title: event.title.slice(0, 500),
      category: event.category.slice(0, 120)})),
    tasks: summary.tasks.slice(0, 100).map((task) => ({...task,
      id: task.id.slice(0, 256), title: task.title.slice(0, 500),
      tasklistId: task.tasklistId?.slice(0, 256)})),
    meals: {...summary.meals,
      items: summary.meals.items.filter((item) => item.date >= earliestDate).slice(0, 60)},
    savedLocations: summary.savedLocations?.slice(0, 20),
  };
}
