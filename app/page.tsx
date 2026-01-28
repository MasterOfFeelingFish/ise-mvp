"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadState, loadStateFromServer, saveState } from "../lib/storage";

export default function HomePage() {
  const [hasIdentity, setHasIdentity] = useState(false);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const remote = await loadStateFromServer();
      const nextState = remote ?? loadState();
      if (remote) {
        saveState(remote);
      }
      if (mounted) {
        setHasIdentity(Boolean(nextState.identity));
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-4xl px-6 py-20">
        <div className="mb-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-500 shadow-lg">
            <svg
              className="h-8 w-8 text-white"
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
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            ISE MVP 原型
          </h1>
          <p className="text-xl text-gray-500">
            Identity-Shift Engine 可视化原型
          </p>
          <p className="mt-2 text-sm text-gray-400">
            明快简洁设计 · 直接浏览器预览
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href={hasIdentity ? "/dashboard" : "/onboarding"}
              className="rounded-xl bg-teal-500 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-600"
            >
              {hasIdentity ? "继续进入 Dashboard" : "开始身份锚定"}
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/dashboard"
            className="group block rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg"
          >
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
                <svg
                  className="h-6 w-6 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 transition-colors group-hover:text-teal-600">
                  Dashboard
                </h2>
                <p className="text-sm text-gray-500">
                  指挥中心 · 7 模块布局
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              包含 Identity Header、今日焦点、Momentum Matrix、Auditor
              Console 等核心模块
            </p>
          </Link>

          <Link
            href="/onboarding"
            className="group block rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg"
          >
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                <svg
                  className="h-6 w-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 transition-colors group-hover:text-orange-600">
                  Onboarding
                </h2>
                <p className="text-sm text-gray-500">
                  身份锚定 · 3-5 轮对话
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              选择题式交互，收集 Identity、Vision、Anti-Vision
            </p>
          </Link>

          <Link
            href="/task-detail"
            className="group block rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-purple-300 hover:shadow-lg"
          >
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <svg
                  className="h-6 w-6 text-purple-600"
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
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 transition-colors group-hover:text-purple-600">
                  任务详情
                </h2>
                <p className="text-sm text-gray-500">
                  模态框 · Friction Points
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              势能状态、上次质变日期、阻力点、Vision 映射
            </p>
          </Link>

          <Link
            href="/governor"
            className="group block rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-red-300 hover:shadow-lg"
          >
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
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
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 transition-colors group-hover:text-red-600">
                  Governor 拒绝
                </h2>
                <p className="text-sm text-gray-500">智能贪心管控</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              当红色任务 &gt;= 2 时拒绝新增目标
            </p>
          </Link>
        </div>

        <div className="mt-16 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            设计系统
          </h3>
          <div className="grid gap-6 text-sm md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-gray-500">色彩（明快简洁）</h4>
              <div className="flex gap-2">
                <div
                  className="h-8 w-8 rounded border border-gray-200 bg-white"
                  title="背景"
                />
                <div
                  className="h-8 w-8 rounded bg-gray-50"
                  title="次级背景"
                />
                <div
                  className="h-8 w-8 rounded bg-teal-500"
                  title="主色"
                />
                <div
                  className="h-8 w-8 rounded bg-orange-500"
                  title="CTA"
                />
                <div
                  className="h-8 w-8 rounded bg-green-500"
                  title="进展中"
                />
                <div
                  className="h-8 w-8 rounded bg-yellow-500"
                  title="停滞"
                />
                <div
                  className="h-8 w-8 rounded bg-red-500"
                  title="危险"
                />
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-gray-500">技术栈</h4>
              <p className="text-gray-700">
                Next.js 14 + Tailwind CSS + Lucide Icons + Vercel AI SDK
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-400">
          <p>ISE MVP 可视化原型 · 基于 Dan Koe &quot;1 Day Protocol&quot;</p>
        </div>
      </div>
    </div>
  );
}
