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
  tasks: DemoTaskInput[]; // exactly 10 (enforced by creator)
  viewEvents?: DemoViewEvent[];
  preferences?: Array<{ key: string; value: unknown }>;
  // extra evaluations that require (screen=task_created, taskId)
  evaluations?: Array<{ screen: string; taskTitle: string; metadata?: Record<string, unknown> }>;
  /** Zusatzfelder fürs EventLog (nur JSON-Objekte, damit Spread in Routes typsicher bleibt). */
  eventLogMetadata?: Record<string, unknown>;
};

export function assertTenTasks(def: DemoRoleDefinition) {
  if (def.tasks.length !== 10) {
    throw new Error(`Demo role ${def.key} must define exactly 10 tasks, got ${def.tasks.length}`);
  }
}

