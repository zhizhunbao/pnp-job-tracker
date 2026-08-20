# 16 · `lib/chat`:域内七件套定型(18 文件 → 4 件)

> 2026-08-19。样板是同日的 [`lib/agent`(11 号)](11_agent兜底接入pi.md) 与 [`lib/llm`(14 号)](14_lib-llm域重构.md),
> 规矩在 CLAUDE.md「代码组织约定 / 域内文件的标准形态」。
> **本批只定型写法与布局,不改行为** —— 照 `design/模块边界统一-20260819.md` 那批的口径:只移动,不改逻辑。

---

## 0 · 起点(实测,已剥掉注释与 prompt 字符串)

| | `lib/chat` | 对比 `lib/llm`(14 号起点) |
|---|---|---|
| 行数 / 文件 | **5091 / 18** | 632 / 4 |
| `any` | **58**(其中 **18 个是 `pool: any`**) | 7 |
| `unknown` | **19** | — |
| 箭头函数 | **329** | 39 |
| 对象展开 `...` | **117** | 14 |
| `console.log` | **27**(**26 个挤在 `orchestrate.ts`**) | 0 |
| `as` 断言(非 `as const`) | **16** | 2 |
| `class` | **0** ✅([15 号 A 批](15_lib-chat换编排走pi.md)已把 `ChatError` 搬进 `lib/error`) | 0 |

⚠️ 第一版实盘报的是 97 个 `any` —— **假阳性**:正则命中了 prompt 字符串里的英文单词
(`never merge any state into…`)。剥掉字符串与注释后是 58。**数错的数不许留在卷宗里**,记这一笔是因为
下一个域实盘时会再踩:量代码不能直接 grep,先剥。

---

## 1 · 方案:B(硬套七件套),Frank 拍板

三个选项摆过:A 保持 18 文件只做宪法合规 / B 硬套七件套 / C 先按关注点收成子目录再各自七件套。
**Frank 选 B。** 我提过一次代价(`functions.ts` 会到 3000+ 行),他的答复是
**「functions 本身内部可以分类」** —— 即靠**编号段横幅**导航,不靠拆文件。
样板就是 CLAUDE.md 自己点名的 `lib/db/sql.ts`(27 个编号段,const 与 function 交替 27 次)。

---

## 2 · 四件不是七件(缺的三件各有理由)

| 件 | 在不在 | 理由 |
|---|---|---|
| `constants.ts` | ✅ | 标量、字符串表、正则 |
| `types.ts` | ✅ | 契约 + 11 个 `*Result` |
| `functions.ts` | ✅ | 全部行为,内部按编号段分 |
| `index.ts` | ✅ | 桶 |
| `prompts.ts` | ✅ | `SLOT_SYSTEM` + `synthMessages` 的 RULE 0–9 + 五套 PLAYBOOK |
| `schemas.ts` | ❌ | **本域没有运行时校验库**(同 14 号 §3 的 llm)。上游形状写在 `types.ts`,解析时逐个兜底 |
| `server.ts` | ❌ | 见 §2.1 |

所以实际是 **`constants` / `prompts` / `types` / `functions` / `index` 五件**。

### 2.1 不开 `server` 门(判据照 14 号 §2,结论相同)

判据不是「今天有没有 `'use client'` 消费者」(那是会变的事实,撑不住),
而是**擦掉服务端那半之后 `index` 门里还剩什么**。

实测(2026-08-19):`@/lib/chat` 全站只有 **2 个消费者** ——
`app/api/chat/route.ts`(服务端)与 `lib/i18n/chat.ts`(**纯 `import type`**,反向取
`FollowKey` / `MetaTopic` / `OccOption` / `ProfileSlot` / `UsageTopic` 五个类型)。
`src/` 里**零处绕桶**;`tests/` 绕桶是边界闸特批的。

擦掉连库那半之后,index 里只剩类型 —— **那不是门,是空壳**,和 `lib/llm` 一样。
(`lib/agent` 拆得成,是因为它的 index 本来就只有类型:`AgentSlots` 要交给客户端看。)

哪天有 `'use client'` 组件要 import 这个桶,回来重判这一条。

---

## 3 · 18 → 5 的逐文件去向

