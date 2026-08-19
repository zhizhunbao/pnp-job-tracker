# 11 · `lib/agent/`:对话兜底接 Pi(第一版,默认关)

> 2026-08-18。Frank:「以 agent 为主」「不如直接让 agent 查数据库」「数据库查不到就从网上抓」。
> 本文记的是**已经落地的第一版**(兜底一格)与**已经谈定的下一步形状**(三层)。
> 状态:**已提交,`AGENT_FALLBACK` 默认关** —— 不开等于这段代码不存在。

---

## 1 · 为什么做:枚举税是实测出来的

`lib/chat` 的路由是人写的:**13 个意图谓词 + 53 条正则**(slots 15 / federal 38)。
每来一种新问法就加一条,而组合是乘法。

`chat_logs` 实测(198 轮,08-05 建表 → 08-16):

| | 轮数 | 占比 |
|---|---|---|
| 成功 | 134(其中 4 轮降级) | 67.7% |
| **`noOcc`** —— 抽不出职业码,反问「请提供 NOC」 | **41** | **20.7%** |
| `busy`(超时) | 15 | 7.6% |
| `tooShort` | 4 | 2.0% |

日均 6.6 轮(峰值 37/47/90 那三天看着是自测)。**每 5 轮就有 1 轮,用户拿到的是「请你重说」。**

---

## 2 · Spike:三个后端只有两个会调工具

| 后端 | 复合问题「BC 和安省哪个门槛低 + 顺便看 BC 抽选」 | 缺 NOC | 元问题 | 延迟 |
|---|---|---|---|---|
| 朋友 qwen3.6(ngrok) | ❌ 不调 | — | — | 1.7–2.6s |
| 家里 Ollama `qwen3.6:latest` | ✅ 两个调用全对 | ✅ 文字反问 | ✅ 不乱调 | 5–6s |
| **Haiku 4.5** | ✅ 两个调用全对 | ✅ 文字反问 | ✅ 不乱调 | 1.4s |

🔴 **朋友那个网关不做 tool calling,而且是静默忽略**:`tools` 按 OpenAI 格式发出去了(`onPayload` 实证)、
HTTP 200、只回文本;连 `tool_choice: "required"` 都当没看见(按规范不支持就该回 400)。
**是网关不透传,不是模型不会** —— 同一个模型在 Ollama 上就调对了。
→ 待办:给朋友一页最小复现,请他在 `/v1/chat/completions` 上透传 `tools` + `tool_choice`。他透传了,planner 换一行 model 就切回零成本。

顺带:没有工具时,那个网关自信地答「截至目前(**2024年**),BC PNP 并没有针对特定 NOC 设定统一门槛」——
年份错、结论编。**这正是本产品存在的理由**,也是「数字只能来自工具层」这条不能松的原因。

---

## 3 · 形状:只用 Pi 的引擎,不用它的机壳

| 包 | 用不用 | 理由 |
|---|---|---|
| `pi-ai` | ✅ | 统一 provider + 工具声明 + 流式;`Tool` 是纯声明没有 execute |
| `pi-agent-core` | ✅ | `runAgentLoop`:循环、批量执行、**参数按 TypeBox schema 校验**、`terminate` 提前收工 |
| `pi-coding-agent` | ❌ | 13.7 MB 的 CLI 机壳。5,524 个插件挂在它上面,但那些是给**写代码的 agent** 用的(web-access/mcp/subagents/memory),产品 chat 一个都用不上 |

**手写循环 → `runAgentLoop`,planner 118 → 80 行,八条语料结果逐条相同。** 现成的测好的就别自己写。

```
lib/agent/  index.ts(桶,2 个名字)  planner.ts(80)  tools.ts(92)  prompts.ts(25)
```

我们只剩三件:工具干什么、**采信判据**、失败一律回落反问。
🔴 **校验归它,采信归我们**:schema 过了不等于内容可信 —— NOC 必须出现在 `search_occupations`
真实返回的候选里,省码必须过九省表。模型编的码在这一层就被打回。

---

## 4 · 🔴 两个坑,都是「tsc 全绿但坏了」

