import { AppState, Task } from "./types";
import { defaultState, defaultTasks } from "./defaults";
import { formatDate } from "./dates";

const STORAGE_KEY = "ise-mvp-state";

const defaultTaskMap = new Map(
  defaultTasks.map((task) => [
    task.id,
    { name: task.name, history: task.history }
  ])
);

function isLegacySeedTasks(tasks: Task[]) {
  if (!tasks.length) return false;
  const seedNames = new Set([
    "完成 SaaS MVP",
    "产品设计文档",
    "学习 TypeScript",
    "用户调研",
    "健身计划",
    "读书计划"
  ]);
  return tasks.every(
    (task) => seedNames.has(task.name) && task.history.length <= 1
  );
}

function normalizeTasks(tasks: Task[]) {
  return tasks.map((task) => {
    if (typeof task.progress !== "number") {
      return { ...task, progress: 0 };
    }
    return task;
  });
}

function normalizeState(parsed: AppState): AppState {
  const legacySeed = parsed.tasks?.length
    ? isLegacySeedTasks(parsed.tasks)
    : false;
  return {
    ...defaultState,
    ...parsed,
    tasks: legacySeed
      ? []
      : parsed.tasks?.length
        ? normalizeTasks(parsed.tasks)
        : defaultState.tasks,
    executionLog: parsed.executionLog?.length
      ? parsed.executionLog
      : defaultState.executionLog,
    focusTaskId: legacySeed ? undefined : parsed.focusTaskId
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return defaultState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState;
  try {
    const parsed = JSON.parse(raw) as AppState;
    return normalizeState(parsed);
  } catch {
    return defaultState;
  }
}

export async function loadStateFromServer() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { state?: AppState | null };
    if (!data.state) return null;
    return normalizeState(data.state as AppState);
  } catch {
    return null;
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state })
  }).catch(() => {});
}

export function addTaskHistory(task: Task, action: string): Task {
  const nextEntry = { date: formatDate(new Date()), action };
  return {
    ...task,
    lastBreakthrough: nextEntry.date,
    history: [nextEntry, ...task.history]
  };
}
