# E2-03 · AI 顾问切云 LLM（Claude Haiku 4.5）

> Epic **E2 云端部署** · 负责人 Frank · 3 SP · Sprint 0 · 批次 B2
> 通用约定与索引见 [实现文档 README](../README.md)。决策 D3 落地。

---

## 1. 整体目标

家里 Ollama 线上不可达 → advisor 后端抽成 provider 可切换的 `streamChat`，线上走 Anthropic API（`claude-haiku-4-5`，$1/1M in · $5/1M out，单次 1-2k in + 500 out ≈ **$0.004**），本地开发保留 Ollama。prompt 组装 / 缓存 / grounding 铁律 / SIMPLE 集**全部不动**。

## 2. 验收标准

- [ ] `LLM_PROVIDER=ollama` 本地行为与现在完全一致。
- [ ] `LLM_PROVIDER=anthropic` 线上：三语各字段初判 + 多轮对话流式正常，数字与事实层一致（grounding 不退化）。
- [ ] Anthropic Console 设了用量告警；断 key 时前端得到可读错误而非挂死。

## 3. 实现步骤

- [ ] **3.1** `npm i @anthropic-ai/sdk`；新建 `cms/src/lib/llm.ts`：
  - `streamChat(messages: {role,content}[], opts: {maxTokens}): Promise<ReadableStream<string>>`；
  - ollama 分支：现 route.ts 的 `/api/chat` fetch + NDJSON 解析搬入；
  - anthropic 分支：`client.messages.stream({ model: 'claude-haiku-4-5', max_tokens, system, messages })`，system 从 messages[0]（role=system）拆出，`text_stream` 包成 ReadableStream。
- [ ] **3.2** [advisor/route.ts](../../../cms/src/app/api/advisor/route.ts) 删直连 Ollama 段，改调 `streamChat`（`numPredict` 值映射到 maxTokens）。
- [ ] **3.3** env：`LLM_PROVIDER` / `ANTHROPIC_API_KEY`；compose cms 服务注入。
- [ ] **3.4** 双 provider 对照验证（同一岗同字段，核数字引用与「未提供不编」行为）。
- [ ] **3.5** Console 用量告警 + 成本记录（预估:全局日上限 1000 次 ≈ $4/天封顶）。

## 4. 涉及目录 / 文件

| 路径 | 角色 | 状态 |
|---|---|---|
| `cms/src/lib/llm.ts`（新） | provider 抽象 | 新建 |
| `cms/src/app/api/advisor/route.ts` | 改调 streamChat（约 L190-210 的 fetch 段） | 改 |
| `cms/.env` / `.env.example` / compose | env | 改 |

## 5. 现有代码

- route.ts 是唯一 LLM 出口（grep `OLLAMA_URL` 确认无第二处）；内存缓存键含 字段+id+语言，云上照用（省钱主力）。
- 注意：Ollama 请求带 `think:false`，Anthropic 侧无对应参数，直接省略即可。

## 6. 完成定义（DoD）

- [ ] §2 全勾 + 双 provider 对照记录 + push。
