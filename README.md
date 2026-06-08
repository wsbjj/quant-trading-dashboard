# 股票催化剂分析仪表盘

本项目是本地运行的免费优先股票催化剂分析仪表盘。第一阶段支持股票搜索、关注列表、监控列表按批次刷新，以及单股票深色分析页。默认可以在没有真实 API key 的情况下使用 fixture 数据生成报告；配置 key 后会优先调用免费数据源并写入 SQLite 缓存。

## 技术栈

- Next.js App Router + TypeScript
- Tailwind CSS v4
- Prisma + SQLite
- lightweight-charts
- Vitest

## 本地启动

```powershell
npm install
Copy-Item .env.example .env
npm run prisma:generate
npm run prisma:push
npm run dev
```

默认打开 `http://localhost:3000`；如需改端口，修改 `.env` 里的 `PORT`。

## 环境变量

`.env.example` 已列出第一阶段需要的变量：

- `DATABASE_URL`：本地默认 `file:./dev.db`，对应 `prisma/dev.db`。
- `PORT`：本地服务端口，默认 `3000`；修改后通过 `npm run dev` / `npm run start` 生效。
- `FINNHUB_API_KEY`：必需数据源；缺失时搜索、quote、profile 会回落到 fixture。
- `ALPHA_VANTAGE_API_KEY`：低频日线补充；缺失时使用 fixture 历史数据。
- `OPENFDA_API_KEY`：可选；缺失时仍可按 openFDA 无 key 限额尝试请求。
- `SEC_USER_AGENT`：建议配置成 `项目名 邮箱`，SEC EDGAR 要求声明 User-Agent。
- `LLM_API_KEY`：OpenAI-compatible LLM API key；缺失时不会调用 LLM。
- `LLM_BASE_URL`：OpenAI-compatible base URL，例如 `https://api.openai.com/v1` 或其他兼容网关。
- `LLM_MODEL`：LLM 模型名；`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL` 三者都配置后才允许手动分析。
- `INGEST_CRON_SECRET`：定时采集 API 的 Bearer secret；不配置时 `/api/ingest/run` 不允许写入采集。

## 已实现范围

- `Dashboard`：股票搜索、加入/移除关注、开启/关闭监控、刷新频率设置、API key 状态和官方限额提示。
- `Stock Report`：黑底三栏信息密集报告，包含行情、催化剂、short squeeze 可用性提示、技术位、Smart Money Interpretation、三类交易情景和教育用途提示。
- `Settings`：本地监控频率、最大实时监控股票数、API key 状态、官方限速摘要、数据采集状态。
- `Historical Data`：`/data` 展示采集数据仓库总览，`/data/[symbol]` 展示单票日线 K 线、盘中快照、事件和 LLM 分析记录。
- 数据层：股票、关注列表、设置、API cache、quote snapshot、intraday snapshot、daily bar、采集任务、催化剂、分析报告、LLM 分析记录、provider limit state schema。
- Provider：Finnhub、Alpha Vantage、SEC EDGAR、openFDA、ClinicalTrials.gov；所有 provider 请求先经过缓存和限速器。
- 监控：默认 30 秒/批次，只轮询 Finnhub quote，不触发新闻、SEC、FDA、ClinicalTrials 或 Alpha Vantage 低频同步。
- 采集：提供外部 API Cron 可调用的 `/api/ingest/run`，只采集监控列表股票，长期积累日线、盘中快照和事件数据。

## 历史数据与 LLM 分析

只读数据 API：

```powershell
curl http://localhost:3000/api/data/overview
curl http://localhost:3000/api/data/AAPL
```

手动 LLM 分析 API：

```powershell
curl -X POST http://localhost:3000/api/data/AAPL/llm-analysis
```

- `/data` 只展示已经采集进 SQLite 的数据，不主动请求外部行情。
- `/data/[symbol]` 使用 `lightweight-charts` 展示最近 100 条 `DailyBar` K 线和成交量，并展示最近 200 条 `IntradaySnapshot`、最近 50 条 `CatalystRecord`。
- LLM 分析读取同一窗口内的数据，调用 OpenAI-compatible `/chat/completions`，输出中文交易计划草案并保存到 `LlmAnalysisRecord`。
- LLM 分析当前不单独鉴权；部署到公网前需要先加整站登录认证。
- LLM 输出仅用于教育用途和情景推演，不构成投资建议。

## 免费数据采集

写入型采集 API：

```powershell
curl -X POST http://localhost:3000/api/ingest/run `
  -H "Authorization: Bearer $env:INGEST_CRON_SECRET" `
  -H "Content-Type: application/json" `
  -d '{ "jobType": "intraday" }'
```

Unix cron 示例：

```bash
APP_URL="https://your-app.example.com"
curl -fsS -X POST "$APP_URL/api/ingest/run" \
  -H "Authorization: Bearer $INGEST_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"jobType":"intraday"}'
```

请求 body：

- `jobType`：`intraday`、`daily`、`events`。
- `limit`：可选。`intraday` 最多 50，`daily` 最多 25，`events` 最多 25。
- `force`：预留给外部 cron/手动触发标记，第一版不改变免费额度保护逻辑。

只读状态 API：

```powershell
curl http://localhost:3000/api/ingest/status
```

推荐调用节奏：

- 盘中快照：每 60 秒调用 `{"jobType":"intraday"}`。写入 `IntradaySnapshot`，并继续写入兼容现有功能的 `QuoteSnapshot`。
- 日线历史：美股收盘后调用 `{"jobType":"daily"}`。默认每次最多 25 只监控股票，Alpha Vantage compact 日线最多保存最近 100 个交易日；股票池超过 25 只时用本地 cursor 轮换。
- 事件催化剂：每 6-24 小时调用 `{"jobType":"events"}`。同步 SEC、FDA、ClinicalTrials、Finnhub news/filings，并 upsert 到 `CatalystRecord`。

```cron
* * * * 1-5 curl -fsS -X POST "$APP_URL/api/ingest/run" -H "Authorization: Bearer $INGEST_CRON_SECRET" -H "Content-Type: application/json" -d '{"jobType":"intraday"}'
30 21 * * 1-5 curl -fsS -X POST "$APP_URL/api/ingest/run" -H "Authorization: Bearer $INGEST_CRON_SECRET" -H "Content-Type: application/json" -d '{"jobType":"daily"}'
0 */6 * * * curl -fsS -X POST "$APP_URL/api/ingest/run" -H "Authorization: Bearer $INGEST_CRON_SECRET" -H "Content-Type: application/json" -d '{"jobType":"events"}'
```

上面的 cron 时间按服务器时区解释；部署到云平台后请按实际时区换算美股收盘后时间。

免费额度按保守默认设计：Finnhub 项目默认按 60 calls/minute 规划，Alpha Vantage 免费按 25 requests/day 规划，SEC EDGAR 按 10 requests/second 以内访问，openFDA 无 key 按 240/min + 1000/day、有 key 按 240/min + 120000/day。实际配额可能随账号和官方政策变化，长期量化建议从小股票池开始，优先积累日线 + 报价快照 + 事件数据。

## 验证

```powershell
npm test
npm run lint
npm run build
```

当前测试覆盖 provider 限速器、缓存 key/TTL、监控分批、刷新风险、行情指标、报告生成、监控 quote-only 路径、Alpha Vantage 日线解析、采集任务记录、cursor 轮换、upsert 行为、采集 API 鉴权、历史数据 API、LLM 分析成功/失败记录和 LLM 面板交互。
