export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "done" | "archived";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  reminderAt: string | null;
  listName: string | null;
  tags: string[];
  estimatedMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

