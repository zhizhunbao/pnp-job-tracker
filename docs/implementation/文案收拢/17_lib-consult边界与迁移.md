# 17 · 新域 `lib/consult` 的边界,与三个老域怎么配合

> 2026-08-19。Frank:「新 domain 要考虑好边界,如何和老的 domain 配合。」
> 前置:[15 号](15_lib-chat换编排走pi.md)(为什么换派发)、[16 号](16_lib-chat域重构.md)(七件套定型)。
> **本文只判边界与迁移顺序,不含实现。**

---

## 0 · 一条总规则

> 🔴 **依赖只能指向「活得更久的」那个。**

这一条决定了下面所有安排。它的反面是本批最贵的错误:让**要活下来的新域**去依赖**注定被删的老域** ——
那样每删老域一个文件,新域就得改一次,删除从「移走一个目录」变成一次大手术。

---

## 1 · 四个域各是什么

| 域 | 是什么 | 寿命 | 消费者 |
|---|---|---|---|
| `lib/llm` | **无工具的一发调用**:翻译、摘要、改写、简历抽取 —— 进一段话出一段话 | 长期 | **14 处**(advisor、四个翻译、简历匹配、新闻摘要、公司调研) |
| `lib/agent` | **pi 循环的壳**:怎么跑一个带工具的多轮循环 | 长期 | 现在 1 处,之后是 `consult` 的地基 |
| `lib/consult` | **对话本身**:跑什么工具、事实怎么渲染、答复怎么过闸 | 长期,**最终唯一的对话域** | `/api/chat` |
| `lib/chat` | 旧链 5091 行 | **注定删除** | `/api/chat`(过渡期) |

**边界不按「哪个模型」切**(那条 08-19 已作废:两边现在都能走同一台 qwen),按**两刀**切:

1. **有没有工具循环** —— 没有 → `lib/llm`;有 → `lib/agent` + `lib/consult`
2. **是「怎么跑」还是「跑什么」** —— 怎么跑 → `lib/agent`;跑什么 → `lib/consult`

---

## 2 · `lib/agent` 升格成壳,**一行都不浪费**

Frank 2026-08-18 夜里写的这 1025 行,原本只服务一件事(旧链抽不出职业码时兜一次底),
默认 env 还关着。**本批不删它,反过来让它当地基** —— 因为我写新循环时抄的就是它:

| 我在 `consult` 里抄的 | `lib/agent` 的原件 | 处置 |
|---|---|---|
| `passThroughMessages` | 逐字相同 | **删我抄的,从 agent 取** |
| `cleanProvs`(省码白名单) | 逐字相同 | 同上 |
| `acceptNoc` / `inCandidates`(码必须在候选里出现过) | 逐字相同 | 同上 |
| 查候选的 SQL + `NOISE_RATIO` 噪音过滤 | 逐字相同 | 同上 |
| `say()` 工具回执 | 逐字相同 | 同上 |
| `Inbox` 收件箱 + 超时 abort | 同一套 | 同上 |
| `model()` | 只差协议名 | agent 的加一个协议参数 |

⚠️ **这翻掉了 14 号 §1 的一条判定。** 那里判「pi 壳那 40 行不收拢」,前提是两个域**各活各的**,
为一个字符串盖房子不划算。现在前提变了:一个域给另一个当地基,**重复是真的,收拢有回报**。

**`lib/agent` 不算「平级的域」,算基础设施** —— 同 `lib/db`(SQL 的家)、`lib/location`(省码的家)。
所以 `consult → agent` 是**叶子依赖**,不违反「域之间不互相借取数函数」那条。
判据:agent 回答的是「怎么跑一个循环」,与移民业务无关;把它换掉,业务一个字都不用改。

`resolveByAgent` **原样保留**:它是 agent 自己的入口,新链不用它也不动它。

---

## 3 · 依赖方向(唯一合法的一张图)

