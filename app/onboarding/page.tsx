"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  antiVisionPresets,
  constraintOptions,
  identityPresets
} from "../../lib/defaults";
import { loadState, loadStateFromServer, saveState } from "../../lib/storage";
import { formatDate } from "../../lib/dates";

const identityOptions = [
  {
    label: "创业者/CEO",
    description: "建立自己的事业",
    accent: "orange"
  },
  {
    label: "技术专家",
    description: "精通某个技术领域",
    accent: "teal"
  },
  {
    label: "创作者",
    description: "内容/艺术创作",
    accent: "purple"
  },
  {
    label: "投资人",
    description: "财务自由",
    accent: "green"
  },
  {
    label: "健康达人",
    description: "身心健康",
    accent: "red"
  },
  {
    label: "自定义",
    description: "其他身份",
    accent: "gray"
  }
];

const challengeOptions = [
  "技术深度不够",
  "缺乏系统性学习",
  "工作占用太多时间",
  "精力分散",
  "其他"
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState("");
  const [customTarget, setCustomTarget] = useState("");
  const [challenge, setChallenge] = useState("");
  const [vision, setVision] = useState("");
  const [antiVision, setAntiVision] = useState("");
  const [constraints, setConstraints] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [lastGeneratedKey, setLastGeneratedKey] = useState("");

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const remote = await loadStateFromServer();
      const nextState = remote ?? loadState();
      if (remote) {
        saveState(remote);
      }
      if (mounted && nextState.identity) {
        router.replace("/dashboard");
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [router]);

  const fallbackVision = () => {
    const resolvedTarget = target === "自定义" ? customTarget || "自定义身份" : target;
    const preset = identityPresets[resolvedTarget];
    return (
      preset ??
      `成为更接近 ${resolvedTarget} 的人，并形成稳定的长期成长路径。`
    );
  };

  const fallbackAntiVision = () => {
    return antiVisionPresets[challenge] ?? antiVisionPresets["其他"];
  };

  useEffect(() => {
    if (!target) return;
    setVision(fallbackVision());
    if (challenge) {
      setAntiVision(fallbackAntiVision());
    }
  }, [target, customTarget]);

  useEffect(() => {
    if (step !== 2 || !target || !challenge) return;
    const key = `${target}|${customTarget}|${challenge}`;
    if (key === lastGeneratedKey) return;
    setLastGeneratedKey(key);
    const run = async () => {
      setIsGenerating(true);
      setGenerationError("");
      try {
        const response = await fetch("/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target,
            customTarget,
            challenge
          })
        });
        const data = (await response.json()) as {
          vision?: string;
          antiVision?: string;
          error?: string;
          details?: { message?: string; stack?: string } | string;
        };
        if (!response.ok) {
          const detailText =
            typeof data.details === "string"
              ? data.details
              : data.details?.message;
          throw new Error(detailText || data.error || "vision_failed");
        }
        if (data.vision && data.antiVision) {
          setVision(data.vision);
          setAntiVision(data.antiVision);
          return;
        }
        throw new Error("vision_empty");
      } catch (error) {
        setVision(fallbackVision());
        setAntiVision(fallbackAntiVision());
        const message =
          error instanceof Error ? error.message : "未能连接模型";
        setGenerationError(`未能连接模型，已使用默认模板生成。${message}`);
      } finally {
        setIsGenerating(false);
      }
    };
    run();
  }, [step, target, customTarget, challenge, lastGeneratedKey]);

  const progressLabel = useMemo(() => {
    const total = 4;
    return `${Math.min(step + 1, total)} / ${total}`;
  }, [step]);

  const canContinue = useMemo(() => {
    if (step === 0) return target.length > 0;
    if (step === 1) return challenge.length > 0;
    if (step === 2) return vision.length > 0 && !isGenerating;
    return true;
  }, [challenge.length, step, target.length, vision.length, isGenerating]);

  const handleComplete = () => {
    const nextState = loadState();
    const resolvedTarget = target === "自定义" ? customTarget || "自定义身份" : target;

    nextState.identity = {
      target: resolvedTarget,
      vision,
      antiVision: antiVision || fallbackAntiVision(),
      constraints,
      createdAt: formatDate(new Date()),
      dayCount: 1
    };
    saveState(nextState);
    router.push("/dashboard");
  };

  const handleContinue = () => {
    if (step === 3) {
      handleComplete();
      return;
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="mb-12 text-center">
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
          <h1 className="text-3xl font-bold text-gray-900">ISE</h1>
          <p className="mt-2 text-gray-500">Identity-Shift Engine</p>
        </div>

        <div className="w-full max-w-2xl">
          {step === 0 && (
            <>
              <div className="mb-8 flex gap-4">
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
                  <p className="text-lg leading-relaxed text-gray-600">
                    欢迎来到 ISE。我想了解你想成为什么样的人。
                  </p>
                  <p className="mt-3 text-lg font-medium text-gray-900">
                    下面哪个最接近你的目标身份？
                  </p>
                </div>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {identityOptions.map((option) => {
                  const selected = target === option.label;
                  return (
                    <button
                      key={option.label}
                      className={`group cursor-pointer rounded-xl border-2 p-5 text-left shadow-sm transition-all duration-200 ${
                        selected
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 bg-white hover:scale-[1.02] hover:border-teal-400 hover:bg-gray-50 hover:shadow"
                      }`}
                      onClick={() => setTarget(option.label)}
                    >
                      <div
                        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
                          option.accent === "orange"
                            ? "bg-orange-100"
                            : option.accent === "teal"
                              ? "bg-teal-100"
                              : option.accent === "purple"
                                ? "bg-purple-100"
                                : option.accent === "green"
                                  ? "bg-green-100"
                                  : option.accent === "red"
                                    ? "bg-red-100"
                                    : "bg-gray-100"
                        }`}
                      >
                        <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                      </div>
                      <div
                        className={`font-semibold transition-colors ${
                          selected ? "text-teal-700" : "text-gray-900"
                        }`}
                      >
                        {option.label}
                      </div>
                      <div
                        className={`mt-1 text-sm ${
                          selected ? "text-teal-600" : "text-gray-500"
                        }`}
                      >
                        {option.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              {target === "自定义" && (
                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                  <label className="text-sm font-medium text-gray-600">
                    请输入你的目标身份
                  </label>
                  <input
                    value={customTarget}
                    onChange={(event) => setCustomTarget(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    placeholder="例如：独立产品设计师"
                  />
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <div className="mb-6 text-left">
                <p className="text-lg text-gray-600">很好。</p>
                <p className="mt-2 text-lg font-medium text-gray-900">
                  这个身份最常见的挑战是什么？
                </p>
              </div>
              <div className="mb-8 grid gap-3">
                {challengeOptions.map((option) => (
                  <button
                    key={option}
                    className={`rounded-xl border px-4 py-3 text-left text-gray-700 transition-colors ${
                      challenge === option
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white hover:border-teal-300 hover:bg-gray-50"
                    }`}
                    onClick={() => setChallenge(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="text-sm text-gray-400">
                AI 将基于选择自动推断 Anti-Vision
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-6">
                <p className="text-lg text-gray-600">
                  我为你生成了初版 Vision。
                </p>
                <p className="mt-2 text-lg font-medium text-gray-900">
                  这是否符合你的方向？
                </p>
              </div>
              {isGenerating && (
                <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-xs text-teal-700">
                  正在生成 Vision 与 Anti-Vision...
                </div>
              )}
              {generationError && (
                <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                  {generationError}
                </div>
              )}
              {antiVision && (
                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  推断的 Anti-Vision：{antiVision}
                </div>
              )}
              <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
                <textarea
                  value={vision}
                  onChange={(event) => setVision(event.target.value)}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-gray-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  rows={4}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="mb-6">
                <p className="text-lg text-gray-600">
                  最后，设定一些约束来保护你的节奏。
                </p>
                <p className="mt-2 text-lg font-medium text-gray-900">
                  你想坚持哪些规则？
                </p>
              </div>
              <div className="mb-6 grid gap-3">
                {constraintOptions.map((option) => {
                  const checked = constraints.includes(option);
                  return (
                    <button
                      key={option}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-gray-700 transition-colors ${
                        checked
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-gray-200 bg-white hover:border-teal-300 hover:bg-gray-50"
                      }`}
                      onClick={() =>
                        setConstraints((prev) =>
                          checked
                            ? prev.filter((item) => item !== option)
                            : [...prev, option]
                        )
                      }
                    >
                      <span>{option}</span>
                      {checked && (
                        <span className="text-xs font-medium text-teal-600">
                          已选择
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                className="text-sm text-gray-400 underline-offset-4 hover:text-gray-600"
                onClick={() => {
                  setConstraints([]);
                  handleComplete();
                }}
              >
                跳过约束，直接进入 Dashboard
              </button>
            </>
          )}

          <div className="mt-8 flex justify-end">
            <button
              className={`flex items-center gap-2 rounded-xl px-6 py-3 font-medium shadow-sm transition-all duration-200 ${
                canContinue
                  ? "bg-teal-500 text-white hover:bg-teal-600 hover:shadow"
                  : "cursor-not-allowed bg-gray-200 text-gray-500"
              }`}
              onClick={handleContinue}
              disabled={!canContinue}
            >
              {step === 2 && isGenerating ? "生成中" : step === 3 ? "完成" : "继续"}
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
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-2">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-3 w-3 rounded-full ${
                step === index ? "bg-teal-500" : "bg-gray-300"
              }`}
            ></div>
          ))}
          <span className="ml-2 text-sm text-gray-400">{progressLabel}</span>
        </div>
      </div>

      <Link
        href="/"
        className="fixed left-6 top-6 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
      >
        ← 返回导航
      </Link>
    </div>
  );
}
