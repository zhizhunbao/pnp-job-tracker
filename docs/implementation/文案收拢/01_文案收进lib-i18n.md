# 01 · 文案收进 `lib/i18n/`

> 立项:2026-08-17(Frank 点名,本轮三件里的第一件,最大一件)
> 依据:CLAUDE.md「给人看的文案只有一个家:`lib/i18n/`」+「代码组织约定」
> 状态:**已完工(2026-08-18 01:00),未推送**

---

## 1 · 背景与范围

文案今天散在 39 个文件里,每处都自称「单一来源」。这不是整不整齐的问题 ——
**判据是「加一门语言要改几个地方」,今天的答案是 39**。

### 范围内(Frank 三次拍板确定)

| 决策 | 拍板 |
|---|---|
| 文件怎么分 | **按领域分 7 个**(不是 4 个;主字典 2216 键横跨 94 个前缀,叫 `jobs.ts` 名不副实) |
| 移民事实类译名 | **进,不分文件**(`officialLabels` 75 条、13 个通道名、闸名、案例库并进对应领域文件) |
| `fields.ts` 的第二套语言约定 | **这轮统一成 `Record<Lang, string>`**(129 处 `l(en, zh, ko)` 全改写) |

### 范围外(点名不做,别顺手)

- `collections/*.ts` 的 44+ 处中文 —— 全是 `admin.description`,**给 Frank 自己看的后台**,不是用户文案。
  (顺带记一笔:这些 collection **一个 `label` 都没有**,admin 面板事实上锁死中文。要按 Payload 规范整是另一件事。)
- `payload-types.ts` —— `payload generate:types` 的生成物,任何情况下不手改。
- **提示词**(给模型看的):`advisor/route.ts` 的 `SYSTEM`/`GROUNDING_RULES`/`chatSystem`、
  `chatOrchestrate.ts` 的 `SLOT_SYSTEM`、`jdformat/route.ts` 的 `PROMPT_HEAD`、
  `resume/route.ts` 的 `EXTRACT_SYSTEM`、`companyResearch.ts` 的 `SYSTEM`。
  **它们归 `prompts.ts`,不进 i18n** —— 用户永远看不到,也不需要翻译。本轮只登记不搬。
- **模型输出的检测器**:`AVAIL_MARKERS`/`VERDICT_MARKERS`/`SCRIPT_RE`/`COVERAGE_WORD`/
  `HEDGE_WORDS`/`LEN_CAP`/`LANG_NAME` —— 按语言分叉,但**不是文案**,是校验规则,留在 `chatOrchestrate.ts`。

---

## 2 · 实测前提(动手前先核,别照抄本节)

全部由 `scratchpad/*.py` 实测,不是印象:

| 数 | 值 | 怎么测的 |
|---|---|---|
| 加一门语言要动的文件 | **39** | 扫「按语言分叉」的六种写法 |
| 主字典规模 | zh 1111 行 / en 1064 / ko 1057,**2216 键** | 按行区间取键 |
| 主字典键差 | **0** | `zh−en`=0、`zh−ko`=0;唯一不对称的 `cat.IT` 是 en/ko 有 zh 无(zh 那边源值本来就是 "IT") |
| 一行装多个前缀的行 | **25**(三语共 75) | 迁移时要手拆的就这些 |
| 主字典的 import 路径写法 | **6 种**(`../jobs/i18n` 20 次、`./i18n` 14、`../../jobs/i18n` 7、`./jobs/i18n` 4、`@/app/…` 3、`../i18n` 3),共 51 个文件 | |

### 🔴 两条与「已知漏翻」的说法不符(实测推翻)

- **`LBL` 没有漏翻**:`LabelDict` 57 行**零可选字段** → 漏一条今天就已经是 tsc 红。
  三语块字段数 81/84/81,差的 3 个是 en 独有的冠词处理,不是缺翻。
- **法务四页没有漏翻**:章节数与逐节段落数三语完全相同(privacy `[9,1,1,2,1,1,1]`),
  en/ko 块里**零个中文串**。

### 🔴 真正的窟窿只有一处

`lib/officialLabels.ts` 的类型是 `{ zh?: string; ko?: string }` —— **两个字段都可选**,于是
**75 条里 54 条没有 ko**。`officialLabel()` 缺译时回退官方英文原文。

**这 54 条要 Frank 判**:是漏翻,还是「宁可显英文,不让模型现编译名」的既定回退
(`pnpSelfScore.ts:30` 那条注释就是这么写的)?**清单在 §7,我不自己补翻译。**

---

## 3 · 方案

