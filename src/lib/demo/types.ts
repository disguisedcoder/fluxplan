export type DemoRoleKey = "familienplanner" | "taskplanner" | "evalrunner";

export type DemoTaskInput = {
  title: string;
  description?: string | null;
  priority?: "low" | "medium" | "high";
  dueDate?: Date | null;
  reminderAt?: Date | null;
  listName?: string | null;
  tags?: ReadonlyArray<string>;
  estimatedMinutes?: number | null;
};

export type DemoViewEvent = {
  from?: string | null;
  to: string;
  at?: Date;
};

export type DemoRoleDefinition = {
  key: DemoRoleKey;
  label: string;
  description: string;
  tasks: DemoTaskInput[]; // sized per study design (>= 10 recommended)
  viewEvents?: DemoViewEvent[];
  preferences?: Array<{ key: string; value: unknown }>;
  // extra evaluations that require (screen=task_created, taskId)
  evaluations?: Array<{ screen: string; taskTitle: string; metadata?: Record<string, unknown> }>;
  /** Zusatzfelder fürs EventLog (nur JSON-Objekte, damit Spread in Routes typsicher bleibt). */
  eventLogMetadata?: Record<string, unknown>;
};

export function assertMinTasks(def: DemoRoleDefinition, min = 10) {
  if (def.tasks.length < min) {
    throw new Error(`Demo role ${def.key} must define at least ${min} tasks, got ${def.tasks.length}`);
  }
}