```
lib/chat (将死) ──▶ lib/consult (幸存) ──▶ lib/agent (壳) ──▶ lib/db · lib/log · lib/error · lib/i18n (叶子)
```

- 🔴 **绝不允许 `consult → chat`。** 这是 §0 那条总规则的直接推论。
- 过渡期是**旧的依赖新的**:老 `chat` 反过来从 `@/lib/consult` 桶取幸存件。
  旧 chat 每删一个文件,consult 桶就少一行导出;删到最后,桶自然收敛成真正的对外面。
- 无环:`chat → consult → agent`,没有任何一条回边。`import/no-cycle` 那道闸(08-19 立)守着。

---

## 4 · 哪些是「幸存件」,先搬它们

**2982 行**要活下来,它们必须**先**进 `consult`,再谈别的:

| 文件 | 行 | 为什么活 |
|---|---|---|
| `tools.ts` | 1141 | 10 个 lookup —— 数字与判定的唯一来源 |
| `facts.ts` | 653 | lookup 结果 → `Fact`(四态、证据 URL、三语标签) |
| `guards.ts` | 520 | 出口硬拦,每一道对应一次生产事故 |
| `traces.ts` | 173 | 出口留痕(软检查) |
| `wording.ts` | 156 | 单位、标记、长度上限 |
| `stream.ts` | 153 | 逐句门、`factSheet`、按句截断 |
| `reportFacts.ts` | 112 | `tools` 的下层取数 |
| `types.ts` | 74 | 契约 |

**注定删的**(1962 行):`orchestrate` 派发分支、`slots` 抽槽、`federal` 六组正则、
`cards` 手写并发、`answer` 的 prompt 拼装与预算压缩、`followups`、`normalize`、`steps`、`log`、`index`。
其中 `answer.ts` 的 RULE 与 PLAYBOOK **已经搬进 `consult/prompts.ts`** 了(见 15 号 §3.1)。

---

## 5 · 迁移顺序(每一步跑完四道闸才走下一步)

| 步 | 做什么 | 结束时的状态 |
|---|---|---|
| **P1** | 幸存件 2982 行搬进 `consult` 的七件套(**纯移动,不改逻辑**);老 `chat` 改从 `@/lib/consult` 桶取 | 两个域并存,行为一字不变,`/api/chat` 仍走旧链 |
| **P2** | `consult/functions.ts` 里抄 agent 的那七样删掉,改从 `@/lib/agent/server` 取;agent 的 `model()` 加协议参数 | 新循环接上地基,重复归零 |
| **P3** | `/api/chat` 加 `CHAT_PI=1` 开关切新链,旧链原地不动 | 可随时回退 |
| **P4** | 金标批 + 真实 200 条问句两条链对跑(降级率、报错率、耗时) | 拿到数才决定 |
| **P5** | 新链赢 → 删 `lib/chat` 整个目录 + 撤 `rescueOcc` 注入边;没赢 → 关开关继续调 | — |

**测试**:16 个 chat 专属 spec 里,测幸存件的那些(`chatTools` 31 条、`chatGuardAttr`、`chatVerdict`、
guards 那批)**只改 import 路径**;测派发的那些(`chatGate` / `chatStall` / `chatPreset1-3` / `chatContext`
/ `chatCure` / `chatFederal`)在 P5 随旧链一起退役,金标批 `chatEval` / `chatGold` **改指新链,分数不许掉**。

---

## 6 · 命名

`consult` 说的是「它干什么」(咨询),不是「它长什么形式」(chat 说的是 UI 形态)。
P5 删掉老 `chat` 之后要不要改名回 `chat`,那时再定 —— 是一次 sed 的事,不值得现在纠结。

**eslint**:`cms/eslint.config.mjs` 的 `BARRELS` 要加 `consult` 一行(桶闸)。
**不开 `server` 门**:判据同 14 号 §2,擦掉连库那半之后 index 里只剩类型 = 空壳。