### 3.1 目标形状

```
cms/src/lib/i18n/
  index.ts    桶 —— Lang / LANGS / TFn / makeT / cookie 与首访判语 / Domain<> 类型 / MESSAGES 合并
  report.ts   判定 · 报告 · 评分     ≈ 870 键   (Decision / TripleVerdictModal / PnpScoreCard / ScoreLineCard / Case)
  jobs.ts     职位板 · 详情 · 弹框   ≈ 660 键   (Jobs / Table / Advisor / Company / Jd / Pnp / Job)
  site.ts     站级外壳与其余页面     ≈ 490 键   (Header / Pulse / News / Timeline / Pricing / Account / Employers / Stats)
  quiz.ts     答题 · 档案            ≈ 100 键 + 129 条题面
  chat.ts     对话 · AI 顾问         ≈  80 键 + chatOrchestrate 的 16 个见客字典
  legal.ts    法务四页 · 页脚        ≈   7 键 + 4 篇长文
```

**归属不是拍脑袋定的,是按调用点定的** —— 每个前缀扫 `t('pre.…')` 的静态调用点,票多的页面就是它的家。
四个没有静态调用点的(`pv` 72 / `pw` 60 / `stream` 19 / 无前缀 11)按**产出方**归:
`pv.*` 由 `lib/pathVerdict.ts` 产、`pw.*` 由 `lib/pathwayRecipes.ts` 产 → 都进 `report.ts`。

### 3.2 类型强制(核心)

每个领域文件同一个骨架 —— **zh 是母本,其余语言按它的键强制对齐**:

```ts
const zh = { 'rpt.p.best': '…', 'rpt.c.qc': '…' } as const
export const report: Domain<typeof zh> = { zh, en: { … }, ko: { … } }
```

`Domain` 住在桶里,是整套机制的唯一一处声明:

```ts
export type Lang = 'zh' | 'en' | 'ko'
/** 一个领域的三语字典:zh 是母本,其余语言逐键对齐。
 *  漏一条 = tsc 红(缺 key);多一条 = tsc 红(超额属性);
 *  加一门语言 = 只改上面这行 Lang,tsc 会把 7 个领域文件逐个点名。 */
export type Domain<Z extends Record<string, string>> = Record<Lang, Record<keyof Z, string>>
```

**说清楚一件事:「加一门语言只改一个地方」字面上做不到** —— 新语言的 2216 条译文总得写在某处。
可达成的是它的实质:**只改一处声明,其余由编译器逐条点名**。这正是 CLAUDE.md
「三语对齐靠类型强制,漏翻就是 tsc 红」的原话,也是不写检查脚本的理由。

### 3.3 合并不枚举语言

```ts
const PARTS = [report, jobs, site, quiz, chat, legal]
const MESSAGES = Object.fromEntries(
  LANGS.map(({ code }) => [code, Object.assign({}, ...PARTS.map((p) => p[code]))]),
) as Record<Lang, Dict>
```

加语言时这里**一个字不用改**。

### 3.4 明确不做的

- **不把 `t()` 的 key 做成联合类型**。2216 键的联合会拖垮 tsc,而且大量调用点是动态拼的
  (`t('pv.gate.' + k + '.met')`、`streamDisplay`、`catName`),做成联合会直接编不过。
  `t(key: string)` 维持原样。
- **`lib/i18n/` 一律不带 `'use client'`**。服务端 `page.tsx`(SSR 首帧语言、`generateMetadata`)
  也 import 它 —— 老坑 6:服务端组件从 `'use client'` 模块导入常量会拿到 `undefined`。

---

## 4 · 任务清单

- [x] **T1 建桶** `lib/i18n/index.ts`(102 行)—— `Lang`/`LANGS`/`TFn`/`makeT`/cookie 四件 + 新增 `Domain<>`;
      `COLS_COOKIE` 挪进新建的 `jobs/columns.shared.ts`(`.shared` 是本仓既有惯例:page.tsx 是 Server Component)
- [x] **T2 拆主字典** 2216 键 × 三语 → 6 个领域文件。切分器带回验(三语零丢零多零变);
      混排行只有 6 处、自动拆分;注释按「归属=紧随其后的第一条键」跟着走
- [x] **T3 统一 `ChatLang`** —— 81 处 + 7 个文件,全站只剩一个 `Lang`
- [x] **T4 收 chat 文案** 18 块见客字典(含 `LabelDict`/`StepDict` 两个形状)→ `chat.ts`(764 行);
      检测器与提示词按 §1 留在原地
