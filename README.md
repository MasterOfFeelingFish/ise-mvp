# ISE MVP - Identity-Shift Engine

> AI 驱动的身份重建引擎

## 开发任务

👉 **[查看 Issue #1](../../issues/1)** — 完整任务描述和验收标准

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/justDance-everybody/ise-mvp.git
cd ise-mvp

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 API Key

# 4. 启动开发
npm run dev
```

## 文档

| 文档 | 说明 |
|------|------|
| [产品需求 (PRD)](./docs/PRD.md) | 功能定义、数据结构 |
| [验收标准](./docs/ACCEPTANCE.md) | 13 项验收点 |
| [UI 原型](./prototype/index.html) | 浏览器打开预览 |

## 技术栈

Next.js 14 + Tailwind CSS + Vercel AI SDK + Vercel KV

## 提交代码

1. Fork → 开发 → 测试
2. 创建 Pull Request
3. 按验收标准检查
