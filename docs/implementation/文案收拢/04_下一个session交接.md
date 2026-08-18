# 04 · 交接给下一个 session

> 2026-08-18 02:40 写。Frank 拍板:**开新 session,先做第四件 `lib/quiz/`。**
> 本文件只写「接手要知道什么」;已完成部分的细节在 01/02/03 三份文档与 STATUS.md 里。

---

## 1 · 站在哪一格

本轮四件事(Frank 一次性点名),顺序是 **结构 → 命名 → CSS,不许倒**:

| 件 | 内容 | 状态 |
|---|---|---|
| 一 | 文案收进 `lib/i18n/` | ✅ `6ca841d5` |
| 二 | 四个 ui 侧样式对象 → 类 | ✅ `4b6da9e4` |
| 三 | 过度导出清理 | 📋 **清单已出**(`03_过度导出清单.md`),待点头才动手 |
| 四 | `lib/quiz/`(fields + answers + decisions + 桶) | ⬜ **下一件,先出清单** |

**共 8 个提交未推送**(4 个是本轮之前就攒着的)。Frank 08-17 拍板「先不推,这轮结束一起推」——
`4b6da9e4` 没带 `[skip render]`,一推就起 Render 构建,**推之前问一句**。

---

## 2 · 第四件要做什么

建 `lib/quiz/{fields.ts, answers.ts, decisions.ts, index.ts}`,**形状照 `lib/db/`**
(目录名说领域,文件名说角色,外部一律从桶 import 不直接点文件)。

现状:`lib/fields.ts`(476 行)、`lib/answers.ts`(353 行)、`lib/decisions.ts` 三个平级文件。

### 🔴 Frank 点名的两条约束

1. **`profile.ts` 不属于这个簇,别一起搬。**
2. 每步**先出清单,点头再动手**。

### 与第三件的重叠(先做第四件的理由)

`fields`/`answers`/`decisions` 的导出正好落在过度导出清单的第三档(只有 1 个外部消费者)。
**先搬家、再在新目录内部收敛导出**,同一批文件只改一遍。反过来做要改两遍。

### 起手先核的两件事(别照抄本节,自己量一遍)

- `lib/fields.ts` 的 `L` 类型本轮已从 `{ default; 'zh-cn'; ko }` 换成 `Record<Lang, string>`,
  129 处 `l(en, zh, ko)` 调用没动(helper 内部换了返回形状)。搬家时别再动它。
- `QuizUI.tsx` 里那份重复的 `type L` 本轮已删,现在 `export type { L } from '@/lib/fields'`。
  搬进 `lib/quiz/` 后这条 re-export 要跟着改路径。

---

## 3 · 验收工具在哪

**`cms/scripts/render_diff.py`** —— 渲染零变化的 A/B 探针,本轮收进仓库(三轮都在现搭)。
脚本头部写了用法与**四个踩过的坑**(基线不是生产 / 选择器不能用新类名 / 先打 DPR /
先自己比自己)。**不提供弹框模式**,理由也在头部。

第四件是**纯结构搬家**,`tsc` + `vitest`(40 文件 699 测试)就能兜住,未必要跑探针 ——
除非顺手动了 `QuizUI` 的渲染。

---

## 4 · 本轮留下的三笔账(都不是第四件的前置,但别忘)

1. **🔴 一个真 bug,只报没修**:`lib/resumeMatch.ts` 的 `LANG_NAME` 键是 `'zh-cn'`,
   而 `ResumeMatchModal.tsx` 发的是 `'zh'` → **中文用户的简历对照一直在出英文**。
   修法是一行,但**会改线上行为**,与本轮「渲染零变化」的约束冲突,所以留给 Frank 拍。
   详见 `01_文案收进lib-i18n.md` §9。
2. **`prompts.ts` 还没建**。给模型看的东西(`advisor/route.ts` 的 `SYSTEM`/`GROUNDING_RULES`/
   `HEADINGS`、`chatOrchestrate` 的 `SLOT_SYSTEM`、`jdformat`/`resume`/`companyResearch` 的 system)
   本轮只登记不搬 —— 边界写在 `lib/i18n/index.ts` 文件头。
3. **其余 27 张色值表**没动(`MODULE_STYLE`/`TILE`/`TIER_COLORS`/`NOTICE_KIND`/`TAG_VARIANT`…)。
   与 Jobs.tsx 的 chips 同一个病、同一种改法(变体名 → 类),但都是组件 API 改动,一批一批来。

---

## 5 · 工作区状态

- `data/` `etl/` 有一批**非本轮**的未提交改动,一直躺着 —— **提交前 `git show --stat` 核一遍,别夹带**。
- `git stash list` 里有两条**不是本轮的** stash(`autostash` + 别的 session 的 `WIP on main`),没碰。
- dev server 已关。**只准起一个实例**(打爆连接池会导致生产 500)。
