import { google } from "googleapis";
import { GoogleTokens, TaskSummary } from "../types";
import { getOAuth2Client } from "./googleAuth";

/**
 * Fetch active (incomplete) tasks from all of the user's Google Tasks lists.
 */
export async function fetchActiveTasks(tokens: GoogleTokens): Promise<TaskSummary[]> {
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    return [];
  }

  const auth = getOAuth2Client(tokens);
  const tasksService = google.tasks({ version: "v1", auth });

  try {
    const tasklists = [];
    let listPageToken: string | undefined;
    do {
      const response = await tasksService.tasklists.list({
        maxResults: 100,
        pageToken: listPageToken,
      });
      tasklists.push(...(response.data.items || []));
      listPageToken = response.data.nextPageToken || undefined;
    } while (listPageToken);

    const listsOfTasks = await Promise.all(tasklists.map(async (tasklist) => {
      if (!tasklist.id) return [];
      const items = [];
      let pageToken: string | undefined;
      do {
        const response = await tasksService.tasks.list({
          tasklist: tasklist.id,
          showCompleted: false,
          showHidden: false,
          maxResults: 100,
          pageToken,
        });
        items.push(...(response.data.items || []));
        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      return items
        .filter((task) => !!task.id && !!task.title)
        .map((task) => ({
          id: task.id!,
          tasklistId: tasklist.id!,
          title: task.title!,
          // Google Tasks due dates are date-only values encoded at midnight UTC.
          due: task.due ? new Date(task.due).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }) : null,
          completed: false,
        }));
    }));

    return listsOfTasks.flat();
  } catch (error) {
    console.error("Error fetching Google Tasks:", error);
    throw error;
  }
}

/**
 * Mark a task as completed in Google Tasks
 */
export async function markTaskCompleted(
  tokens: GoogleTokens,
  taskId: string,
  tasklistId = "@default"
): Promise<void> {
  const auth = getOAuth2Client(tokens);
  const tasksService = google.tasks({ version: "v1", auth });

  await tasksService.tasks.patch({
    tasklist: tasklistId,
    task: taskId,
    requestBody: {
      status: "completed",
    },
  });
}
