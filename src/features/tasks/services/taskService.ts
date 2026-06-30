import { adminFetch } from "@/lib/admin-api";
import { TaskPriority, TaskStatus, TeamMember } from "@/features/tasks/types/task";

export async function createTask(body: {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeIds?: string[];
}) {
  return adminFetch("/api/admin/tasks/create", { body });
}

export async function updateTask(body: {
  taskId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds?: string[];
}) {
  return adminFetch("/api/admin/tasks/update", { body });
}

export async function deleteTask(taskId: string) {
  return adminFetch("/api/admin/tasks/delete", { body: { taskId } });
}

export async function fetchTeamMembers() {
  return adminFetch<{ items: TeamMember[] }>("/api/admin/team/list", {
    method: "GET",
  });
}
