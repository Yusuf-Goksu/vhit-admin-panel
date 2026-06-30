export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "normal" | "high";

export type AdminTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  createdBy: string;
  createdByName: string;
  updatedByName: string;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
};

export type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  isCurrentUser: boolean;
};
