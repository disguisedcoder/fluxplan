import { z } from "zod";

export const TaskStatusSchema = z.enum(["open", "done", "archived"]);
export const TaskPrioritySchema = z.enum(["low", "medium", "high"]);

export const CreateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.string().datetime().optional().nullable(),
  reminderAt: z.string().datetime().optional().nullable(),
  listName: z.string().trim().max(64).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(32)).optional(),
  estimatedMinutes: z.number().int().positive().max(24 * 60).optional().nullable(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: TaskStatusSchema.optional(),
  completedAt: z.string().datetime().optional().nullable(),
});

