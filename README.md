# 股票催化剂分析仪表盘

本项目是本地运行的免费优先股票催化剂分析仪表盘。第一阶段支持股票搜索、关注列表、监控列表按批次刷新，以及单股票深色分析页。默认可以在没有真实 API key 的情况下使用 fixture 数据生成报告；配置 key 后会优先调用免费数据源并写入 SQLite 缓存。

## 技术栈

- Next.js App Router + TypeScript
- Tailwind CSS v4
- Prisma + SQLite
- Vitest

## 本地启动

```powershell
npm install
Copy-Item .env.example .env
npm run prisma:generate
npm run prisma:push
npm run dev
```

默认打开 `http://localhost:3000`。

## 环境变量

`.env.example` 已列出第一阶段需要的变量：

- `DATABASE_URL`：本地默认 `file:./dev.db`，对应 `prisma/dev.db`。
- `FINNHUB_API_KEY`：必需数据源；缺失时搜索、quote、profile 会回落到 fixture。
- `ALPHA_VANTAGE_API_KEY`：低频日线补充；缺失时使用 fixture 历史数据。
- `OPENFDA_API_KEY`：可选；缺失时仍可按 openFDA 无 key 限额尝试请求。
- `SEC_USER_AGENT`：建议配置成 `项目名 邮箱`，SEC EDGAR 要求声明 User-Agent。
- `LLM_API_KEY`：预留变量，第一阶段默认不启用。

## 已实现范围

- `Dashboard`：股票搜索、加入/移除关注、开启/关闭监控、刷新频率设置、API key 状态和官方限额提示。
- `Stock Report`：黑底三栏信息密集报告，包含行情、催化剂、short squeeze 可用性提示、技术位、Smart Money Interpretation、三类交易情景和教育用途提示。
- `Settings`：本地监控频率、最大实时监控股票数、API key 状态、官方限速摘要。
- 数据层：股票、关注列表、设置、API cache、quote snapshot、催化剂、分析报告、provider limit state schema。
- Provider：Finnhub、Alpha Vantage、SEC EDGAR、openFDA、ClinicalTrials.gov；所有 provider 请求先经过缓存和限速器。
- 监控：默认 30 秒/批次，只轮询 Finnhub quote，不触发新闻、SEC、FDA、ClinicalTrials 或 Alpha Vantage 低频同步。

## 验证

```powershell
npm test
npm run build
```

当前测试覆盖 provider 限速器、缓存 key/TTL、监控分批、刷新风险、行情指标、报告生成，以及监控 quote-only 路径。
