# 15 · `lib/chat`:手写编排退役,改走 pi 工具循环

> 2026-08-19。Frank 拍板:「chat 这个代码这么多怎么乱,不如删了重写。先优先走我的 pi agent。」
> 范围两问已答:**换编排,留事实层与出口校验**;**出口校验 guardAnswer 照旧过**。
> 前置:同日的 [14 号](14_lib-llm域重构.md)(`lib/error` / `lib/log` 收拢,`ChatError` 已搬完)。

---

## 0 · 一句话范围

删掉 `orchestrate` + `slots` + `answer` + `federal` + `cards` + `followups` 这 **1970 行手写编排**
(「问的是什么题 → 该打哪几个工具 → 拿什么反问 → 追问出什么」全是 if/正则堆出来的),
换成 pi 的工具循环由模型自己决定打哪几把工具;
`tools.ts`(数字与判定的唯一来源)、`guards.ts` + `traces.ts`(出口校验)、`facts.ts`(结果 → Fact 渲染)
**一行不动**,前者变成 pi 工具的实现体,后者仍然是出口那道门。

| | 行数 | 去向 |
|---|---|---|
| `tools.ts` | 1141 | **留** —— 10 个 lookup 原样,外面套一层 pi 工具壳 |
| `facts.ts` | 653 | **留** —— lookup 结果 → `Fact`(四态、证据 URL、三语标签) |
| `guards.ts` + `traces.ts` | 693 | **留** —— 出口校验,pi 的答复照样过 |
| `stream.ts` `wording.ts` `types.ts` `log.ts` `normalize.ts` `steps.ts` `reportFacts.ts` | 665 | **留** |
| `orchestrate.ts` | 418 | **重写** —— 三步流水线 → pi 循环 + 出口那道门 |
| `slots.ts` `answer.ts` `federal.ts` `cards.ts` `followups.ts` | 1552 | **删/搬**(见 §3 与 §3.1:`answer.ts` 的 370 行规则体是搬进 `prompts.ts`) |

净:5073 → 约 3900 行(§3.1 订正:`answer.ts` 的规则体是搬不是删)。

---

## 1 · 账:实测翻盘,**不花钱**

> 🔴 2026-08-19 本文写到一半推翻重写。原稿按「pi 锁死 anthropic」估了 $13/月,**那个前提是错的**。

两处判断都过期了,逐条实测:

**① `pi-ai` 不锁 anthropic。** 它 `dist/api/` 下自带 `openai-completions`、`google-generative-ai`、
`mistral-conversations`、`bedrock-converse-stream`、`openai-responses` 等一排适配器。
`lib/agent` 走 `anthropic-messages` 是当初的**选择**,不是约束。

**② 朋友的网关现在透传 tools。** 14 号 §1 写的「朋友的网关不透传 tools(实测)」**已经作废** ——
那次多半测的是旧链 `/api/chat`。对 `/v1/chat/completions` 实测(2026-08-19,`X-No-Cache: 1`):

```
status 200 · finish_reason: "tool_calls"
tool_calls[0].function = { name: "get_weather", arguments: {"city":"Ottawa"} }
```

再验真正要紧的**多轮回灌**,三把工具、四轮循环,一次没掉链子:

| 轮 | 模型自己决定的动作 |
|---|---|
| 1 | `search_occupations({query:"carpenter"})` |
| 2 | `lookup_jobs({noc:"72310"})` ← 从上一轮工具结果里接住了 NOC |
| 3 | `lookup_coverage({noc:"72310"})` |
| 4 | `finish_reason: "stop"`,出终答,BC 229 / ON 121 / MB 3 全部溯得回工具结果,没编数字 |

它还遵守了 system prompt 里「先定 NOC 再查别的」那条顺序。

**所以 pi 循环挂在朋友的 qwen3.6 上,零成本。** 适配器换成
`@earendil-works/pi-ai/api/openai-completions`,`baseUrl` = `GATEWAY_BASE + '/v1'`,钥匙沿用
`GATEWAY_KEY` —— 那对 env(`TRANSLATE_API_BASE` / `_KEY`)聊天与翻译两条链本来就共用。

