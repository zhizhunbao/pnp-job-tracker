# 10 · `lib/chat/` 拆分设计(**只出设计,等点头**)

> 2026-08-18。接 [06 号 §6](06_过度导出清单-ts侧.md)(「下一个桶 = `lib/chat`,且只有它」)与
> [08 号](08_过度导出第1批与模块边界闸.md)(第 1 批已把这一簇的 47 个导出收窄)。
> **本文一行代码没改。** 三个待拍板的问题在 §9,都带推荐默认值。

---

## 1 · 判据:为什么是它,为什么是现在

06 号量过一遍:能不能收拢看的**不是名字像不像,是有没有重复** —— 「有多少调用点同时引这一簇 ≥2 个成员」:

| 簇 | 行数 | 同时引 ≥2 个成员的调用点 |
|---|---|---|
| **chat**(`chatOrchestrate` + `chatTools` + `chatLog`) | **4704** | **7** |
| employer / plan / score / resume | 193 / 451 / 265 / 132 | **全 0** |

**只有 chat 成立。** 顺序也早定了:与 `lib/quiz` 相反 —— quiz 三个文件 478/353/73 行,边界天然看得见,
可以直接搬;`chatOrchestrate` 3488 行,**边界看不见**,所以先收窄导出再谈拆。第 1 批已经做完那一步。

---

## 2 · 实测:今天长什么样

```
chatOrchestrate.ts  3488 行 / 26 个段横幅
chatTools.ts        1142 行 / 12 个段横幅(10 个 lookup 工具,一段一个)
chatLog.ts            74 行
lib/i18n/chat.ts     764 行  ← 反向 import 了 chatOrchestrate 的 5 个类型
```

### 🔴 最要紧的一个数:**76 个对外名字里,66 个只有测试在用**

`chatOrchestrate` 被外部 import 的名字 76 个,按消费者分:

| 消费者 | 名字 | 个数 |
|---|---|---|
| `app/api/chat/route.ts` | `orchestrate` `profileFill` `chatProfileContext` `ChatError` + 类型 `ChatResult` `ChatStep` `ChatTurn` | **7** |
| `lib/i18n/chat.ts`(全 `import type`) | `FollowKey` `MetaTopic` `OccOption` `ProfileSlot` `UsageTopic` | **5** |
| **只有 `tests/` 在用** | `guardAnswer` `findLeaks` `findForeignScript` `sentenceBlockers` `makeSentenceGate` `normalizeSlots` … | **66** |

`chatTools` 28 个:8 个是 `pathVerdict`/`planTimeline`/`tripleVerdict` 取的类型(`Evidence`/`Availability` 那套),
1 个是 `verdictCache` 取的 `loadVerdictData`,7 个是 `chatOrchestrate` 自己取的(拆完变**模块内部**),其余测试专用。

**这个数直接决定桶怎么设计** —— 见 §4。

---

## 3 · 实测:段与段之间谁引用谁(拆之前先看有没有环)

按段横幅切开 26 段,剥掉注释后统计跨段引用,再按拟定的文件分组。原始分组**有两个环**:

| 环 | 成因(逐个名字) |
|---|---|
| `facts ↔ guards` | `stripMd`(住 facts,被 guards 用)、`AVAIL_MARKERS` / `VERDICT_MARKERS`(住 facts,被闸B与留痕用)、`localizeUnits`(住 guards,被 facts 用) |
| `answer ↔ guards` | `HEDGE_WORDS` / `LEN_CAP` / `SENT_CAP` / `unitText`(住 guards,被 answer 用)、`sayFact`(住 answer,被逐句门控用) |

**十个名字,全是词表、上限、文本小件** —— 它们不属于任何一层业务,是各层共用的底料。
把其中 9 个下沉进新的 `wording.ts`(`sayFact` 不动,那条边本来就是单向的),**两个环同时消失**。
重算后的文件图:**有向无环,7 层**。

---

## 4 · 🔴 关键决定①:桶只装**生产契约**,测试从具体文件取

CLAUDE.md:「一个模块 = 一个目录 + `index.ts` 桶,外部一律从桶 import」「我只想看接口就完事靠的是这个桶」。

但这一簇有两类外部消费者,诉求正相反:

| 消费者 | 要什么 | 名字数 |
|---|---|---|
| 生产代码(route / i18n / 三个判定层 / verdictCache) | **一小撮稳定接口** | **23**(7 个值 + 16 个类型) |
| `tests/`(19 个文件) | **伸手进模块内部**,逐个判定件穷举断言 | **66** |

**桶装 23 个,不是 89 个。** 桶要是把测试面也一起导出,它就不再是「看一眼就知道对外是什么」的头文件 ——
那正是这条约定要防的事。测试**直接点文件**(`@/lib/chat/guards`),并在上一轮那道
`no-restricted-imports` 边界闸里给 `tests/**` 开一个**写明理由**的口子:

