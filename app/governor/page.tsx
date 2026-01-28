"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "../../lib/storage";
import { evaluateMomentum } from "../../lib/momentum";
import { AppState, Task } from "../../lib/types";
import { formatDate } from "../../lib/dates";

type ModalState =
  | { type: "none" }
  | { type: "reject"; reason: string }
  | { type: "warn" };

export default function GovernorPage() {
  const [state, setState] = useState<AppState | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [newTaskName, setNewTaskName] = useState("");

  useEffect(() => {
    setState(loadState());
  }, []);

  const tasks = useMemo(() => state?.tasks ?? [], [state]);
  const tasksWithMomentum = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        momentum: evaluateMomentum(task)
      })),
    [tasks]
  );

  const redTasks = tasksWithMomentum.filter(
    (task) => task.momentum === "red"
  );

  const executionRate = useMemo(() => {
    const logs = state?.executionLog ?? [];
    if (!logs.length) return 1;
    const recent = logs.slice(-3);
    const total = recent.reduce((sum, log) => sum + log.total, 0);
    const completed = recent.reduce((sum, log) => sum + log.completed, 0);
    if (!total) return 1;
    return completed / total;
  }, [state]);

  const updateState = (nextState: AppState) => {
    setState(nextState);
    saveState(nextState);
  };

  const handleAddGoal = () => {
    if (!state) return;
    if (redTasks.length >= 2) {
      setModal({ type: "reject", reason: "你当前有 2 个任务处于危险状态。" });
      return;
    }
    if (executionRate < 0.5) {
      setModal({
        type: "reject",
        reason: `你最近 3 天执行率只有 ${Math.round(executionRate * 100)}%。`
      });
      return;
    }
    setModal({ type: "warn" });
  };

  const handleCreateTask = () => {
    if (!state || !newTaskName.trim()) return;
    const nextTask: Task = {
      id: `task-${Date.now()}`,
      name: newTaskName.trim(),
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
    setNewTaskName("");
    setModal({ type: "none" });
  };

  const handleSimulateLowRate = () => {
    if (!state) return;
    updateState({
      ...state,
      executionLog: [
        { date: formatDate(new Date(Date.now() - 2 * 24 * 3600 * 1000)), completed: 0, total: 4 },
        { date: formatDate(new Date(Date.now() - 1 * 24 * 3600 * 1000)), completed: 1, total: 4 },
        { date: formatDate(new Date()), completed: 0, total: 4 }
      ]
    });
  };

  if (!state) return null;

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Governor Protocol</h1>
          <p className="mt-2 text-sm text-gray-500">
            红色任务 ≥ 2 或执行率 &lt; 50% 时拒绝新增目标。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-600"
              onClick={handleAddGoal}
            >
              添加新目标
            </button>
            <button
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              onClick={handleSimulateLowRate}
            >
              模拟低执行率
            </button>
            <div className="text-sm text-gray-400">
              最近 3 天执行率：{Math.round(executionRate * 100)}%
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">当前任务</h2>
          <div className="mt-4 space-y-3">
            {tasksWithMomentum.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <span
                  className={`h-3 w-3 rounded-full ${
                    task.momentum === "green"
                      ? "bg-green-500"
                      : task.momentum === "yellow"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                ></span>
                <span className="text-gray-800">{task.name}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {task.momentum === "red" ? "危险" : task.momentum === "yellow" ? "停滞" : "进展中"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal.type !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[scaleIn_0.2s_ease-out] overflow-hidden rounded-2xl bg-white shadow-2xl">
            {modal.type === "reject" ? (
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
                    <p className="text-gray-900">{modal.reason}</p>
                  </div>

                  {redTasks.length >= 2 && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <div className="mb-3 text-sm text-gray-500">停滞任务</div>
                      <div className="space-y-2">
                        {redTasks.slice(0, 3).map((task) => (
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
                  <button className="min-w-[140px] flex-1 rounded-xl border border-gray-200 bg-white px-5 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100">
                    查看停滞任务
                  </button>
                  <button className="min-w-[140px] flex-1 rounded-xl bg-red-500 px-5 py-3 font-medium text-white shadow-sm transition-colors hover:bg-red-600">
                    关闭一个目标
                  </button>
                  <button
                    className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    onClick={() => setModal({ type: "none" })}
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
                    value={newTaskName}
                    onChange={(event) => setNewTaskName(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    placeholder="输入新目标名称"
                  />
                </div>
                <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-6">
                  <button
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100"
                    onClick={() => setModal({ type: "none" })}
                  >
                    取消
                  </button>
                  <button
                    className="flex-1 rounded-xl bg-teal-500 px-5 py-3 font-medium text-white shadow-sm transition-colors hover:bg-teal-600"
                    onClick={handleCreateTask}
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
        className="fixed left-6 top-6 z-50 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
      >
        ← 返回导航
      </Link>
    </div>
  );
}