⚠️ 但**终答的质量问题一个都没少**:上面那一发终答用了 `**加粗**` 与 `*` 项目符号,当场撞 RULE 5
(前端 `ChatText` 只认空行分段与行首 `- `,加粗会原样见客)。这反过来印证 §3.1 ——
换的是「打哪几把工具」,**不是「怎么写这段话」**,那套规则与出口校验一条都不能省。

还没验的三样,B 批开工前各花十分钟:**流式**(`tools` + `stream:true` 的 delta 形状)、
**并行工具调用**(一轮回多个 `tool_calls`)、**上下文上限**(`FRIEND_INPUT_MAX=20000` 字符对
10+ 把工具的循环够不够 —— 这条最可能成为真约束,anthropic 那条 200k 路留作退路)。

### 1.1 两台后端都实测过了,三个未验项全部清掉(2026-08-19)

🔴 **先纠正一个我一直搞错的前提(Frank 2026-08-19 点破):局域网那台和「朋友的 ngrok」是同一台机器。**
不是两个后端,是**同一台盒子的两个门** —— 直连裸 Ollama,或者经一层 FastAPI 包装再经 ngrok 出去。
坐实的证据:`/v1/models` 局域网列出全部 6 个模型(裸 Ollama),ngrok 只列 `qwen3.6` 一个(包装层收了口)。

| | 直连 `192.168.1.150:11434` | 经包装 + ngrok |
|---|---|---|
| 是什么 | 裸 Ollama 的 `/v1` | FastAPI 包装 → 同一个 Ollama |
| 谁够得着 | **本机 dev / ETL / 评测批** | **生产(Render)只能走这条**(云上打不到局域网) |
| 鉴权 | 无 | Bearer |
| 输入上限 | 模型的 262144 token | **20000 字符** ← **包装层加的,不是模型的** |
| 最小请求(1 token 输出)×3 | 0.22 / 0.23 s | 1.75 / 2.07 / 1.93 s |
| 同一套四工具循环 | **4.6 s** | 13.9 s |

**这两条差距的来源就一样东西:每次调用约 1.7 秒的隧道 + 包装开销。** 模型一样快
(4.6 + 3 轮 × 1.7 ≈ 13.9,对得上)。所以:

- **多轮工具循环在生产上会被这 1.7 秒乘以轮数** —— 三轮就是 5 秒纯开销,四轮 7 秒。
  这是产品级的事(用户等的是这个),不是技术洁癖。
- **那 20000 字符是包装层里的一个数**,模型有 262k。以前它是「上游的硬约束」,现在**那台机器归 Frank 管**,
  是改配置的事,不是设计约束。

📌 **两件该在那台机器上做的**(不属本批,做之前报一声):① 把输入上限从 20000 字符放开到贴近模型的
262k;② 想办法压掉那 1.7 秒(ngrok 免费隧道的排队是大头,换个隧道或直接开端口都比在代码里优化管用)。

同一份 prompt、同一套四把工具、同一个问题,实跑对照:

| 后端 | `reasoning_effort` | 耗时 | 轮数 | 工具调用 |
|---|---|---|---|---|
| 局域网 | `"none"` | **4.6 s** | 3 | 第二轮**一次并发三把** |
| 局域网 | 默认(思考开) | 11.4 s | 4 | 拆成两轮,反而多绕一圈 |
| ngrok | `"none"` | 13.9 s | 3 | 一次并发三把 |
| ngrok | 默认 | 12.7 s | 3 | 一次并发四把 |

**① 流式 ✅** —— 思考链走 `delta.reasoning`,正文走 `delta.content`。
⚠️ 思考期间 `content` 是**空串**不是缺字段,按真值判会漏计(第一次探针就栽在这儿)。
`onDelta` 的逐句门只喂 `content`,`reasoning` 一个字都不许见客。