> 判定层的测试要测的就是模块内部的判定件(见记忆 `verdict-test-methodology`:穷举输入断言性质)。
> 测试不是运行时消费者,它绕过桶**不会**让生产代码的对外面失控 —— 反过来,
> 为了让测试能 import 而把 66 个内部件挂上桶,才会。

桶的 23 个(拟定):

```ts
// 值
orchestrate, profileFill, chatProfileContext, ChatError, logChat, threadId, loadVerdictData
// 类型
ChatResult, ChatStep, ChatTurn,                                  // route 的契约
FollowKey, MetaTopic, OccOption, ProfileSlot, UsageTopic,        // i18n/chat 反向取(type-only)
Availability, Evidence, DrawsResult, OpsResult, PlanResult,      // 三个判定层取
ProvThresholds, ThresholdRow, ThresholdsResult
```

---

## 5 · 提议的形状:`lib/chat/` 15 个文件 + 桶

| 层 | 文件 | 行 | 装什么 | 依赖 |
|---|---|---|---|---|
| 1 | `types.ts` | 73 | 契约(前端按这个写)+ 被 `i18n/chat` 反向取的 5 个类型 | — |
| 1 | `wording.ts` | ≈60 | **解环用**:`stripMd` / 单位词三语(`UNIT_TEXT`/`localizeUnits`/`unitText`)/ 判据词表(`AVAIL_MARKERS`/`VERDICT_MARKERS`/`HEDGE_WORDS`)/ 上限(`LEN_CAP`/`SENT_CAP`) | — |
| 2 | `normalize.ts` | 41 | 模型输出→我们认的值:省名别名表 / `normProv` / `normTopic` / 单请求查询记忆 `memoPool` | types |
| 2 | `steps.ts` | 43 | 工具轨迹事件(「我在查什么」,三条铁律写在段头) | types |
| 2 | `federal.ts` | 159 | 联邦规则 / 计分题路由(纯函数,不交给模型猜) | types |
| 3 | `slots.ts` | 415 | 第一步:抽槽位 + 「说了专业没说职位名」的消歧 | federal/normalize/steps/types |
| 3 | `traces.ts` | 179 | 🟡 只留痕不拦的四条 | normalize/types/wording |
| 4 | `facts.ts` | 427 | 第二步:工具结果 → `Fact[]`(含时间线、路径裁决两块) | federal/slots/types/wording |
| 4 | `guards.ts` | 539 | 🔴 硬闸:三条出口校验 + 闸A 归因 + 闸B 单位 | normalize/traces/types/wording |
| 5 | `answer.ts` | 480 | 第三步:合成(模型只把 facts 说成人话) | facts/federal/normalize/slots/steps/types/wording |
| 5 | `cards.ts` | 457 | 建档点选卡(能让用户手点就别手输) | facts/federal/steps/types |
| 5 | `followups.ts` | 109 | 追问建议 + 对话槽 → 档案 | guards/types |
| 6 | `stream.ts` | 166 | 🔵 逐句门控 + ✂️ 截断(一句过了才发给前端) | answer/guards/traces/types/wording |
| 7 | `orchestrate.ts` | 362 | 主流程 | 以上全部 |
| — | `tools.ts` | 1142 | 原 `chatTools.ts` **整体搬入**,不拆 | types |
| — | `log.ts` | 74 | 原 `chatLog.ts` 整体搬入 | types |
| — | `index.ts` | ≈30 | 桶:§4 那 23 个 | — |

**为什么 `tools.ts` 不拆**(也是实测的):段横幅清楚、**没有任何重复**,而且十个 lookup 并不各自独立 ——
`checkClaims` 一个人就引了其中 **6 个**、`lookupPlan` 引 3 个。拆成十个文件,这两条边就变成 9 行 import,
读的人反而要多翻。CLAUDE.md 的判据是「有没有重复」,查不出重复的拆分「只有代价没有回报」。

**为什么 `guards` 拆成三个**(🔴 拦 / 🟡 留痕 / 🔵 逐句):884 行 12 个横幅是全模块最难翻的一块,
而这三类**语义完全不同**(拦下重来 / 记一笔放行 / 边发边判),作者自己早就用 emoji 分好了类,
拆只是把那套分类落成文件。三者依赖单向:`traces ← guards ← stream`。

### `types.ts` 成立的举证(判据两条都得中)

① **形状被同模块多个文件共用**:`Fact` / `ChatTurn` / `ChatResult` / `ChatStep` 被 8 个拟定文件用;
② **没有更自然的宿主**:`FollowKey`/`MetaTopic`/`OccOption`/`ProfileSlot`/`UsageTopic` 这 5 个
**同时被 `chatTools`、`i18n/chat` 和本模块多个文件用** —— 留在任何一个功能文件里都会让别人反向 import 那个文件。
这正是 `pathways/types.ts` 那种形状,是判据成立的第二例(06 号 §6 预判过)。

