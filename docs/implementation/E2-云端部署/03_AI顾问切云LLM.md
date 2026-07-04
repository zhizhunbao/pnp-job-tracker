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

- [x] **3.1** `@anthropic-ai/sdk` 已装；`cms/src/lib/llm.ts`：`streamChat()` 统一输出文本增量字节流；ollama NDJSON 解析搬入；anthropic 走 `messages.stream`（system 从消息里拆到顶层参数，`on('text')` 包 ReadableStream，`LlmError` 传友好错误）。
- [x] **3.2** route.ts 改调 streamChat；缓存累积改为 `pipeThrough(TransformStream)`（flush 时写缓存）。
- [x] **3.3** env 键就位（.env.example 已列；**Render 侧待用户加 `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`**）。
- [x] **3.4** 双分支实测 ✅：ollama（200 流式 + X-Cache:hit）；anthropic/Haiku（200,6s,421 字中文,【标题】结构对,数字全部精确引用事实,主动声明缺失信息不编——grounding 优于 qwen3:4b）。注:420 token 上限致结尾轻微截断,后续可微调 numPredict。
- [x] **3.5** 成本实测 ≈ $0.003/次(符合预估);**账户不开 auto-reload = 余额即硬上限**($5.48≈1300 次),比告警更稳。待办:Render 加 2 env(用户粘 render-env2.txt)后生产复测。

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