**② 并行工具调用 ✅** —— 一轮回多个 `tool_calls`,两台都支持。
收件箱攒 `Fact[]` 时要按 `toolCallId` 收,别假设一轮一把。

**③ 关掉思考:快 2.5 倍,而且更听话。** `reasoning_effort: "none"`(标准 OpenAI 参数,pi 的 `Model`
描述符里正好有 `reasoning` 字段)—— 局域网 11.4 s → **4.6 s**,还少绕一轮。
工具派发本来就不需要思维链:**工具本身就是推理**。
⚠️ 关思考的开关只有这一个:`think:false` 是 Ollama 原生 `/api/chat` 专用,`/v1` 不认;
`chat_template_kwargs:{enable_thinking:false}` 会把**正文整个吃空**(实测 content 为空串),别用。

**④ 意外收获:参数描述能治住入参。** 第一发 `lookup_draws` 被填成 `{"prov":"Manitoba"}`;
给 schema 加一句 `description: "Two-letter province code, e.g. MB"` 之后就填 `"MB"` 了。
**但这不能替代采信校验** —— `lib/agent` 的 `cleanProvs` / `acceptNoc` 那一层照样要有:
描述是求它,白名单才是拦它。

**⑤ 原来列的「真约束」是假的。** 我曾把 20000 字符当上游硬约束,它其实是同一台机器上包装层里的一个数
(见上表)。代码这边仍然按**紧凑**写:工具回执回 `facts.ts` 渲染好的 Fact 成品句,不是 lookup 的整坨 JSON ——
这跟今天 `factsBlock` 压缩同一个动机,只是位置从「拼 prompt」挪到「工具回执」,而且它顺带压的是
**每轮 1.7 秒开销 × 轮数**,那个才是真的花在用户身上的时间。

📌 顺带记一笔(**不属本批**):`lib/agent` 今天还在走付费的 anthropic,而它要的三把工具比这里简单得多。
上面这个结论同样适用,可以顺手搬到免费网关 —— 但那是另一个批次,别夹带。

## 2 · pi 循环放 `lib/chat` 自己长,不并进 `lib/agent`

判据仍是 14 号 §1 那条:**有没有重复**,以及**边界按「对话形状」切**。

| | `lib/agent` | `lib/chat`(本批之后) |
|---|---|---|
| 它在答什么 | 「你说的是哪个职业」——**只补槽位不产事实** | 「你这个情况怎么办」——**产见客的数字与结论** |
| 工具 | 3 把(查候选 / 记槽位 / 交回) | 10 把(门槛 / 覆盖 / 在招 / 抽签 / 处理时长 / EE / 工签规则 / CRS / 对账 / 裁决) |
| 出口 | 采信校验(码必须在候选里) | `guardAnswer` 回读比对 + 四态不许合并 + 枚举值不许见客 |
| 失败 | 吞掉回 null,回落原来的反问 | 抛 `chatError`,路由分 400/502/503 |

两者共用的只有「怎么调 pi」这一层薄壳(`model()` / `passThroughMessages` / `stream as StreamFn`),
逐字重复约 40 行。**这 40 行不收拢** —— 收拢就要为它新建一个共享叶子(为两行代码盖房子),
而且一收就把 chat 的 10 把工具和 agent 的 3 把塞进同一个类型口。
两边各留一份,`lib/chat` 那份的 `model()` 上写一句交叉引用,同 14 号处理 `ANTHROPIC_MODEL` 的办法。

⚠️ 方向仍然只能是 **agent → chat**,反过来一条边都不许接(`orchestrate.ts:54` 那条注释的理由不变:
桶里的运行时值一进初始化顺序的赌局就是 `PNP_PROVINCES is not iterable`,实撞过两次)。
`rescueOcc` 注入那条边本批**整个消失** —— pi 自己就会查职业候选,不需要「解不出来再救一次」。

---

## 3 · 删掉的 1552 行各自去哪了

