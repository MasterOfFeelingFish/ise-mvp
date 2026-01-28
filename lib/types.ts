export type MomentumStatus = "green" | "yellow" | "red";

export type TaskHistoryEntry = {
  date: string;
  action: string;
};

export type Task = {
  id: string;
  name: string;
  level: "year_goal" | "month_project" | "daily_lever" | "constraint";
  status: "active" | "paused" | "done";
  parentId?: string;
  momentum?: MomentumStatus;
  lastBreakthrough?: string;
  frictionPoints: string[];
  history: TaskHistoryEntry[];
  visionMap?: string;
  progress?: number;
};

export type Identity = {
  target: string;
  vision: string;
  antiVision: string;
  constraints: string[];
  createdAt: string;
  dayCount: number;
};

export type ExecutionLog = {
  date: string;
  completed: number;
  total: number;
};

export type AppState = {
  identity?: Identity;
  tasks: Task[];
  focusTaskId?: string;
  executionLog: ExecutionLog[];
  lastAlignAt?: string;
  lastAuditAt?: string;
};
