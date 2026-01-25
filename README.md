# ISE MVP - Identity-Shift Engine

> AI 驱动的身份重建引擎，帮助用户专注于真正重要的事

## 快速开始

### 1. 了解项目

| 文档 | 说明 |
|------|------|
| [产品需求文档 (PRD)](./docs/PRD.md) | 功能定义、技术栈、数据结构 |
| [验收标准](./docs/ACCEPTANCE.md) | 13 项验收点，含测试步骤 |
| [UI 原型](./prototype/index.html) | 浏览器打开即可预览 |

### 2. 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **图标**: Lucide Icons
- **AI**: Vercel AI SDK (Claude / GPT-4)
- **存储**: Vercel KV + localStorage (降级)
- **部署**: Vercel

### 3. 开发流程

```bash
# 1. Fork 本仓库

# 2. 克隆到本地
git clone https://github.com/YOUR_USERNAME/ise-mvp.git
cd ise-mvp

# 3. 安装依赖
npm install

# 4. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 API Key

# 5. 启动开发
npm run dev
```

### 4. 提交代码

1. 创建功能分支：`git checkout -b feature/xxx`
2. 开发并测试
3. 提交：`git commit -m "feat: 具体功能"`
4. 推送：`git push origin feature/xxx`
5. 创建 Pull Request

---

## 项目结构 (建议)

```
ise-mvp/
├── docs/                    # 文档
│   ├── PRD.md               # 产品需求
│   └── ACCEPTANCE.md        # 验收标准
├── prototype/               # UI 原型 (仅供参考)
│   ├── index.html
│   ├── dashboard.html
│   ├── onboarding.html
│   ├── task-detail.html
│   └── governor.html
├── src/                     # 源代码 (待开发)
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── styles/
├── .env.example             # 环境变量模板
├── package.json
└── README.md
```

---

## 核心功能 (MVP)

1. **Onboarding 身份锚定** — 3-5 轮选择题，收集 Identity/Vision/Anti-Vision
2. **Dashboard 指挥中心** — 7 模块布局，势能可视化
3. **AM 对话** — 早间生成 Non-negotiable
4. **PM 审计** — 晚间围绕 Vision 反馈
5. **Governor 贪心管控** — 红色任务 ≥2 时拒绝新增
6. **数据持久化** — Vercel KV + localStorage

---

## 验收标准

详见 [ACCEPTANCE.md](./docs/ACCEPTANCE.md)，共 **13 项验收点**：

- [ ] AC-01 Onboarding 可走通
- [ ] AC-02 Dashboard 7 模块显示
- [ ] AC-03 势能状态正确判定
- [ ] AC-04 AM 对话生成今日焦点
- [ ] AC-05 PM 审计有锚点
- [ ] AC-06 Governor 拒绝逻辑
- [ ] AC-07 任务详情模态框
- [ ] AC-08 数据持久化
- [ ] AC-09 Vercel 部署成功
- [ ] AC-10 环境变量安全
- [ ] AC-11 HTTPS 强制启用
- [ ] AC-12 性能指标达标
- [ ] AC-13 版本回滚能力

**全部通过 = 项目交付成功**

---

## 联系方式

有问题请在 Issue 中提问。
