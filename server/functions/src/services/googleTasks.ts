import { google, tasks_v1 as TasksV1 } from "googleapis";
import { GoogleTokens, TaskSummary } from "../types";
import { getOAuth2Client } from "./googleAuth";
import {logSafeError} from "../utils/safeLog";

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
    const tasklists: TasksV1.Schema$TaskList[] = [];
    let listPageToken: string | undefined;
    let listPages = 0;
    do {
      const response = await tasksService.tasklists.list({
        maxResults: 100,
        pageToken: listPageToken,
      });
      tasklists.push(...(response.data.items || []));
      listPageToken = response.data.nextPageToken || undefined;
      listPages++;
    } while (listPageToken && listPages < 2);

    const fetchOne = async (tasklist: typeof tasklists[number]) => {
      if (!tasklist.id) return [];
      const items = [];
      let pageToken: string | undefined;
      let pages = 0;
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
        pages++;
      } while (pageToken && pages < 2);

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
    };
    const listsOfTasks: TaskSummary[][] = [];
    const selected = tasklists.slice(0, 20);
    for (let start = 0; start < selected.length; start += 5) {
      listsOfTasks.push(...await Promise.all(selected.slice(start, start + 5).map(fetchOne)));
    }

    return listsOfTasks.flat();
  } catch (error) {
    logSafeError("Error fetching Google Tasks", error);
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
