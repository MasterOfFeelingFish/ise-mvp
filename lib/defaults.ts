import { AppState, Identity, Task } from "./types";
import { formatDate } from "./dates";

export const identityPresets: Record<string, string> = {
  "创业者/CEO": "成为能持续打造产品并带领团队实现规模化增长的创业者",
  "技术专家": "成为能独立交付完整产品并实现被动收入的技术创作者",
  "创作者": "成为能持续输出高质量作品并获得影响力与收入的内容创作者",
  "投资人": "成为能识别长期价值并实现资产稳健增长的投资人",
  "健康达人": "成为兼具体能、精力与心理韧性的健康行动者"
};

export const antiVisionPresets: Record<string, string> = {
  "技术深度不够": "被行业淘汰，持续停留在浅层技能无法突破",
  "缺乏系统性学习": "进步停滞，长期只能重复低价值工作",
  "工作占用太多时间": "核心成长被挤压，长期失去主动性",
  "精力分散": "时间被打散，关键能力长期没有质变",
  "其他": "停留在现状，长期无法兑现真正的潜力"
};

export const constraintOptions = [
  "每天必须有 2 小时深度工作",
  "晚上 11 点前必须睡觉",
  "每天至少运动 30 分钟",
  "每天写作/输出 30 分钟"
];

export const defaultIdentity: Identity = {
  target: "独立开发者",
  vision: "成为能独立交付完整产品并实现被动收入的技术创作者",
  antiVision: "35 岁还在为别人打工，没有自己的作品和收入来源",
  constraints: ["每天必须有 2 小时深度工作", "晚上 11 点前必须睡觉"],
  createdAt: formatDate(new Date()),
  dayCount: 1
};

export const defaultTasks: Task[] = [];

export const defaultExecutionLog = [];

export const defaultState: AppState = {
  identity: undefined,
  tasks: defaultTasks,
  focusTaskId: undefined,
  executionLog: defaultExecutionLog
};