| 删的东西 | 它在干什么 | 换成什么 |
|---|---|---|
| `slots.ts` 的 `SLOT_SYSTEM` + `normalizeSlots` + `resolveNoc` + `suggestOccupations` | 一发 LLM 抽 JSON 槽位,再拿职名去 pg_trgm 猜 NOC | pi 工具 `search_occupations`(照抄 `lib/agent` 的采信校验:**码必须在候选里出现过**) |
| `federal.ts` 的 6 组正则 | 用户这句话该不该打联邦规则/CRS 分表 | 模型自己挑工具。判据从正则搬进**工具描述**(`prompts.ts`) |
| `cards.ts` 的 `collectFacts` | 13 处 `lookup*` 的手写并发调度 | pi 循环。每把工具执行时把 `Fact[]` 往收件箱攒(同 `lib/agent` 的 `Inbox`) |
| `answer.ts` 的 `factsBlock` + 预算压缩 + 指纹 | 把 facts 压平压缩塞进 6000 字符,并把变量钉在**前 2000 字符**(朋友网关按前缀做缓存键) | 删。这两样都是**朋友网关的变通**,随它一起退役(haiku 200k 窗口 + 真 prompt caching) |
| `answer.ts` 的 `buildPgwpCombineAnswer` | PGWP 合并题绕开模型直接拼答复 | 删。它是「模型说不明白就自己上手写」的补丁,有工具之后不需要 |
| `followups.ts` 的 `buildFollowups` | 按 facts 里有哪几类,查表出 3 条追问 | **留**(`citeFacts` / `profileFill` 也留)—— 它是纯查表,不是编排 |
| `orchestrate.ts` 的 noOcc / 候选卡 / 反问分支 | 拿不到 NOC 时反问 + 摆候选 chip | pi 的 `ask_user` 工具(`terminate: true`),选项卡照旧由 `cards.ts` 的 `slotAskOptions` 渲染 |

### 🔴 3.1 订正:`answer.ts` 的规则体是**搬,不是删**(2026-08-19,写到一半自己抓出来的)

上表原来写「删 `answer.ts` 491 行」,**判错了**。它里面真正该死的只有「朋友网关的变通」那三样
(`factsBlock` 压缩、`PROMPT_BUDGET` 预算、指纹与前 2000 字符的缓存键排布)约 120 行;
剩下 370 行是 `synthMessages` 的 **RULE 0 – RULE 9 加五套 PLAYBOOK**,每一条正上方都挂着一次生产事故:

| 规则 | 它挡的是哪次事故 |
|---|---|
| RULE 0 / 0b | 08-04:按 FACTS 顺序背材料,问「值不值」答的是清单与门槛,两轮几乎一字不差 |
| RULE 1 / 2 | 自己算的数字 = 谎话;中文数字是 guard 的盲区,数量一律阿拉伯数字 |
| RULE 3 | 四态不许合并、内部码不许见客 —— 这个产品的核心红线 |
| RULE 5 / 5b / 5c | 08-05:逐行抄 FACTS(`label = value`)、连着三句同一个开头 = 在念表格 |
| RULE 6 | 语言纯度:英文速记漏进中/韩答复 |
| RULE 7 | 上游忽略 `max_tokens`,长度只能靠规则 + 出口截断 |
| RULE 8 | 没有 fact 撑腰的政策断言:数字 guard 一个字都拦不住 |
| PLAYBOOK_ODDS / PLAN / VERDICT / ZERO_EXP / CLAIMS | 五种题型各自的拒答与铺陈口径 |

**换编排换的是「打哪几把工具」,不是「怎么写这段话」。** 这套规则原样搬进 `prompts.ts` 当 pi 的 system prompt,
一条都不许趁机「顺手简化」—— 删掉任何一条,质量当场退回它对应的那次事故。
真正靠 pi 省下来的是**给材料的手艺**:RULE 之外那一大坨「概率题不给岗位数」「没问抽选就不给那两条四态行」
的**挑材料逻辑**(`rest` 那个 filter)可以退役 —— 那是「上下文只有 6000 字符所以必须替模型挑」的产物,
工具循环里模型自己决定查什么,不需要我们预先筛。

