# 05 · 题/答/判收进 `lib/quiz/`(第四件)

> 立项:2026-08-18(Frank 点名,本轮四件里的第四件)
> 前置:第一件(文案收进 `lib/i18n/`)、第二件(ui 样式对象退役)已完工并推送。
> 状态:**已完工(2026-08-18 04:45),已推送** —— `1d438366`(搬家)+ `8fda398b`(收敛导出)

---

## 1 · 背景与范围

`lib/{fields,answers,decisions}.ts` 是**一套机器的三段**:题面(字段库)、答案存储、每个决定取哪几道题。
先前平铺在 `lib/` 顶层,代价有两条,都能量出来:

- 一个页面要它们时得写**三行 import**(`plan/pr/Decision.tsx` 与 `plan/QuizForm.tsx` 各三行)。
- **「哪些名字算对外接口」全靠猜** —— 34 个导出里有 7 个全站没有第二个文件提过。

范围只含 Frank 点名的三个文件。**`profile.ts` 不属于这个簇,没搬**(它是账号档案,不是答题)。

### 为什么和第三件(过度导出清理)一起做

这三个文件的导出正好落在 `03_过度导出清单.md` 的第三档。**先搬家、再在新目录内部收敛** =
同一批文件只改一遍;反过来做要改两遍。**只收了这三个文件的**,第三件其余部分没碰。

---

## 2 · 形状:照 `lib/db/` 与 `lib/pathways/`

```
cms/src/lib/quiz/
  fields.ts     题 —— 字段库(478 行,单一来源)
  answers.ts    答 —— 答案存储(353 行,唯一读写口,页面不直接碰 localStorage)
  decisions.ts  判 —— 每个决定要哪些字段(73 行)
  index.ts      桶 —— 对外接口就是这张表(36 行)
```

目录名说领域、文件名说角色;**外部一律从桶 import,不直接点文件**。
`fields`(题)/ `answers`(答)/ `decisions`(判)并排一读就懂 —— 这正是 CLAUDE.md
「名字的清晰度看它在不在一个能自解释的组里」举的例子本身。

### 🔴 桶不成环(上一轮实踩的坑①)

三个文件之间**一律走相对路径**(`./fields`),不从桶取。从桶取会让 `index → fields → index` 成环,
而 `tsc` 未必报 —— 上一轮的表象是 vitest「40 passed」而实际 41 个测试文件根本没跑起来。

`fields ↔ answers` **今天就已经是环**,但一个方向是 `import type`、运行时擦掉,所以成立。**原样保留没动。**

---

## 3 · 改了哪些调用点

import 路径 **19 行**,分布在 8 个页面 + 2 个测试文件。合并后:

| 文件 | 前 | 后 |
|---|---|---|
| `plan/pr/Decision.tsx` | 3 行 | 1 行(12 个名字) |
| `plan/QuizForm.tsx` | 3 行 | 1 行(4 个名字) |
| `tests/int/answers.int.spec.ts` | 3 行 | 1 行(14 个名字) |
| `jobs/PnpScoreCard.tsx` | 2 行 | 1 行(8 个名字) |
| `jobs/AuthForm.tsx` | 2 行 | 1 行(4 个名字) |
| `quiz/QuizUI.tsx` | `import type` + `export type` 各 1 行 | 只改路径(两种形态不能并) |
| `quiz/EntryQuiz.tsx` / `jobs/TripleVerdictModal.tsx` / `account/page.tsx` / `pnpScoreCardWizard.int.spec.ts` | 各 1 行 | 只改路径 |

**手法**:分两趟,每趟独立可编译 —— 先全局改路径(`tsc` 绿),再合并同源 import 行(`tsc` 绿)。
合并用 python 脚本按**整行匹配**做,不按行内片段处理 —— 这是上一轮 codemod 坑的同一类风险。

### 注释里的旧路径:实际 10 处,不是清单说的 3 处

先出清单时只扫了「有 import 的文件」,漏了 7 处**纯注释引用**。同一类东西(注释里的旧路径,零行为),
修 3 处留 7 处烂着更没道理,一次改全:

`PnpScoreCard.tsx:204` `Decision.tsx:120,164` `QuizForm.tsx:5` `EntryQuiz.tsx:8` `QuizUI.tsx:15`
`api/account/answers/route.ts:6` `api/auth/google/callback/route.ts:96` `collections/Users.ts:93`
`tests/int/answers.int.spec.ts:170`

---