**① 依赖成环:`PNP_PROVINCES is not iterable`**
`lib/chat/orchestrate` import 了 `lib/agent`,而 agent 又从 `@/lib/chat` 桶取**运行时值** → 环。
**同一个常量、同一个仓库第二次栽**(`lib/i18n/chat.ts` 顶上那条注释一字不差地警告过)。
tsc 全绿,是 `profilePathways` 那个跟 chat 毫无关系的测试文件先加载 agent 才炸出来的。
**修法是倒转依赖方向**:`rescueOcc` 由路由注入,`lib/chat` 从此不认识 `lib/agent`。方向只有一条:agent → chat。

**② standalone 产物里没有 pi**
第一次 `npm run build` exit 0、`✓ Compiled successfully`,但 `.next/standalone/node_modules` 里
**一个 `@earendil-works` 都没有** —— `pi-ai` 的 provider 实现走 `exports` 通配子路径 + 动态 `import()`,追踪器抓不到。
本地 dev 一切正常,**上线就是 `MODULE_NOT_FOUND`**。
修:`next.config.ts` 的 `outputFileTracingIncludes` 给 `/api/chat` 点名。重建后 16M 进产物,standalone 130M → **146M**。
⚠️ 重的传递依赖(`@aws-sdk` bedrock、`@google/genai`、`openai`)**没进产物** —— 哪天把 planner 换成
Ollama / 朋友网关(走 `openai-completions`)或别家,**要回来补一条 include**,否则线上找不到模块。

---

## 5 · 第一版做了什么 · 实测命中 2/8

触发点只有一格:`orchestrate` 抛 `noOcc` **之前**。命中就补槽位、原路走完;不命中照旧反问。
它**只补槽位不产事实**:facts 仍旧由 `collectFacts` 从工具层取,合成与出口闸一行没动。

八条真实 `noOcc` 语料实跑:

| 用户原话 | 结果 | |
|---|---|---|
| 我是做前端开发的,想看看哪个省好走 | `noc=21234` | ✅ 救回 |
| 我 480 稳吗? | `noc=null` + "CRS question — does not depend on occupation" | ⚠️ **判对了,接线没用上** |
| 你好啊 / ????????? | 回落反问 | ✅ 本来就该反问 |
| 按我已经填写的条件… / 按我的情况判一判 | 回落反问 | ❌ 要档案,而 agent 没拿到 `profileContext`(注:这两位当时槽位全空,**本来就没档案**,补了也救不回这两行,只堵将来) |
| 大家都是这么说的 两个一年能换 3 年 | 回落反问 | ❌ PGWP 主张核对,工具集里没有 `lookupPermit` |
| 为什么没有选项给我 | 回落反问 | ❌ 元问题 —— **这条不该用 agent 修**,`metaTopicOf` 加一条正则更便宜 |

---

## 6 · 谈定的下一步形状(新 session 从这里接)

Frank 拍的方向:**以 agent 为主,情况由 agent 自己判断**;库里查不到就上网抓。
落成三层,agent 自己挑:

```
① 库里的 lookup(10 个工具)   → 出 Fact,带 evidence,过闸     ← 数字只走这条
② 官方页现抓(域名白名单)     → 只出文字,不出 Fact           ← 长尾解释走这条
③ 都不行                      → 照实说 + 缺口进队列            ← 数据线明天去补
```

### 分界线是「数字 / 文字」,不是「ETL / chat」

- **数字与判定**(门槛、分数线、名额、处理时长、在招数)**只能来自库** —— 要带出处、要过闸、要能复现;
  而且它们**是有限的**,官方口径就那么几张表。
- **解释、材料清单、官方原文段落**是长尾,库里穷举不了,**可以现抓**;它们不是数字,读岔了不会让用户拿假分数做决定。

🔴 **这条分界不用改闸就能自动执行**:`guardAnswer` 判的正是「答复里的数字能不能在 facts 里找到出处」——
现抓的网页文字进 prompt 后,里面的数字**天然过不了闸**,模型顺手抄一个就会被拦下重试/降级。

