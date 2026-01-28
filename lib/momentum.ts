import { Task, MomentumStatus } from "./types";
import { daysSince } from "./dates";

export function getLatestUpdateDate(task: Task) {
  if (!task.history.length) {
    return task.lastBreakthrough;
  }
  return task.history[0].date;
}

export function evaluateMomentum(task: Task): MomentumStatus {
  const latestDate = getLatestUpdateDate(task);
  const days = daysSince(latestDate);
  if (days <= 3) return "green";
  if (days <= 7) return "yellow";
  return "red";
}

export function statusLabel(status: MomentumStatus) {
  if (status === "green") return "进展中";
  if (status === "yellow") return "停滞";
  return "危险";
}

export function statusColor(status: MomentumStatus) {
  if (status === "green") return "green";
  if (status === "yellow") return "yellow";
  return "red";
}
