import type { APIRequestContext } from "@playwright/test";

export async function resetUserData(api: APIRequestContext) {
  const res = await api.post("/api/data/reset");
  if (!res.ok()) throw new Error(`resetUserData failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<{ ok: true }>;
}

export async function listTasks(api: APIRequestContext, params?: Record<string, string>) {
  const sp = new URLSearchParams(params ?? {});
  const res = await api.get(`/api/tasks${sp.size ? `?${sp.toString()}` : ""}`);
  if (!res.ok()) throw new Error(`listTasks failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<{ tasks: Array<{ id: string; title: string }> }>;
}

export async function createTask(api: APIRequestContext, data: Record<string, unknown>) {
  const res = await api.post("/api/tasks", { data });
  if (!res.ok()) throw new Error(`createTask failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<{ task: { id: string; title: string } }>;
}

export async function patchTask(api: APIRequestContext, id: string, data: Record<string, unknown>) {
  const res = await api.patch(`/api/tasks/${id}`, { data });
  if (!res.ok()) throw new Error(`patchTask failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<{ task: { id: string; title: string } }>;
}

export async function listSuggestions(api: APIRequestContext, status?: string) {
  const url = status ? `/api/suggestions?status=${encodeURIComponent(status)}` : "/api/suggestions";
  const res = await api.get(url);
  if (!res.ok()) throw new Error(`listSuggestions failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<{
    suggestions: Array<{ id: string; ruleKey: string; type: string; status: string }>;
  }>;
}

export async function respondSuggestion(api: APIRequestContext, id: string, action: "accept" | "reject" | "snooze" | "undo") {
  const res = await api.post(`/api/suggestions/${id}/respond`, { data: { action } });
  if (!res.ok()) throw new Error(`respondSuggestion failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<{ suggestion: { id: string; status: string; respondedAt?: string | null; ruleKey: string } }>;
}

export async function evaluateAdaptive(api: APIRequestContext, screen: string) {
  const res = await api.post("/api/adaptive/evaluate", { data: { screen } });
  if (!res.ok()) throw new Error(`evaluateAdaptive failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<unknown>;
}

export async function exportJson(api: APIRequestContext) {
  const res = await api.get("/api/export?format=json");
  if (!res.ok()) throw new Error(`exportJson failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<{ summary?: Record<string, unknown> }>;
}

