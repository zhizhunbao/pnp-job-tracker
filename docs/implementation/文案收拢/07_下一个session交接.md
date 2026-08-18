# 07 · 交接给下一个 session

> 2026-08-18 晨写(接 [04_下一个session交接.md](04_下一个session交接.md))。
> **下一件事:第 1 批 163 个去 `export` + 10 行 eslint 边界规则。清单已出,只等 Frank 点头。**

---

## 1 · 站在哪一格

| 件 | 内容 | 状态 |
|---|---|---|
| 一 | 文案收进 `lib/i18n/` | ✅ `6ca841d5` |
| 二 | 四个 ui 侧样式对象 → 类 | ✅ `4b6da9e4` |
| **四** | **`lib/quiz/`(题/答/判 + 桶)** | ✅ `1d438366` + `8fda398b`,**已上线** |
| 三 | 过度导出清理 | 📋 **.ts 侧清单已出**([06 号](06_过度导出清单-ts侧.md)),待点头 |

**生产已换版**:`/api/version` → `8fda398b`(2026-08-18 04:46 确认)。积压的 10 个提交全部上线。

---

## 2 · 下一件要做什么

### 第 1 批:163 个去 `export`(零风险)

清单在 [06 号 §3](06_过度导出清单-ts侧.md)。**重跑取数**(数字会随代码漂,别照抄):

```bash
cd cms && python scripts/scan_exports.py src /tmp/exports.json
# consumers==0 && local>0  → 就是这一批
```

零风险的意思:这些名字在自己文件里还在用,只是不该对外。去 `export` 行为零改动,`tsc` 全程绿。
兜底 `tsc` + `vitest`(**40 文件 699 用例**,核数字别只看 "passed")。

### 顺手加 10 行 eslint 边界规则

`no-restricted-imports` 拦「绕过桶直接点文件」。现在只有 **1 处**绕过,所以这是**保险不是救火** ——
但存量清完后 `no-unused-vars` 才有机会从 `warn` 升成 `error`,闸门才真的合上。

⚠️ 加规则前先看 [eslint.config.mjs](../../../cms/eslint.config.mjs):
六条 `react-hooks/*` 是**故意降成 warn** 的(「73 条一次性红着,结果只会是没人再跑 lint」),别动它们。

---

## 3 · 🔴 第 2 批里有 4 个先当 bug 查,不是清理

`initialLang`(`lib/i18n/index.ts`)、`FREE_RESUME_TRIES`、`FREE_SCOREDETAIL_TRIES`(`lib/plan.ts`)、
`PATHWAY_RECIPES`(`lib/pathwayRecipes.ts`)—— **零消费者且本文件内也不用**。

它们带业务含义(首访语言判定、免费额度)。`initialLang` 的注释里还挂着 2026-07-24 的拍板理由
(首访语言跟浏览器走、红线不许按 IP 判)。**一条有拍板记录的逻辑没人调用,
该先问「它是什么时候、被什么改动断掉的」,而不是删掉它。**

---

## 4 · 拍板记录(这轮讨论出来的,别再重复推导)

| 决定 | 内容 |
|---|---|
| **重构顺序** | **先 `.ts` 后 `.tsx`** —— 依赖方向 74:5、`.ts` 验收便宜 |
| **模块模板(方案 B)** | `index.ts` **必选**;≥1 个关注点文件 **必选**;`types.ts` **按判据可选**;**不建 `json.ts`** |
| **下一个桶** | **`lib/chat/`,且只有它** —— 判据是「多少调用点同时引 ≥2 个成员」:chat 7,其余四簇全 0 |
| **chat 的顺序** | 与 `lib/quiz` **相反**:先去 `export` 收窄边界,再谈拆(3488 行,边界现在看不见) |

`types.ts` 那条讨论过三轮,结论固定下来了 —— **Java 抽 model 有一半是「一个文件一个 public class」
这条语法逼的,不是架构判断**;Java 也不给单一使用者的形状单开文件(用 nested/package-private)。
本项目的做法与 Java **一致**:`PathwayStrategy` 被 14 个平级文件共用 → 抽出去;
`FieldDef` 只被 `FIELDS` 用 → 留在原地。

---

## 5 · 工具

| 工具 | 用途 |
|---|---|
| **`cms/scripts/scan_exports.py`** | 导出消费面扫描(本轮落盘)。头部写了用法、分档处置、**四个坑** |
| `cms/scripts/render_diff.py` | 渲染零变化 A/B 探针。**第 1 批不动渲染,不必跑** |

🔴 **`scan_exports.py` 那四个坑每一个都会把「在用的」算成死代码**,初版全踩过。
**验收别拿 grep 验 grep** —— 多行 import 逐行抓不到;全文 grep 又会把同名不同模块的混算
(本仓有两个 `OccRow`、两个 `DrawRow`、两个 `PROV_NAMES`)。

---

## 6 · 还压着的账

1. **🔴 `lib/resumeMatch.ts` 的 `LANG_NAME` 键是 `'zh-cn'`,`ResumeMatchModal.tsx` 发的是 `'zh'`**
   → 中文用户的简历对照一直出英文。**改一行,但会改线上行为,仍等 Frank 点头**。
   这轮问过一次,回的是「开工」——那是对第四件的授权,不是对这个是非题的回答,所以**没改**。
2. **`prompts.ts` 还没建**。`advisor/route.ts` 453 行(全站最胖的 route handler)里躺着
   `SYSTEM`/`GROUNDING_RULES`/`HEADINGS`;`companyResearch.ts` 里有 `SYSTEM`。
   **建 `prompts.ts` 同时就是给最胖的 route 减肥。**
3. **其余 27 张色值表**没动(`.tsx` 侧,排在 `.ts` 之后)。
4. **`app/api/alerts/run/route.ts` 279 行** —— 定时任务的执行体住在 route 里,逻辑本该在 `lib/`。

---

## 7 · 工作区

- `data/` `etl/` 有一批**非本轮**的未提交改动,一直躺着 —— **提交前 `git show --stat` 核一遍,别夹带**。
- dev server 没起过(3000 端口无监听)。**只准起一个实例**(打爆连接池会导致生产 500)。
- 🔴 **部署那个坑第四次是栽在「写别再踩」的提交自己身上** —— Render 对**整条 commit message**
  做子串匹配,不区分你是在用那个跳过标记还是在说它。规矩已改写进
  [docs/README.md](../../README.md) 与记忆:**commit message 里不许出现该字面量**,
  要描述就写「跳过标记」。写进**文件**内容里没事。