## 4 · 导出收敛(第三件的这一片)

判据是 CLAUDE.md 那条:**只有一个消费者的东西不该导出,更不该住进共享叶子。**
34 个导出逐个数过消费面,分三类:

| 类 | 处置 | 个数 | 名字 |
|---|---|---|---|
| 零外部消费者 | **去掉 `export`,代码不删** | 7 | `Tier` `Question` `FieldDef` `UNSURE_BAND` `PROVS` `SCORE_ANSWERS_KEY` `Decision`(类型) |
| 只有模块内消费者 | 留 `export`(邻居要用),**但不进桶** | 2 | `provsFromBand` `bandFromProvs` |
| 对外 | **进桶** | 23 | fields 4 + answers 13 + decisions 6 |

两处需要留痕的判断:

- **`decisions.ts` 的 `Decision` 类型**:全站 `Decision` 的命中全是 `plan/pr` 那个**同名组件**,与它无关。
  这个同名撞车本身就是它该收起来的理由。
- **`DECISIONS` / `batchLeadsFree` / `KNOWN_NO_FREE_LEAD`** 目前**只有测试在用**。保留并进桶 ——
  测试也从桶取,桶就是它们唯一的门。

### 按规矩**没**动的一处

`CLB` / `EMPTY` / `clearAnswers` / `writeScoreAnswers` / `ScoreAnswers` / `Stage` 各只有 **1 个**外部消费者。
按过度导出清单 ③ 的第 2 条,「本来就住在自己领域里的 → 只去 `export`,不搬家」——
而它们要对外,所以两样都不做。**不搬进消费者**:字段库就是它们的家。

---

## 5 · 验收

| 闸 | 结果 |
|---|---|
| `tsc --noEmit` | 绿(搬家后、收敛后各跑一次) |
| `vitest` | **40 文件 / 699 用例全过**,与基线同数 —— 不是坑①那种「文件没跑起来」的假绿 |
| `npx eslint --quiet` | **1 个 error,零新增** |
| `npm run build` | ✓ Compiled successfully |
| 渲染探针 | **没跑**(纯结构搬家,不动渲染,Frank 批的) |

### eslint 那个 error 是既存的 —— 按上一轮的坑②比过基线

`Decision.tsx` 的 `react-hooks/preserve-manual-memoization`。**`git stash` 前后各跑一遍**:
基线报在 `:242`,本轮报在 `:240` —— 差的 2 行正是并掉的两行 import。**不是我引入的。**

> 判法固化:eslint/探针有差异时,先问「对面是哪个版本」。生产不是基线,`git stash` 前后同一个进程才是。

---

## 6 · 留下的账

1. **🔴 `lib/resumeMatch.ts` 的 `LANG_NAME` 键是 `'zh-cn'`,`ResumeMatchModal.tsx` 发的是 `'zh'`**
   → 中文用户的简历对照一直出英文(韩文碰巧对得上)。修法一行,**会改线上行为,仍等 Frank 点头**。
   本轮问过一次,回的是「开工」——那是对第四件的授权,不是对这个是非题的回答,所以**没改**。
2. **第三件其余部分**:1131 个导出里 193 零消费、456 只有一个消费者。本轮只收了 `lib/quiz/` 这三个文件。
3. **`prompts.ts` 还没建**(第一件留下的账,边界写在 `lib/i18n/index.ts` 文件头)。
4. **其余 27 张色值表**没动(第二件留下的账)。

---

## 7 · 🔴 部署那个坑,这次是踩在「写别再踩」的提交上

上一轮为救回部署补了 `785e98ac`,标题是「只看 push 的 HEAD —— 压在代码提交上面会跳过整次部署」。
**它的标题里必须出现那个跳过标记的字面量**(因为它就是在讲这个坑),而 Render 对整条 commit message
做**子串匹配**,不区分你是在用它还是在说它 → **救回的提交把自己跳过了**,生产继续停在 `4eeae2cb`。

本轮补 `4a651b7c`(空提交,消息里不出现该字面量)重新触发。

**规矩要改写**(`docs/README.md` + 记忆):不是「纯文档提交带标记」,也不只是「HEAD 不许带」,而是
**commit message 里不许出现该字面量** —— 否则以后每次写文档解释这个坑,都会再触发一次。
描述它时写「跳过标记」,别写标记本身。

换版验证一律 `curl https://offer2pr.com/api/version` 比 SHA,别拿页面指纹或 CSS 字节数猜(误报过两次)。