- [x] **T5 收法务四页** 四篇长文 → `legal.ts`;顺带去了 `LegalDoc` 的重复声明(形状跟着数据走)
- [x] **T6 收事实类译名** `officialLabels`(75 条,整文件退役)、14 条通道名、闸名两张表、
      案例库 16 条标题+原话、资源导航整表 → 对应领域文件
- [x] **T7 统一题面约定** `L = { default; 'zh-cn'; ko }` → `Record<Lang, string>`;
      删掉 `QuizUI.tsx` 那份一模一样的 `type L`
- [x] **T8 统一 import** 51 源文件 + 12 测试的 6 种写法 → 一律 `@/lib/i18n`
- [x] **T9 退役** `app/(frontend)/jobs/i18n.ts`(3406 行)、`lib/officialLabels.ts`、`resources/data.ts`
- [x] **T10 验收** 见 §5

### 中途做出来的两件计划外的事(都是类型逼出来的)

1. **`PathwayKey` 护栏**。通道名搬进 i18n 后,「加通道漏补名字 → 页面冒裸键 `jpw.p.XX`」
   本来会成为新的失败模式(这正是 08-15 把名字放进策略文件的理由)。
   做法:`PathwayStrategy.key` 从 `string` 收成字面量联合 `PathwayKey`,
   `report.ts` 那块标 ``Record<`jpw.p.${PathwayKey}`, string>`` ——
   **加通道 → key 不在联合里 → tsc 红 → 补进联合 → report.ts 立刻红到三语名写完为止。**
   这个失败模式现在不可能上线,比搬家前更严。
2. **`nocLabels` 拆出来**。类型强制第一时间抓出 `cat.*` 的三语键集**本来就不该相同**:
   111 条键是 `cat.<中文分类名>`,值是 etl/noc.py 产的数据值译名,zh 天然没有条目。
   塞进受键强制的域字典等于逼出一堆假的 zh 条目 —— 单拆成 `nocLabels`,文件头写明终局在维度表。

## 5 · 验收

## 5 · 验收

**主判据(比截图硬):迁移前后所有文案逐条相同 —— 全绿。**

| 判据 | 结果 |
|---|---|
| ① 主字典 `t(key)` 快照 | **2231 键 × 3 语,逐条完全相同**(2217 字典键 + 14 通道名) |
| ② 法务四页 / 官方译名 / 闸名 / 案例 / 资源 / 对话六组 | **逐字节相同**(`_i18n-dump2` 前后比) |
| ③ 题库 129 条题面 | 三语文本**全同**(形状从 `default/zh-cn/ko` 换成 `zh/en/ko`,按语义逐条比) |
| ④ `tsc --noEmit` | 绿 |
| ⑤ `eslint --quiet`(全部改动面) | 零 error(`Decision.tsx` 那条 `preserve-manual-memoization` **stash 后依然存在**,是既有的) |
| ⑥ `vitest run`(全量集成) | **40 文件 / 699 测试全过** |
| ⑦ `Lang` 加 `'ja'` 探针 | tsc **恰好点名 6 个领域文件 + 桶**,外加所有还没收拢的地方 —— 判据可执行 |

**「加一门语言要改几个地方」:39 → 19,其中 7 个就是 `lib/i18n/` 自己。外部从 38 降到 12。**

### ⚠️ 验收路上撞到的两件事

- **循环依赖(已修)**:`chat.ts` 从 `chatOrchestrate` 引了一个**值**(`latinTail`),
  链路 `index → chat → chatOrchestrate → index` 成环 —— `PNP_PROVINCES` 在 `ALL_PROVS`
  初始化时是 `undefined`,2 个测试文件整体挂掉(且**另有 41 个测试根本没跑起来**,
  被 `40 passed` 的表象盖住)。修法:`latinTail` 挪到用它的文案旁边,
  `chat.ts` 只从 chatOrchestrate 引**类型**(编译期擦除)。文件头已写死这条红线。
  **教训:桶文件的下游只能是类型。** tsc 全绿也挡不住 —— 只有跑起来才看得见。
- **CRLF 假象**:`diff` 报两份快照「全文不同」,实为 git autocrlf 在 stash 往返时改了行尾。
  凡是 diff 报「1,N c 1,N」整体差异的,先按内容(解析后)比一遍再下结论。

## 6 · 风险与回退

## 6 · 风险与回退

