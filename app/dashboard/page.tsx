"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadState,
  loadStateFromServer,
  saveState,
  addTaskHistory
} from "../../lib/storage";
import { evaluateMomentum, statusLabel } from "../../lib/momentum";
import { daysSince, formatDate } from "../../lib/dates";
import { AppState, Task } from "../../lib/types";

type AddGoalModal =
  | { type: "none" }
  | { type: "reject"; reason: string }
  | { type: "warn" };

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [message, setMessage] = useState("");
  const [auditorOpen, setAuditorOpen] = useState(true);
  const [suggestion, setSuggestion] = useState("");
  const [suggestionError, setSuggestionError] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [amCompleted, setAmCompleted] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isFrictionLoading, setIsFrictionLoading] = useState(false);
  const [frictionError, setFrictionError] = useState("");
  const matrixRef = useRef<HTMLDivElement | null>(null);
  const [pmStage, setPmStage] = useState<
    "ask" | "followup" | "feedback" | "done"
  >("ask");
  const [pmDetail, setPmDetail] = useState("");
  const [pmOutcome, setPmOutcome] = useState<
    "completed" | "partial" | "missed" | null
  >(null);
  const [addGoalModal, setAddGoalModal] = useState<AddGoalModal>({
    type: "none"
  });
  const [newGoalName, setNewGoalName] = useState("");

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const remote = await loadStateFromServer();
      const nextState = remote ?? loadState();
      if (remote) {
        saveState(remote);
      }
      if (!nextState.identity) {
        router.replace("/onboarding");
        return;
      }
      if (mounted) {
        setState(nextState);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [router]);

  const fetchSuggestion = async (force = false) => {
    if (!state?.identity || isSuggesting) return;
    if (!force && ((state.tasks?.length ?? 0) > 0 || suggestion)) {
      return;
    }
    if (force) {
      setSuggestion("");
    }
    setIsSuggesting(true);
    setSuggestionError("");
    try {
      const response = await fetch("/api/suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: state.identity.target,
          vision: state.identity.vision,
          constraints: state.identity.constraints
        })
      });
      const data = (await response.json()) as {
        suggestion?: string;
        error?: string;
        details?: { message?: string } | string;
      };
      if (!response.ok || !data.suggestion) {
        throw new Error(
          typeof data.details === "string"
            ? data.details
            : data.details?.message || data.error || "suggestion_failed"
        );
      }
      setSuggestion(data.suggestion);
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      setSuggestionError(message);
    } finally {
      setIsSuggesting(false);
    }
  };

  useEffect(() => {
    fetchSuggestion(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const tasks = useMemo(
    () => (state?.tasks ?? []).filter((task) => task.status !== "paused"),
    [state]
  );
  const identity = state?.identity;

  const tasksWithMomentum = useMemo(() => {
    return tasks.map((task) => ({
      ...task,
      momentum: evaluateMomentum(task)
    }));
  }, [tasks]);

  const focusTask = useMemo(() => {
    if (!state) return undefined;
    return (
      tasksWithMomentum.find((task) => task.id === state.focusTaskId) ||
      tasksWithMomentum[0]
    );
  }, [state, tasksWithMomentum]);

  const counts = useMemo(() => {
    const summary = { green: 0, yellow: 0, red: 0 };
    tasksWithMomentum.forEach((task) => {
      if (task.momentum) summary[task.momentum] += 1;
    });
    return summary;
  }, [tasksWithMomentum]);

  const executionRate = useMemo(() => {
    if (!state) return 1;
    const recent = state.executionLog.slice(-3);
    const total = recent.reduce((sum, log) => sum + log.total, 0);
    const completed = recent.reduce((sum, log) => sum + log.completed, 0);
    if (!total) return 1;
    return completed / total;
  }, [state]);

  const deviationWarning =
    counts.red >= 2
      ? "你有 2 个任务处于危险状态超过 7 天。作为独立开发者，核心产品开发应是最高优先级。建议关闭非核心目标。"
      : "当前任务势能较稳定，继续保持核心目标聚焦。";

  const [auditorOverride, setAuditorOverride] = useState<
    "am" | "pm" | null
  >(null);

  const auditorMode = useMemo(() => {
    if (auditorOverride) return auditorOverride;
    const hour = new Date().getHours();
    return hour < 12 ? "am" : "pm";
  }, [auditorOverride]);

  const effectiveAuditorMode = useMemo(() => {
    if (tasksWithMomentum.length === 0) return "am";
    return auditorMode;
  }, [tasksWithMomentum.length, auditorMode]);

  useEffect(() => {
    if (effectiveAuditorMode === "pm") {
      setPmStage("ask");
      setPmDetail("");
    }
  }, [effectiveAuditorMode]);

  const lastUpdateLabel = (task?: Task) => {
    if (!task?.history.length) return "暂无更新";
    const latest = task.history[0].date;
    const days = daysSince(latest);
    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    return `${days} 天前`;
  };

  const updateState = (nextState: AppState) => {
    setState(nextState);
    saveState(nextState);
  };

  const handleAcceptSuggestion = () => {
    if (!state) return;
    setAmCompleted(true);
    if (focusTask) {
      updateState({
        ...state,
        focusTaskId: focusTask.id,
        lastAlignAt: formatDate(new Date())
      });
      return;
    }
    if (suggestion) {
      const nextTask: Task = {
        id: `task-${Date.now()}`,
        name: suggestion,
        level: "daily_lever",
        status: "active",
        frictionPoints: [],
        history: [
          {
            date: formatDate(new Date()),
            action: "接受 AI 建议"
          }
        ],
        progress: 0,
        visionMap: "今日焦点由 AI 建议生成。"
      };
      updateState({
        ...state,
        tasks: [nextTask, ...state.tasks],
        focusTaskId: nextTask.id,
        lastAlignAt: formatDate(new Date())
      });
      setSuggestion("");
      return;
    }
    setAddGoalModal({ type: "warn" });
  };

  const handleRotateFocus = () => {
    if (!state || tasksWithMomentum.length === 0) return;
    const currentIndex = tasksWithMomentum.findIndex(
      (task) => task.id === state.focusTaskId
    );
    const nextTask =
      tasksWithMomentum[(currentIndex + 1) % tasksWithMomentum.length];
    updateState({ ...state, focusTaskId: nextTask.id });
  };

  const handleOtherIdeas = () => {
    if (tasksWithMomentum.length > 0) {
      handleRotateFocus();
      return;
    }
    fetchSuggestion(true);
  };

  const handleViewStatus = () => {
    matrixRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleRecordProgress = () => {
    if (!state || !focusTask) return;
    const nextTasks = state.tasks.map((task) =>
      task.id === focusTask.id
        ? {
            ...addTaskHistory(task, "记录今日进展"),
            progress: Math.min((task.progress ?? 0) + 10, 100)
          }
        : task
    );
    const today = formatDate(new Date());
    const executionLog = state.executionLog.map((log) =>
      log.date === today
        ? { ...log, completed: Math.min(log.completed + 1, log.total) }
        : log
    );
    updateState({
      ...state,
      tasks: nextTasks,
      executionLog
    });
  };

  const resetPmFlow = () => {
    setPmStage("ask");
    setPmDetail("");
    setPmOutcome(null);
  };

  const handleStartWork = (task?: Task) => {
    if (!state) return;
    const targetTask = task ?? focusTask;
    if (!targetTask) return;
    const nextTasks = state.tasks.map((item) =>
      item.id === targetTask.id
        ? {
            ...addTaskHistory(item, "开始工作"),
            progress: Math.min((item.progress ?? 0) + 10, 100)
          }
        : item
    );
    updateState({
      ...state,
      tasks: nextTasks,
      focusTaskId: targetTask.id
    });
  };

  const handleGenerateFriction = async () => {
    if (!state?.identity || !selectedTask) return;
    setIsFrictionLoading(true);
    setFrictionError("");
    try {
      const response = await fetch("/api/friction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskName: selectedTask.name,
          target: state.identity.target,
          vision: state.identity.vision,
          antiVision: state.identity.antiVision,
          history: selectedTask.history.map((item) => item.action)
        })
      });
      const data = (await response.json()) as {
        frictionPoints?: string[];
        error?: string;
        details?: { message?: string } | string;
      };
      if (!response.ok || !data.frictionPoints) {
        throw new Error(
          typeof data.details === "string"
            ? data.details
            : data.details?.message || data.error || "friction_failed"
        );
      }
      const nextTasks = state.tasks.map((task) =>
        task.id === selectedTask.id
          ? { ...task, frictionPoints: data.frictionPoints ?? [] }
          : task
      );
      updateState({ ...state, tasks: nextTasks });
      setSelectedTask({
        ...selectedTask,
        frictionPoints: data.frictionPoints ?? []
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "生成失败";
      setFrictionError(message);
    } finally {
      setIsFrictionLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedTask || isFrictionLoading) return;
    if (selectedTask.frictionPoints.length > 0) return;
    if (!state?.identity) return;
    handleGenerateFriction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTask?.id]);

  const handleSendMessage = async () => {
    if (!message.trim() || !state?.identity) return;
    const userMessage = message.trim();
    setMessage("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);
    try {
      const response = await fetch("/api/auditor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          target: state.identity.target,
          vision: state.identity.vision,
          antiVision: state.identity.antiVision,
          constraints: state.identity.constraints,
          focusTask: focusTask?.name
        })
      });
      const data = (await response.json()) as {
        reply?: string;
        error?: string;
        details?: { message?: string } | string;
      };
      if (!response.ok || !data.reply) {
        throw new Error(
          typeof data.details === "string"
            ? data.details
            : data.details?.message || data.error || "auditor_failed"
        );
      }
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply as string }
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "请求失败";
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `暂时无法连接 AI（${errorMessage}）`
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAddGoal = () => {
    if (!state) return;
    if (counts.red >= 2) {
      setAddGoalModal({
        type: "reject",
        reason: "你当前有 2 个任务处于危险状态。"
      });
      return;
    }
    if (executionRate < 0.5) {
      setAddGoalModal({
        type: "reject",
        reason: `你最近 3 天执行率只有 ${Math.round(executionRate * 100)}%。`
      });
      return;
    }
    setAddGoalModal({ type: "warn" });
  };

  const handleCreateGoal = () => {
    if (!state || !newGoalName.trim()) return;
    const nextTask: Task = {
      id: `task-${Date.now()}`,
      name: newGoalName.trim(),
      level: "month_project",
      status: "active",
      frictionPoints: [],
      history: [
        {
          date: formatDate(new Date()),
          action: "创建新目标"
        }
      ],
      progress: 0,
      visionMap: "新目标已加入，请保持核心节奏。"
    };
    updateState({
      ...state,
      tasks: [nextTask, ...state.tasks],
      focusTaskId: nextTask.id
    });
    setNewGoalName("");
    setAddGoalModal({ type: "none" });
  };

  const handleCloseRedTask = () => {
    if (!state) return;
    const redTask = tasksWithMomentum.find((task) => task.momentum === "red");
    if (!redTask) return;
    updateState({
      ...state,
      tasks: state.tasks.map((task) =>
        task.id === redTask.id ? { ...task, status: "paused" } : task
      )
    });
    setAddGoalModal({ type: "none" });
  };

  if (!state || !identity) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-56">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-blue-500">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {identity.target}
            </h1>
          </div>
          <div className="rounded-full bg-teal-500 px-4 py-2 font-semibold text-white shadow-sm">
            Day {identity.dayCount}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border-2 border-teal-500 bg-white p-6 shadow-lg shadow-teal-100">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-teal-600">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
              </svg>
              今日 Non-negotiable
            </div>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              {focusTask?.name ?? "请先添加任务"}
            </h2>
            <div className="mb-4">
              <div className="mb-2 flex justify-between text-sm text-gray-500">
                <span>进度</span>
                <span className="font-medium text-teal-600">
                  {focusTask?.progress ?? 0}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                  style={{ width: `${focusTask?.progress ?? 0}%` }}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="cursor-pointer rounded-xl bg-orange-500 px-5 py-2.5 font-medium text-white shadow-sm transition-all duration-200 hover:bg-orange-600 hover:shadow"
                onClick={() => handleStartWork(focusTask)}
              >
                开始工作
              </button>
              <button
                className="cursor-pointer rounded-xl bg-gray-100 px-5 py-2.5 font-medium text-gray-700 transition-all duration-200 hover:bg-gray-200"
                onClick={() => focusTask && setSelectedTask(focusTask)}
              >
                查看详情
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-amber-600">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Vision
                </div>
                <p className="text-sm leading-relaxed text-gray-700">
                  {identity.vision}
                </p>
              </div>
              <div className="bg-red-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-red-600">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Anti-Vision
                </div>
                <p className="text-sm leading-relaxed text-gray-700">
                  {identity.antiVision}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Constraints
                </div>
                <ul className="space-y-1 text-sm text-gray-600">
                  {identity.constraints.length ? (
                    identity.constraints.map((item) => (
                      <li key={item}>• {item}</li>
                    ))
                  ) : (
                    <li>• 暂无约束</li>
                  )}
                </ul>
              </div>
              <div className="bg-teal-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-teal-600">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  当日 Non-neg
                </div>
                <p className="text-sm text-gray-700">
                  {focusTask?.name ?? "尚未设定"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6" ref={matrixRef}>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            Momentum Matrix
          </h3>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <button
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              onClick={handleAddGoal}
            >
              添加新目标
            </button>
            <span>最近 3 天执行率：{Math.round(executionRate * 100)}%</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tasksWithMomentum.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
                还没有任务。点击“添加新目标”开始建立你的任务矩阵。
              </div>
            ) : (
              tasksWithMomentum.map((task) => (
                <button
                  key={task.id}
                  className={`cursor-pointer rounded-xl border-l-4 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    task.momentum === "green"
                      ? "border-green-500"
                      : task.momentum === "yellow"
                        ? "border-yellow-500"
                        : "border-red-500"
                  }`}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">{task.name}</h4>
                    <span
                      className={`h-3 w-3 rounded-full ${
                        task.momentum === "green"
                          ? "bg-green-500"
                          : task.momentum === "yellow"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    ></span>
                  </div>
                  <p className="mb-2 text-sm text-gray-500">
                    最后更新: {lastUpdateLabel(task)}
                  </p>
                  <p className="text-xs text-gray-400">
                    阻力: {task.frictionPoints.length ? task.frictionPoints.join("、") : "无"}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-medium text-gray-500">
              进度概览
            </h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full bg-green-500"></span>
                <span className="text-2xl font-bold text-gray-900">
                  {counts.green}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full bg-yellow-500"></span>
                <span className="text-2xl font-bold text-gray-900">
                  {counts.yellow}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full bg-red-500"></span>
                <span className="text-2xl font-bold text-gray-900">
                  {counts.red}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 md:col-span-2">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h3 className="mb-1 font-medium text-red-700">偏离警告</h3>
                <p className="text-sm text-red-600">{deviationWarning}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
          <div className="flex items-center gap-2">
            <svg
              className={`h-5 w-5 text-teal-500 transition-transform ${
                auditorOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <button
              className="font-medium text-gray-900"
              onClick={() => setAuditorOpen((prev) => !prev)}
            >
              The Auditor
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500">
              <button
                className={`px-2 py-0.5 ${
                  auditorMode === "am" ? "text-teal-600" : ""
                }`}
                onClick={() => setAuditorOverride("am")}
              >
                AM
              </button>
              <span className="text-gray-300">|</span>
              <button
                className={`px-2 py-0.5 ${
                  auditorMode === "pm" ? "text-teal-600" : ""
                }`}
                onClick={() => setAuditorOverride("pm")}
              >
                PM
              </button>
              <span className="text-gray-300">|</span>
              <button
                className="px-2 py-0.5"
                onClick={() => setAuditorOverride(null)}
              >
                自动
              </button>
            </div>
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
            在线
          </div>
        </div>
        {auditorOpen && (
          <div className="max-h-60 overflow-y-auto bg-gray-50 px-6 py-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-blue-500 shadow-sm">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              {effectiveAuditorMode === "am" ? (
                <>
                  <p className="mb-3 text-gray-700">
                    早上好。作为{" "}
                    <span className="font-medium text-teal-600">
                      {identity.target}
                    </span>
                    ，你今天必须完成的一件事是什么？
                  </p>
                  <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="mb-2 text-sm text-gray-500">
                      基于你的 Vision 和当前任务进度，我建议的 Non-negotiable 是：
                    </p>
                    <p className="text-gray-800">
                      {focusTask?.name ??
                        (suggestion ||
                          (isSuggesting ? "生成中..." : "请选择一个任务"))}
                    </p>
                  </div>
                  {amCompleted ? (
                    <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-700">
                      已设定今日 Non-negotiable。接下来专注执行，或在下方对话中记录进展。
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="cursor-pointer rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-600"
                        onClick={handleAcceptSuggestion}
                      >
                        接受建议
                      </button>
                      <button
                        className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        onClick={handleOtherIdeas}
                        disabled={isSuggesting}
                      >
                        我有其他想法
                      </button>
                      <button
                        className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        onClick={handleViewStatus}
                      >
                        先看看任务状态
                      </button>
                    </div>
                  )}
                  
                </>
              ) : (
                <>
                  <p className="mb-3 text-gray-700">
                    今天结束了。你完成{" "}
                    <span className="font-medium text-teal-600">
                      {focusTask?.name ?? "今日任务"}
                    </span>{" "}
                    了吗？
                  </p>
                  <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="mb-2 text-sm text-gray-500">
                      你的 Vision 是“{identity.vision}”，当前约束：
                      {identity.constraints.length
                        ? identity.constraints.join("、")
                        : "暂无"}。
                    </p>
                    <p className="text-gray-800">
                      我注意到过去 {lastUpdateLabel(focusTask)}，核心任务没有明显突破。作为
                      <span className="font-medium text-teal-600">
                        {identity.target}
                      </span>
                      ，你会允许自己在关键任务上持续停滞吗？
                    </p>
                  </div>
                  {pmStage === "ask" && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="cursor-pointer rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-600"
                        onClick={() => {
                          handleRecordProgress();
                          setPmOutcome("completed");
                          setPmStage("feedback");
                        }}
                      >
                        已完成
                      </button>
                      <button
                        className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        onClick={() => {
                          setPmOutcome("partial");
                          setPmStage("followup");
                        }}
                      >
                        完成了一半
                      </button>
                      <button
                        className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        onClick={() => {
                          setPmOutcome("missed");
                          setPmStage("feedback");
                        }}
                      >
                        未完成
                      </button>
                    </div>
                  )}
                  {pmStage === "followup" && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700">
                        一半意味着什么？具体到哪里了？
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "核心流程已完成，细节未收尾",
                          "完成一半，下一步卡住",
                          "推进有限，关键点没突破"
                        ].map((option) => (
                          <button
                            key={option}
                            className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-50"
                            onClick={() => {
                              setPmDetail(option);
                              setPmOutcome("partial");
                              setPmStage("feedback");
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      <input
                        value={pmDetail}
                        onChange={(event) => setPmDetail(event.target.value)}
                        placeholder="用一句话说明进度"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            setPmOutcome("partial");
                            setPmStage("feedback");
                          }
                        }}
                      />
                    </div>
                  )}
                  {pmStage === "feedback" && (
                    <>
                      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                        <p>
                          作为
                          <span className="font-medium text-teal-600">
                            {identity.target}
                          </span>
                          ，你的 Vision 是“{identity.vision}”。
                          {pmDetail
                            ? `你说“${pmDetail}”。`
                            : "你没有给出具体进度。"}
                        </p>
                        <p className="mt-2 text-gray-800">
                          {pmOutcome === "completed"
                            ? "你完成了今日 Non-negotiable，关键在于持续保持这种兑现能力。"
                            : `过去 ${lastUpdateLabel(
                                focusTask
                              )}，你仍未完成关键推进。你会允许自己继续把高价值决策让位给低摩擦事务吗？`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="cursor-pointer rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-600"
                          onClick={() => {
                            handleRecordProgress();
                            setPmStage("done");
                          }}
                        >
                          记录今日进展
                        </button>
                        <button
                          className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                          onClick={() => {
                            handleRotateFocus();
                            setPmStage("done");
                          }}
                        >
                          调整明日计划
                        </button>
                        <button className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                          我需要聊聊
                        </button>
                      </div>
                    </>
                  )}
                  {pmStage === "done" && (
                    <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-700">
                      已记录今晚审计结果。你可以在下方对话继续交流，或明天再进行审计。
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {chatMessages.length > 0 && (
            <div className="mt-4 space-y-4">
              {chatMessages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`flex gap-3 ${
                    item.role === "user" ? "justify-end" : ""
                  }`}
                >
                  {item.role === "assistant" && (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-blue-500 shadow-sm">
                      <svg
                        className="h-5 w-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl border px-4 py-3 text-sm ${
                      item.role === "user"
                        ? "border-gray-200 bg-white text-gray-700"
                        : "border-teal-100 bg-teal-50 text-teal-800"
                    }`}
                  >
                    {item.content}
                  </div>
                  {item.role === "user" && (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                      我
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {auditorOpen && (
          <div className="border-t border-gray-100 bg-white px-6 py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              placeholder="输入消息..."
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSendMessage();
                }
              }}
            />
            <button
              className="cursor-pointer rounded-xl bg-teal-500 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-600"
              onClick={handleSendMessage}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          {isChatLoading && (
            <div className="mt-2 text-xs text-gray-400">AI 正在回复...</div>
          )}
        </div>
        )}
      </div>

      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="w-full max-w-lg animate-[scaleIn_0.2s_ease-out] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div className="flex items-center gap-3">
                <div
                  className={`h-4 w-4 rounded-full ${
                    selectedTask.momentum === "green"
                      ? "bg-green-500"
                      : selectedTask.momentum === "yellow"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                ></div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedTask.name}
                </h2>
              </div>
              <button
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
                onClick={() => setSelectedTask(null)}
              >
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  势能状态
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full ${
                      selectedTask.momentum === "green"
                        ? "bg-green-500"
                        : selectedTask.momentum === "yellow"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                  ></span>
                  <span className="font-medium text-gray-700">
                    {statusLabel(selectedTask.momentum ?? "yellow")}
                  </span>
                  <span className="text-gray-500">
                    — {lastUpdateLabel(selectedTask)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  上次质变日期
                </div>
                <div>
                  <span className="font-medium text-gray-900">
                    {selectedTask.lastBreakthrough ?? selectedTask.history[0]?.date ?? "暂无"}
                  </span>
                  <span className="ml-2 text-gray-500">
                    — {selectedTask.history[0]?.action ?? "暂无记录"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Friction Points
                </div>
                <ul className="space-y-2">
                  {selectedTask.frictionPoints.length ? (
                    selectedTask.frictionPoints.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-gray-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-400">
                      {isFrictionLoading ? "正在识别阻力点..." : "暂无阻力点"}
                    </li>
                  )}
                </ul>
                
              </div>

              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-teal-600">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                  </svg>
                  与 Vision 映射
                </div>
                <p className="text-sm leading-relaxed text-gray-700">
                  {selectedTask.visionMap ?? "此任务与身份目标高度相关。"}
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-6">
              <button
                className="flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white px-5 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100"
                onClick={() => setSelectedTask(null)}
              >
                关闭
              </button>
              <button
                className="flex-1 cursor-pointer rounded-xl bg-gray-100 px-5 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                onClick={() => {
                  if (!state) return;
                  updateState({ ...state, focusTaskId: selectedTask.id });
                  setSelectedTask(null);
                }}
              >
                设为今日焦点
              </button>
              <button
                className="flex-1 cursor-pointer rounded-xl bg-teal-500 px-5 py-3 font-medium text-white shadow-sm transition-colors hover:bg-teal-600"
                onClick={() => {
                  handleStartWork(selectedTask);
                  setSelectedTask(null);
                }}
              >
                开始工作
              </button>
            </div>
          </div>
        </div>
      )}

      {addGoalModal.type !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[scaleIn_0.2s_ease-out] overflow-hidden rounded-2xl bg-white shadow-2xl">
            {addGoalModal.type === "reject" ? (
              <>
                <div className="border-b border-red-100 bg-red-50 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                      <svg
                        className="h-6 w-6 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-red-700">
                        无法添加新目标
                      </h2>
                      <p className="text-sm text-red-500">
                        Governor Protocol 已触发
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 p-6">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="mb-2 text-sm text-gray-500">原因</div>
                    <p className="text-gray-900">{addGoalModal.reason}</p>
                  </div>
                  {counts.red >= 2 && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <div className="mb-3 text-sm text-gray-500">
                        停滞任务
                      </div>
                      <div className="space-y-2">
                        {tasksWithMomentum
                          .filter((task) => task.momentum === "red")
                          .slice(0, 3)
                          .map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 rounded-lg border border-red-200 bg-white p-3"
                            >
                              <span className="h-3 w-3 rounded-full bg-red-500"></span>
                              <span className="text-gray-700">{task.name}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl border-l-4 border-teal-500 bg-gradient-to-r from-teal-50 to-blue-50 p-5">
                    <div className="flex items-start gap-3">
                      <svg
                        className="mt-0.5 h-6 w-6 flex-shrink-0 text-teal-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                      <div>
                        <p className="italic leading-relaxed text-gray-700">
                          &quot;你得到的不是你追求的，而是你耐受的。如果你耐受现有任务的停滞，新目标只会让情况更糟。&quot;
                        </p>
                        <p className="mt-2 text-sm font-medium text-teal-600">
                          — Dan Koe
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 border-t border-gray-100 bg-gray-50 p-6">
                  <button
                    className="min-w-[140px] flex-1 rounded-xl border border-gray-200 bg-white px-5 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100"
                    onClick={() => {
                      setAddGoalModal({ type: "none" });
                      handleViewStatus();
                    }}
                  >
                    查看停滞任务
                  </button>
                  <button
                    className="min-w-[140px] flex-1 rounded-xl bg-red-500 px-5 py-3 font-medium text-white shadow-sm transition-colors hover:bg-red-600"
                    onClick={handleCloseRedTask}
                  >
                    关闭一个目标
                  </button>
                  <button
                    className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    onClick={() => setAddGoalModal({ type: "none" })}
                  >
                    我理解了
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="border-b border-gray-100 bg-white p-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    允许添加新目标
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    可以添加，但请注意分散精力的风险。
                  </p>
                </div>
                <div className="space-y-4 p-6">
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
                    新目标会分散你的注意力，确保已有任务稳定推进。
                  </div>
                  <input
                    value={newGoalName}
                    onChange={(event) => setNewGoalName(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    placeholder="输入新目标名称"
                  />
                </div>
                <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-6">
                  <button
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100"
                    onClick={() => setAddGoalModal({ type: "none" })}
                  >
                    取消
                  </button>
                  <button
                    className="flex-1 rounded-xl bg-teal-500 px-5 py-3 font-medium text-white shadow-sm transition-colors hover:bg-teal-600"
                    onClick={handleCreateGoal}
                  >
                    确认添加
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Link
        href="/"
        className="fixed left-6 top-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
      >
        ← 返回导航
      </Link>
    </div>
  );
}
