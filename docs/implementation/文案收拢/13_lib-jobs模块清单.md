# 13 · `lib/jobs/` 模块清单与落地

> 2026-08-18。起因:Frank 问「jobsSql 有一堆数据库查询函数,是不是需要一个数据访问层 / service 层 / job 目录」。
> 前两问的答案是**都已经有了**(见 §1);第三问要量,这份就是量出来的结果。
> 状态:**清单 + 已落地(同日完工,见 §6)**。用的尺子是 `06_过度导出清单-ts侧.md` §8 那把(「有多少调用点同时引 ≥2 个成员」)。

---

## 1 · 先说两个已经存在的层(别重复建)

| 层 | 在哪 | 现状 |
|---|---|---|
| 数据访问 · 通用 | `lib/db/database.ts`(67) + `lib/db/sql.ts`(860) | SQL 文本**真收拢了**:45 个文件从 `db/sql` 取语句 |
| 数据访问 · 职位域 | `lib/jobsSql.ts`(743) | 文件头自称 DAL;SQL 已下沉,自己只剩取数 + 行映射 |
| service | `lib/` 那 60 个域文件 | 20,926 行 vs 30 个 API 路由合计 3,231 行 —— 业务的重量早在 lib 这边 |

**两处已知的歪**(不在本清单范围,单列):

- `lib/db/database.ts` 的「通用 CRUD」段现在**只剩横幅没有代码**:`select` / `selectOne` / `dbOrNull`
  在第 2 批死代码清除(`ba057f84`,78 行删到剩 2 行)里按零消费者删掉了,而 `Db` 的注释还写着
  「用下面 `select<R>()` 那组助手」—— **悬空引用**。文件头那句「收成这里之后只剩本文件一处」也与现状不符:
  `dbOf`/`getDb` 全站只有 **2 个**运行时消费者,`(payload.db as any).pool` 还在 **40 个文件 49 处**。
  取池那一半从没迁过来。**先改注释说实话,迁不迁另议。**
- `api/advisor/route.ts`(453 行)里住着 `SYSTEM` / `GROUNDING_RULES` / `buildPrompt` /
  `jobFacts` / `scoreFacts` —— 提示词与事实拼装是 service 件;`api/profile-pathways/route.ts`
  **从路由 export 判定函数**,唯一外部消费者是测试(层次倒置)。

---

## 2 · 用同一把尺子量三个候选族

「同时引 ≥2 个成员的调用点数」= 建桶之后真正被合并掉的 import 行。对照基准:
`lib/chat` 当初是 **7**,而 employer/plan/score/resume **全是 0**(所以只收了 chat)。