| 风险 | 实际情况 | 对策 |
|---|---|---|
| 注释在迁移中丢失 | 主字典里大量决策记录挂在键正上方(`// #170:去「·」杂糅…`) | 按**行**搬不按键搬;注释行归属=紧随其后的第一条键 |
| 25 行混排要手拆 | 三语共 75 处 | 逐条列出,拆完由 §5 的字节比对兜底 |
| 拆完 bundle 变大 | 不会:7 个文件仍全量进同一个 chunk,总字节不变 | —— |
| `'use client'` 污染 | 服务端也 import i18n | `lib/i18n/**` 一律不加指令,T10 前 grep 一遍 |
| 与并行 session 抢文件 | 有先例 | 提交前 `git show --stat` 核一遍,别夹带 `data/`/`etl/`/`scratchpad/` |

**回退**:整件事在一个提交里,`git revert` 即可;`MESSAGES` 字节比对保证回退前后行为一致。

---

## 7 · 待 Frank 判:`officialLabels` 缺 ko 的 54 条

按官方分值表的省份分组(全部有 zh、全部无 ko)。判「补」还是「就这样,回退英文原文即可」:

- **MB(10 条)**:近亲/远亲密友/曾在本省合法工作 6 个月/本省 2 年高教/本省 1 年高教/
  同一雇主 6 个月+长期 offer/战略项目邀请/定居温尼伯以外/外省有近亲本省无/曾向他省申请
- **ON(20 条)**:岗位在职时长四档、年报税收入四档、许可三态、加拿大学历三档、
  地区六档(北安/东安/GTA 外中安/西南安/GTA 内除多伦多/多伦多)
- **ON 时薪(6 条)**:$40+/$35-39.99/$30-34.99/$25-29.99/$20-24.99/低于 $20
- **AB(18 条)**:受监管职业持牌/亲属在 AB/英法双语 CLB 4/全职长期 offer/乡镇振兴社区背书/
  旅游酒店业协会会员雇主/AACP 执法类雇主/offer 地点两档/加拿大最高学历地点两档/
  英语 CLB 6 以上/英语 CLB 3 以下/总工作经验三档/技工证书/高中及以下

---

## 8 · 没收进来的(逐条给理由,不是漏了)

外部还剩 12 个文件按语言分叉,分三类:

**① 不是文案,是校验规则**(`lib/chatOrchestrate.ts` 28 处):
`AVAIL_MARKERS` / `VERDICT_MARKERS` / `SCRIPT_RE` / `COVERAGE_WORD` / `HEDGE_WORDS` / `LEN_CAP`
—— 按语言分叉,但它们校验的是**模型输出**,搬进 i18n 会让那个目录变成什么都能塞的抽屉。

**② 是提示词,归 `prompts.ts`**(§1 已声明的边界):
`advisor/route.ts` 的 `SYSTEM`/`GROUNDING_RULES`/`HEADINGS`/`LANG_NAME`、
`news-summarize/route.ts` 的总结指令、`chatOrchestrate` 的 `SLOT_SYSTEM`/`LANG_NAME`、
`jdformat`/`resume`/`companyResearch` 三处 system。**`prompts.ts` 本身还没建**,是下一件事。

**③ 是数据/缓存的形状,不是文案**:`News.tsx` 的 `transCache`(按语言存的译文缓存)、
`companyResearch`/`designatedEmployers`/`start/page.tsx`/`Advisor.tsx` 的 `zh: string` 字段。

**④ 点名范围外、但确实是给人看的文案 —— 留给 Frank 定**:
`app/api/alerts/run/route.ts` 的 `WK`(周报邮件三语正文,12 行)。它是**邮件**不是页面,
本轮 T-清单里没有它,按「宁窄勿宽」没动。

---

## 9 · 🔴 顺带查出一个真 bug(**没动**,因为修它会改行为)

`lib/resumeMatch.ts:63` 的 `LANG_NAME` 键是 **`'zh-cn'`**:

```ts
const LANG_NAME: Record<string, string> = { 'zh-cn': 'Simplified Chinese', ko: 'Korean' }
const outLang = LANG_NAME[lang] ?? 'English'
```

而 `ResumeMatchModal.tsx:77` 发给 `/api/resume-match` 的 `lang` 是 **`'zh'`**
(站里的 `Lang` 值)→ `LANG_NAME['zh']` 是 `undefined` → 回落 `'English'`。

**中文用户的「简历对照」一直在出英文。** 韩文碰巧对得上(`ko` 两套写法一样),所以只有中文中招。

这正是**两套语言键约定并存**的代价 —— T7 把 `fields.ts` 那套收了,这一处是同一个病的最后一个宿主。
修它是一行(`'zh-cn'` → `'zh'`),但会**改变线上行为**(中文用户开始收到中文结果),
与本轮「渲染零变化」的约束冲突,所以只报不改。