**`followups.ts` 与 `cards.ts` 只删 `collectFacts` 一个函数**,`slotAskOptions` 留着 —— 前面那张表按文件记,
这里按函数订正一下:`cards.ts` 剩 `slotAskOptions`,`followups.ts` 整个留。

---

## 4 · 出口那道门一步不改

pi 循环跑完拿到最终 assistant 文本之后,走的仍然是今天 `orchestrate.ts:290–400` 那一段:

```
answer → guardAnswer(回读比对:每个数字必须在 facts 里找得到出处)
       → findLeaks / findEnglishUnits / findMergedStates / findHedges …(10 道)
       → 撞了 → 重写一次 → 再撞 → factSheet 降级(facts 非空)/ chatError('guard')(facts 空)
       → clampAnswer 按句截断 → localizeUnits
```

三条不能破的,原样写进新 `orchestrate`:

1. **数字必须能回读到出处**。工具结果进了上下文不等于模型抄对了,pi 一样会算错、会四舍五入。
2. **四态不许合并**(`ok` / `not-published` / `not-collected` / `not-applicable`),但**枚举值本身不许见客**。
3. **等不来字报 busy,不降级成事实清单**(2026-08-09 Frank 拍板)——`chatError` 的 `busy` 那条注释已经钉在 `lib/error.ts`。

降级分支同样必须过同一道门(2026-08-04 事故:兜底把英文内部标签直接吐给了用户)。

---

## 5 · 流式与轨迹

`runAgentLoop` 的第 4 个参数是事件回调,`lib/agent` 传的是 `ignoreEvents`,这里要真接:

| pi 事件 | 接到哪 |
|---|---|
| `tool_execution_start` | `onStep({ phase: 'tool', … })` —— 轨迹只在**真的开始打**才发 |
| `tool_execution_end` | 往收件箱攒 `Fact[]` |
| `message_update` | `onDelta` 逐句门(`makeSentenceGate` 原样) |

`SYNTH_STALL_MS` 那只看门狗改挂在 `AbortController` 上(同 `lib/agent` 的 `TIMEOUT_MS` 形状),超时 → `chatError('busy')`。

---

## 6 · 测试

18 个 spec 引 `lib/chat`,其中 16 个是 chat 专属。

- **不动的**:`chatTools`(31 条,直接测 `tools.ts` 的 lookup,打生产库只读)、`chatGuardAttr` / `chatVerdict` / `guards` 那批(直接测出口校验件)。这些正是「留下来的那两层」的测试,**它们绿着就说明红线没塌**。
- **要改的**:`chatGate` / `chatStall` / `chatContext` / `chatCure` / `chatFederal` / `chatPreset1-3` —— 它们 `vi.mock('@/lib/llm')` 桩 `completeText`,而新链不再走 `completeText`,改桩 pi 的 `stream`。
- **评测批**:`chatEval` / `chatGold` 是金标,**分数不许掉** —— 这是这批唯一的横向验收标尺。

⚠️ `chatTools.int.spec` 打生产库,单条 5s 超时会抖(本轮实撞一次,重跑 31/31 绿)。别把它当回归。

---

## 7 · 分批

- **A**(已完成,e3dd5222 之后):`ChatError` → `lib/error` 的 `chatError` / `isChatError`,全站 `class` 归零。
- **B**:新 `orchestrate` + pi 工具表 + 收件箱,旧链留着,`CHAT_PI=1` 才走新链(同 `AGENT_FALLBACK` 的形状)。
- **C**:金标对跑,新链不掉分 → 删旧链 1552 行 + 那批 mock 改桩。
- **D**:`lib/chat` 的 25 处裸 `console.log` 接进 `lib/log`(**本来是这批的 ② ,推迟到这里** —— 在要删的代码上做机械清扫是白干)。

验收照 CLAUDE.md 四道闸:`tsc` 零错、`eslint` 零新增、`vitest` 719 条无新增红、`build` 过;
上线后拉 `/api/version` 确认换版。