| 候选族 | 成员 | 同现 ≥2 的调用点 | 判定 |
|---|---|---|---|
| **职位** | jobsSql · match · matchDims · jobDescription · jdLazyFetch · source(+ location · lmiaStatus 待定) | **15** | **成立**(是 chat 的两倍） |
| 雇主 | designatedEmployers · sponsorEmployers · employerCompare(+Shared) · employerVerdict · designationMatch · companyResearch | **1** | 不成立 —— 同 06 号那四个,只有代价没有回报 |
| 职业 | noc · occName · occCompetition · quizTop · rankings · directory | **0** | 不成立 |

最强的一对是 `jobsSql` + `match`(**7 个调用点**同时引);其次 `location`+`noc`(5)——
注意后者跨族,正是 `location` **不该**进职位模块的证据(它是全站地点单一来源,不是职位专属)。

合计能少写 **19 行 import**;最肥的两个调用点:`api/advisor/route.ts` 4 行并 1,`api/alerts/run/route.ts` 3 行并 1。

---

## 3 · 建议形状(**一个文件都不切**)

```
lib/jobs/
  index.ts      桶
  queries.ts    ← jobsSql.ts(743,原样改名不切)
  match.ts      ← match.ts(318)
  dims.ts       ← matchDims.ts(22)
  jd.ts         ← jobDescription.ts(33)+ jdLazyFetch.ts(152,唯一消费者就是前者)
  source.ts     ← source.ts(17)
```

**为什么不切 `jobsSql`**:它内部只有 3 段(筛选→WHERE / 列集与映射 / 查询函数),
切开之后找「筛选参数怎么变成 WHERE」还是翻一个文件跳一段 —— 读的人没少翻。
同 `db/sql.ts` 860 行一个文件,是设计不是欠账。**目录成立的理由是收编兄弟,不是切大文件。**

**不进的两个**,理由都是数据:
- `location`(45,8 个消费者)—— 与 `noc` 同现 5 次,是全站地点单一来源,不是职位专属;
- `lmiaStatus`(39)—— 唯一消费者是 `jobs/Advisor.tsx`,而口径属雇主侧。

依赖是**单向树,不成环**:`jobsSql → match`、`matchDims → match`、`jobDescription → jdLazyFetch`。

---

## 4 · 两个要你拍的决定

**① 桶转发 44 个名字,接受吗?**
`jobsSql` 25 个导出、`match` 13 个 —— 而且**每一个都真有模块外的消费者(25/25、13/13),没有一个是过度导出**。
所以 44 不是松,是职位域本来就是这个站的主干。但 `lib/chat` 的桶只有 23 个,
「看一眼知道对外是什么」这条在 44 个名字上要打折。两条路:照收 44,或者先按消费者数排一遍、
把只有 1 个消费者的名字留在模块内(需要额外一轮量)。

**② `JobRow` 搬不搬进来?**
`jobsSql.ts` 与 `source.ts` 都从 `@/app/(frontend)/jobs/types` 取 `JobRow` —— **lib 反向依赖 app**,
搬进 `lib/jobs/` 之后这条边更刺眼。搬进来正好命中 `types.ts` 的两条判据(多个平级文件共用 +
没有更自然的宿主),但会牵动 app 侧那个同名目录里的既有引用。

---

## 5 · 施工顺序与风险

1. `git mv` 六个文件 + 建桶(纯搬家,内容零改);模块内部一律相对路径,**不从自己的桶取**(`lib/quiz` 那条)。
2. 外部调用点改成 `@/lib/jobs`(15 个调用点,19 行并成 15 行)。
3. `eslint.config.mjs` 的 `BARRELS` 加 `'jobs'`。
   ⚠️ **app 那边有同名的 `(frontend)/jobs/` 页面目录**(和 `quiz` 一模一样的坑)——
   相对模式已限定在 `src/lib/**` 下,复核一遍别误伤 `../jobs/Table` 这类页面内引用。
4. 验收照旧三道闸(tsc / vitest 按用例全名对拍 / eslint 数字比对)。**测试只有 1 处**引 `jobsSql`
   (`tests/int/jobsSearch.int.spec.ts`),而且边界闸对 `tests/**` 开口子,不受影响。
5. 顺带收的:`jobsSql` 这个名字**说谎**(里面几乎没有 SQL,SQL 在 `db/sql.ts`),改名一起做掉。

**这是支线** —— 不推进「有人真的掏钱」。判据见 `docs/主线与支线-20260801.md`:
它的价值是给后面每次改动打折,不是这一轮的收入。

---

## 6 · 落地记录(清单出完当场开工,同一天完工)

Frank 在清单之后拍了两条,把 §4 的两个决定一次结掉:

1. **「lib 下面只包含 ts,tsx 都放到 frontend 下面的 jobs」** —— 组件永不进 lib(复核:`src/lib` 下本来就 0 个 `.tsx`)。
2. **「函数和类型都搬过来 lib,展示的都留在原地」** —— 于是形状按**数据 / 展示**分家,不是按「谁在用」。

### 实际形状(与 §3 的两处出入,都写在这儿)

```
lib/jobs/
  index.ts    35   桶,60 个名字(44 个函数/常量 + 16 个形状)
  queries.ts  742  ← jobsSql.ts(原样改名,一行没切)
  match.ts    317  ← match.ts
  dims.ts      21  ← matchDims.ts
  jd.ts        32  ← jobDescription.ts
  jdFetch.ts  151  ← jdLazyFetch.ts
  types.ts    149  ← 原 app/(frontend)/jobs/types.ts 的**全部** 16 个形状(那个文件已删)
```

- **出入①:`jd` 与 `jdFetch` 没有合并**(§3 原打算并成一个)。搬家与合并分开做 ——
  出问题时能分清是谁。**收敛照做了**:`lazyFetchJd` 不上桶(唯一消费者就是 `jd.ts`)。
- **出入②:多了 `types.ts`,而且 `app/(frontend)/jobs/types.ts` 整个删掉了。**
  第一版按「数据 / 展示」把 16 个形状分了家(数据归 lib、`ColKey`/`FieldGroup`/`Plan` 留页面),
  Frank 当场问「frontend jobs 下面怎么还有 types.ts」—— **形状分两处,「去哪找」本身就成了一件要记的事**。
  改成职位域的类型只有一个家:16 个全进 `lib/jobs/types.ts`,页面那边一个类型文件都不留。
  分类还在,只是在同一个文件里分段:数据形状(`queries.ts` 的行映射产出的)在前,
  展示形状(说「怎么摆」、库里没有对应一行的那三个)在后。

### 桶为什么是 60 个名字

44 个函数/常量(`queries` 25 + `match` 13 + `dims` 1 + `jd` 2 + `source` 3)+ 16 个形状。
**量过:25/25、13/13 都真有模块外消费者,没有一个是过度导出** —— 职位域是站的主干,对外面就是这么大。

### 数字

| | 之前 | 之后 |
|---|---|---|
| 调用点的 import 行(对外) | 40 | **33** |
| `app/(frontend)/jobs/types.ts` | 139 行 16 个形状 | **文件已删** |
| 职位相关的 `lib` 反向 import `app` | 4 处 | **0** |

全站 `lib → app` 只剩 1 处,且与职位无关:`rankings.ts` 从 `rankings/Ranking.tsx`(一个 `use client`
组件)取 `RankRow` —— **和 `JobRow` 当年一模一样的倒置,只是这一处没治**。单独一件事。

### 收尾三件

- `eslint.config.mjs` 的 `BARRELS` 加 `'jobs'`;实测**绕过桶 0 处**。
  ⚠️ app 那边同名的 `(frontend)/jobs/` 页面目录没被误伤(相对模式只在 `src/lib/**` 下生效,同 `quiz` 那条)。
- **注释里的旧路径 21 处一次改全**(`lib/jobsSql` → `lib/jobs/queries` 等)—— `lib/quiz` 那轮的教训:
  漏的都是纯注释引用,而它们是决策记录。
- `git mv` 六个文件,git 认出来是 rename(历史不断)。

### 验收

| 项 | 基线 | 本轮 |
|---|---|---|
| `tsc --noEmit` | 0 | **0** |
| `vitest` | 699 / 694 过 / 5 败 | **逐条相同**(按用例全名比集合,新增失败 0) |
| `eslint .` | 561 problems / 1 error | **561 / 1** |

51 个文件、+391 / −424 行。纯结构搬家不动渲染,按既有惯例没跑探针。

### 🔴 抢修记录:一个正则差点把 lib/chat 全改坏

收口那步的正则写成了「所有 `from './types'`」,而 `lib/chat`、`lib/pathways`、`lib/quiz` **各自都有
`types.ts`** —— 一跑就把 28 个文件的 `./types` 指到了职位桶上。`tsc` 当场红,靠 `git diff` 逐对
(旧行、新行)只回滚**模块说明符**修回来(不能整行还原:那些行里有本轮真改动,如 `facts.ts` 的 `SlotClaim`)。
教训:**批量改 import 的正则必须锚定完整路径**,`./types` 这种在带桶的仓库里是通配符不是标识符。
