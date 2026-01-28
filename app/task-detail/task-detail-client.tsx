"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadState } from "../../lib/storage";
import { evaluateMomentum, statusLabel } from "../../lib/momentum";
import { daysSince } from "../../lib/dates";
import { Task } from "../../lib/types";

export default function TaskDetailClient() {
  const searchParams = useSearchParams();
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    const state = loadState();
    const taskId = searchParams.get("id");
    const nextTask =
      state.tasks.find((item) => item.id === taskId) ?? state.tasks[0];
    if (nextTask) {
      setTask({ ...nextTask, momentum: evaluateMomentum(nextTask) });
    }
  }, [searchParams]);

  const lastUpdateLabel = useMemo(() => {
    if (!task?.history.length) return "暂无更新";
    const latest = task.history[0].date;
    const days = daysSince(latest);
    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    return `${days} 天前`;
  }, [task]);

  if (!task) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
        <div className="w-full max-w-lg animate-[scaleIn_0.2s_ease-out] overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div
                className={`h-4 w-4 rounded-full ${
                  task.momentum === "green"
                    ? "bg-green-500"
                    : task.momentum === "yellow"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              ></div>
              <h2 className="text-xl font-bold text-gray-900">{task.name}</h2>
            </div>
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
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
            </Link>
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
                    task.momentum === "green"
                      ? "bg-green-500"
                      : task.momentum === "yellow"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                ></span>
                <span className="font-medium text-gray-700">
                  {statusLabel(task.momentum ?? "yellow")}
                </span>
                <span className="text-gray-500">— {lastUpdateLabel}</span>
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
                  {task.lastBreakthrough ?? task.history[0]?.date ?? "暂无"}
                </span>
                <span className="ml-2 text-gray-500">
                  — {task.history[0]?.action ?? "暂无记录"}
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
                {task.frictionPoints.length ? (
                  task.frictionPoints.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-gray-700"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-400">暂无阻力点</li>
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
                {task.visionMap ?? "此任务与身份目标高度相关。"}
              </p>
            </div>
          </div>

          <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-6">
            <Link
              href="/dashboard"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-3 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              关闭
            </Link>
            <button className="flex-1 cursor-pointer rounded-xl bg-teal-500 px-5 py-3 font-medium text-white shadow-sm transition-colors hover:bg-teal-600">
              开始工作
            </button>
          </div>
        </div>
      </div>

      <Link
        href="/"
        className="fixed left-6 top-6 z-50 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
      >
        ← 返回导航
      </Link>
    </div>
  );
}