### `fetch_official_page` 的约束

- **域名白名单**,不许模型给任意 URL。白名单不用新造:`data/raw/sources/field-sources.json` +
  crawl 役的 `data/crawl/<slug>/manifest.json` 已经是官方源清单。
- 进 prompt 时标注「引自 X,抓取于 Y」;**不产出 Fact**。
- 抓到的正文落 `html_cache/`(和 crawl 役同一个目录)——
  **chat 的长尾抓取自动变成数据线「下次该洗什么」的线索**。高频出现的就该进 ETL 变成正式库表。

### 🔴 现抓**不靠 Pi**,而且这个站早就有

别把「用 Pi」和「能现抓」联在一起 —— 我们装的 `pi-ai` + `pi-agent-core` 里
**一个内置工具都没有**(`AgentTool` 是个空壳让你填 `execute`)。现抓在 `pi-web-access` 这类
**插件**里,而插件挂在 `pi-coding-agent`(13.7MB CLI 机壳)上。用 Pi 的理由只有三件:
**循环、参数校验、provider 统一**,抓网页不在其中。

**而站里早就有一版,带白名单**:`lib/llm.ts:157` 的 `webFetchTool()` —— 公司调查(E6-03)一直在用,
2026-07-05 冒烟实测过:

```ts
tools: [{ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 1,
          allowed_domains: [u.hostname], max_content_tokens: … }]
```

`max_uses: 1` + **域名锁到那一个 host** + 输入侧封顶。第 ② 层照这个样子扩白名单就行,**一个插件都不需要**。

顺带:`pi-web-access` 那类插件**恰恰不守第 4 条**(抓回来就交给模型自由使用),装了反而要花力气拦它。

**真正难的从来不是「抓」**(Node 里就是一个 `fetch`),是这四条 —— 没有任何插件会替我们守:
① 白名单;② 解析(HTML → 正文,crawl 役的解析器与 `html_cache/` 已有);③ 出处标注;
④ **不许它产出 Fact**(数字仍旧只从库来,`guardAnswer` 自动兜住)。

### 为什么不让 agent 直接写 SQL

三条,前两条是硬的:① 一行原始 SQL 结果**没有 evidence**;② **口径不在 schema 里,在 lookup 的代码里**
(「计数与名单必须同一个 WHERE」那次实撞:计数只算具名、名单收了粗筛,「有 83 家」与名单对不上号)——
agent 写 SQL 会把这些静默搞错,而错出来的数字长得完全正常;③ 让模型对生产库发 SQL 是新的攻击面
(要只读角色 + 只准 mart 表 + timeout + 强制 LIMIT)。
逃生舱可以留,但**押后**:先把 10 个门打开,看还剩多少问法真的漏。

---

## 7 · 下一步第一件(两条路都要走)

**把 `collectFacts` 从「一个整体」拆成「按工具」。** 现在它是按槽位一次 `Promise.all` 调七个 lookup
再统一摆 facts(`cards.ts` 219 起约 200 行)。上面三层全建在它上面 ——
不管最后是 agent 挑工具还是别的,那 200 行的单体组装都得先散开。**这是无悔的一步。**

之后是那三条小改(联邦题信号 / `profileContext` / `lookupPermit` 工具),加起来不到 60 行。

---

## 8 · 验收与开关

| 项 | 值 |
|---|---|
| `tsc --noEmit` | **0** |
| vitest | **699 / 694 过 / 5 败**,按用例全名与基线逐条相同(那 5 个是既存的生产库口径漂移) |
| eslint | 561 problems / 1 error(基线 558;+3 是新文件里的 `any`) |
| `npm run build` | ✓,**且验了产物**(见 §4②) |
| 生产 | `AGENT_FALLBACK` 默认关 —— **关着时行为与从前逐字相同**,一次模型都不调 |

要真开:提交上线 → Render 设 `AGENT_FALLBACK=1`(`ANTHROPIC_API_KEY` 已有)。
**建议先把三条补完再开**:现在开的话 20.7% 里只有四分之一能救回来,剩下的照旧反问还多花一次调用。
