import { google } from "googleapis";
import { GoogleTokens, TaskSummary } from "../types";
import { getOAuth2Client } from "./googleAuth";

/**
 * Fetch active (incomplete) tasks from the user's default Google Tasks list
 */
export async function fetchActiveTasks(tokens: GoogleTokens): Promise<TaskSummary[]> {
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    return [];
  }

  const auth = getOAuth2Client(tokens);
  const tasksService = google.tasks({ version: "v1", auth });

  try {
    const response = await tasksService.tasks.list({
      tasklist: "@default",
      showCompleted: false,
      showHidden: false,
      maxResults: 20,
    });

    const items = response.data.items || [];

    return items
      .filter((task) => !!task.title)
      .map((task) => ({
        id: task.id || `task-${Math.random().toString(36).substring(2, 9)}`,
        title: task.title || "Untitled Task",
        due: task.due ? new Date(task.due).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null,
        completed: task.status === "completed",
      }));
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