| 现在 | 行 | 去哪 |
|---|---|---|
| `types.ts` | 75 | → `types.ts` |
| `steps.ts` | 50 | 常量 → `constants.ts`;`ChatStep` / `OnStep` → `types.ts` |
| `normalize.ts` | 48 | `PROV_ALIAS` / `TOPICS` → `constants.ts`;三个函数 → `functions.ts` |
| `wording.ts` | 157 | 五张表与两个上限 → `constants.ts`;`stripMd` / `localizeUnits` / `unitText` → `functions.ts` |
| `federal.ts` | 167 | 六组正则 + `LANG_NAME` + `MIN_PROFILE_SLOTS` → `constants.ts`;判定函数 → `functions.ts` |
| `traces.ts` | 174 | 三个正则 → `constants.ts`;`find*` → `functions.ts` |
| `stream.ts` | 154 | 全部 → `functions.ts`(`SentenceGate` 形状 → `types.ts`) |
| `guards.ts` | 521 | `NUM_RE` → `constants.ts`;其余 → `functions.ts` |
| `followups.ts` | 117 | `FollowKey` → `types.ts`;三个函数 → `functions.ts` |
| `cards.ts` | 272 | 全部 → `functions.ts` |
| `slots.ts` | 429 | **`SLOT_SYSTEM` → `prompts.ts`**;`PROFILE_SLOTS` / `NOC_IN_TEXT` → `constants.ts`;`OccOption` / `ProfileSlot` / `UsageTopic` / `MetaTopic` → `types.ts`;其余 → `functions.ts` |
| `answer.ts` | 492 | **RULE 0–9 与五套 PLAYBOOK → `prompts.ts`**;其余 → `functions.ts` |
| `facts.ts` | 654 | `LABEL_CAP` / `DERIVED` → `constants.ts`;其余 → `functions.ts` |
| `reportFacts.ts` | 113 | `ReportFacts` → `types.ts`;`assembleReportFacts` → `functions.ts` |
| `tools.ts` | 1142 | 11 个 `*Result` 与 `Evidence` / `Availability` / `ClaimTopic` → `types.ts`;`PRIVATE_PROMISE` 等 → `constants.ts`;10 个 `lookup*` → `functions.ts` |
| `orchestrate.ts` | 419 | → `functions.ts`(**26 处 `console.log` 同批接进 `lib/log` 的 `CHAT_LOG`**) |
| `log.ts` | 75 | `Q_CAP` / `A_CAP` / `THREAD_SEED` → `constants.ts`;三个函数 → `functions.ts` |
| `index.ts` | 32 | → `index.ts`(内容不变:桶写的是「对外是什么」) |

---

## 4 · `functions.ts` 的编号段(按**数据流**排,不按原文件)

这是本批最要紧的一张表 —— 3000+ 行能不能读,全看它。段序就是一轮对话真实走过的顺序:

```
1.  取数(库)          memoPool / assembleReportFacts / 10 个 lookup* / checkClaims / loadVerdictData
2.  事实渲染            fact / statusFact / jobsFacts / coverageFacts / thresholdsFacts / …
3.  抽槽与职业          normalizeSlots / literalNoc / bareNocCandidates / resolveNoc / suggestOccupations
4.  题型判定            federalRulePrograms / crsLookups / isPathQuestion / isPlanQuestion / isOddsQuestion / metaTopicOf
5.  合成入参            synthMessages / factsBlock / sayFact
6.  出口硬拦            guardAnswer / findLeaks / findUngroundedClaims / findUnitMismatch / …
7.  出口留痕            findHedges / findSameOpening / findMixedStates / findShoutedWords / dropTrailingHedge
8.  见客整形            clampAnswer / factSheet / makeSentenceGate / localizeUnits / unitText / stripMd / tidy
9.  追问与选项卡        buildFollowups / citeFacts / profileFill / slotAskOptions / permitOptions / verdictFollowups
10. 编排                collectFacts / orchestrate
11. 对话留痕            threadId / turnOf / logChat
```

一级段用三行 `//` 框 + `N.` 编号;段本身翻不完时才切 `N.1`(第 1、2、6 段一定要切)。
**段内不再切小节**(`// ── 名 ──` 那种 08-19 全站退役)。

---

## 5 · 顺带清掉的宪法欠账(**只做零语义的那几项**)

搬家过程中顺手做掉、且**不会改变行为**的:

- **`pool: any` → `pool: Db`** ×18。`lib/db/database.ts` **已经导出了结构类型 `Db`**
  (`{ query(sql, params): Promise<{rows, rowCount}> }`),正是本域用到的那个面 —— 不新建类型,不动 `lib/db`。
- **26 处 `console.log` → `lib/log`**(新增 `CHAT_LOG` 段)。这就是本轮开工时点名的**债②**。
- **`functions.ts` 里不许有变量** —— 这条是搬家的**强制副产品**:顶层 const 必须去 `constants.ts`。

**不在本批做的**(语义相关,逐个要看,单独立批):329 个箭头函数改具名、117 处对象展开写全字段、
16 处 `as` 逐个判「是不是拿断言顶了注解」、174 个导出逐个补多行 JSDoc、19 处 `unknown` 的信任边界怎么收。
—— 一次动 5000 行已经够了,再叠语义改动,出事时分不清是搬坏的还是改坏的。

---

## 6 · 验收

- [ ] `npx tsc --noEmit` 零错
- [ ] `npx eslint src/lib/chat` 零 error(边界闸 `BARRELS` 已含 `chat`,不用加行;**不开 server 门 = ALLOW 不加**)
- [ ] `npx vitest run` —— **719 条与基线逐条相同**
- [ ] `npm run build` ✓
- [ ] push 后拉 `/api/version` 确认换版

⚠️ **测试直接点文件**(`@/lib/chat/guards`、`@/lib/chat/orchestrate`、`@/lib/chat/types`…),
18 个 spec 里 16 个是 chat 专属 —— 文件一并,**这些 import 路径全部要改**,是本批最大的一块机械改动。
边界闸对 `tests/**` 开了口子(08-18 立),所以它们照旧可以点 `@/lib/chat/functions`,不必挂上桶。

⚠️ `chatTools.int.spec` 打**生产库只读**,单条 5s 超时会抖(本轮实撞一次,重跑 31/31 绿)。别把它当回归。