> 🔴 **`types.ts` 里一个运行时值都不许有。** `i18n/chat.ts` 反向取这 5 个类型是
> `import type`(编译期擦掉),**运行时无环**靠的就是这一点。哪天有人往 types.ts 里塞个常量,
> 那条反向边立刻变成真环。这句话要写进 `types.ts` 的文件头。

---

## 6 · 迁移步骤(一步一提交,每步都能停)

| 步 | 做什么 | 验收 |
|---|---|---|
| 0 | `i18n/chat.ts` 那三行 mid-file import(第 194/197/201 行)归位到文件头 | tsc |
| 1 | 建 `lib/chat/`,`chatTools.ts` → `tools.ts`、`chatLog.ts` → `log.ts`(纯改名),桶先转出这两者的对外名字 | tsc + vitest |
| 2 | 切底层四件:`types` / `wording` / `normalize` / `steps`(**含 §3 那 9 个名字的下沉**),原文件从它们 import | tsc + vitest |
| 3 | 切 `federal` / `slots` / `facts` | tsc + vitest |
| 4 | 切 `traces` / `guards` / `stream` / `answer` / `cards` / `followups` | tsc + vitest |
| 5 | 剩下的主流程改名 `orchestrate.ts`;桶定稿 23 个;5 个生产调用点改从桶取 | tsc + vitest + eslint |
| 6 | 19 个测试文件改成从具体文件取;eslint 边界闸给 `tests/**` 开口子(写明理由) | tsc + vitest + eslint |

**每步的验收口径**(照第 1、2 批那两轮的做法,别只看 passed 数字):
- `tsc --noEmit` 必须 0;
- `vitest run --reporter=json` **按用例全名前后对拍**,新增失败 0(基线是既存的 5 个生产库口径漂移);
- `eslint` 问题数比对(现基线 **558 problems / 1 error**)。

⚠️ **`tests/eval/*.eval.spec.ts` 不在默认 run 里**(vitest 只 include `tests/int/**/*.int.spec.ts`),
它们**打真模型**。迁移期间它们只由 `tsc` 保证「还编译得过」——**别顺手跑,那要花钱**。

---

## 7 · 明确不做的事

- **不改任何行为**:纯搬家 + 改 import。一行逻辑都不动(同 `lib/quiz` 那轮)。
- **不动提示词内容**、不动 `i18n/chat.ts` 的文案本体(只归位它的三行 import)。
- **不拆 `tools.ts`**(理由见 §5)、**不动 `prompts.ts` 那笔账**(那是 advisor 路由的事,另一件)。
- **不碰** `resumeMatch.ts` 的 `LANG_NAME`(仍等点头)。
- **不跑渲染探针**:纯 `.ts` 逻辑层,不动任何 `.tsx`。

---

## 8 · 风险

| 风险 | 兜底 |
|---|---|
| 66 个测试面的 import 路径一次性改 19 个文件 | 放最后一步单独一个提交;前 5 步测试仍从旧路径经桶取 |
| 段横幅切分与真实作用域不完全重合(某个 helper 跨段用) | tsc 会当场报 —— 每步都跑,不攒 |
| `wording.ts` 下沉 9 个名字时改错归属 | 这 9 个是**实测出来的**(§3 表格),不是猜的;下沉后重算依赖图应为无环 |
| 桶只转 23 个,漏掉某个生产消费者 | tsc 覆盖 `src/` + `tests/` + 根配置,漏了直接红 |

---

## 9 · 等点头(三个问题,都带推荐默认值)

1. **桶的口径**:桶只装 23 个生产契约、测试直接点文件(eslint 给 `tests/**` 开口子)?
   —— **推荐:是**。否则桶要挂 89 个名字,它就不再是「看一眼就知道对外是什么」。
2. **`guards` 的粒度**:按 🔴/🟡/🔵 拆成 `guards` / `traces` / `stream` 三个文件(539/179/166 行)?
   —— **推荐:是**。这三类语义完全不同,且作者已用 emoji 分好类。若嫌碎,可合成一个 884 行的 `guards.ts`。
3. **`Evidence` / `Availability` 的家**:它们被 `pathVerdict`/`planTimeline`/`tripleVerdict`(**非 chat**)消费,
   跟着 `tools.ts` 搬进 `lib/chat` 由桶转出,还是单独抽一个 `lib/evidence`?
   —— **推荐:先跟着搬**(YAGNI:今天只有 3 个非 chat 消费者,且都在判定层;等第四个出现再抽)。

一句「都行」就按推荐执行。
