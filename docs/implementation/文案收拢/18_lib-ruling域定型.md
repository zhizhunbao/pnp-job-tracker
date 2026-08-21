# 18 · `lib/ruling`:判定域定型(新域替换 `lib/verdict`)

> 2026-08-20。Frank:「肯定要先定型啊,你不知道定型的好处吗。」
> 办法照同日立的规矩:[**建新域整个替换老域**](../../../CLAUDE.md#新建域--替换域先判边界再写第一行),不原地重构。
> 前置:[17 号](17_lib-consult边界与迁移.md)(边界总则)。

---

## 0 · 为什么定型 —— 一句话

**没定型的域,那 16 道闸一条都挂不上去。** `lib/verdict` 2944 行从没进过闸,
挂上去当场报 **310 条**(属性注释 195、单行 JSDoc 53、导出无注释 25、签名 20、`unknown` 8…)。
定型不是排版,是**把一个域挪进闸门的射程内**。

第二条同样硬:`lib/verdict` 与 `lib/plan` 一直在 `import … from '../chat'` ——
**幸存的域依赖将死的域**,而对话域正要被 `lib/consult` 替换。这条边不断,`chat` 就删不掉。

---

## 1 · 边界:`ruling` 装什么

| | |
|---|---|
| **装** | 通道判定、雇主判定、名录匹配、三合一卡、案例事实档,以及**判定层六张底表的取数** |
| **不装** | 判定引擎(`lib/rules` 的 `evaluateRequirements`)、打分(`lib/score` 的 `estimateCrs`)、通道知识(`lib/pathways`) |
| **自己声明** | `Evidence` / `Availability` —— **不从对话域借**。两处字段今天逐字相同,但回答的是不同问题:那边是「一条事实的出处」,这边是「一条判定理由的出处」,同形不同源 |

🔴 **`functions.ts` 不 import `payload`**:取数函数收 `Queryable` 参数,连接池由调用方注进来。
所以两个门只是「露哪几个名字」的区别,不必把函数分两个文件(见 CLAUDE.md 同日立的那条)。
带 `payload` 的 TTL 缓存(`getVerdictData`)**不属于本域**,那是路由层基建。

---

## 2 · 已完成(每一步都打真数据对拍过)

| 迁入的 | 对拍结果 |
|---|---|
| **六表加载器** `loadVerdictTables` | 与老 `loadVerdictData` **JSON 逐字相同**(requirements 307 / occupations 630 / draws 145 / scoreFactors 222 / eeGrid 380 / designated 639) |
| **`matchDesignation`** 名录匹配 | 拿真名录 **639 家逐家对拍全一致**,含 6 家多配连锁;营业名反查(Grand View Manor / Tim Hortons)也一致 |
| **`employerVerdict`** 雇主判定 | **9 省 × 4 组事实 = 36 组全一致**(含 `public` 旁路、全 null 判不了、刚成立差年限) |
| **`pathVerdict` / `pathLevers` / `jobPathways`** | **5 套档案 × 全量底表逐字相同**;档案覆盖:全空 / 木匠 0 加拿大经验+PGWP / 软件开发本科+加拿大学历 / 护理员 CLB4+海外自雇 / 在读学签+专业对口 |

对拍探针:`cms/tests/int/rulingParity.int.spec.ts`(**验完即删**;没有 `DATABASE_URI` 时自动 skip)。

**老 `lib/verdict` 至今一个字没动**,还在服役;`/api/*` 全走老链。

---

## 3 · 定型过程中做出的实质改进(不只是加注释)

1. **内联对象类型拆成具名的** —— `{ province: string; n: number }[]` → `TrainableRow[]`、
   `gains?: {…}[]` → `LeverGain[]`、`score?: {…}` → `PathwayScore`。内联对象挂不上注释,这正是闸拦它的理由。
2. **`unknown` 换成真值域** —— `Row = Record<string, unknown>` → `Cell = string | number | boolean | null`。
   列的值域本来就是确定的,写 `unknown` 等于把「取值前先收窄」推给每个调用点。
3. **`TripleWireEvidence`** —— 发给前端的出处比内部的 `Evidence` **少两格**(节号、生效日前端用不上),
   少发一格就少一格被误用的机会。
4. **`.catch(() => null)` 提成具名 `swallow()`** —— 堆栈里要看得见名字。
5. **闭包捕获的收集器改成显式参数** —— `employerVerdict` 里的 `push` 箭头函数 → 具名 `pushItem({ acc, … })`。

---

## 4 · 还剩什么(接手从这儿起)

### 4.0 🔴 接手前必读:对拍抓到过一次真事故

签名迁移(箭头改具名 + 收成一个对象参数)时,批量重命名把**正则字面量里的标识符**也改了:

```ts
const m = /^teer-([\d-]+)$/.exec(...)      // 老
const m = /^input.teer-([\d-]+)$/.exec(...) // 被改坏的
```

那条正则再也匹配不上,AIP / RCIP 的语言分支当场走错 ——
多报了 `clb` 缺槽、少了「本站尚未收录…语言门槛条文」那条理由。
**`tsc` 全绿、`eslint` 全绿,只有对拍抓得住。** 已改成 `TEER_STREAM` 常量。

**结论:每改一批就跑一次 `tests/int/rulingParity`,别攒着一起验。**
批量重命名的三个已知盲区:① 正则/字符串字面量;② 对象字面量的**键**(`{ rows: [] }`);
③ **简写属性**(`{ clb }` / `{ ...X, noc, teer }`)。前两个能用负向断言挡,第三个挡不住,只能靠对拍。

### 4.1 `functions.ts` 的 474 条闸门违规 —— ✅ 2026-08-20 已清零

**收工实况:474 → 0**(`npx eslint src/lib/ruling` 零 error 零 warning)。下面这张表是开工时的分布,
留着当账本;每一批怎么清的见表下面那段。

| 规则 | 开工 | 收工 |
|---|---|---|
| `no-bare-strings` | 247 | **0** —— 141 个不重复的串全部进 `constants.ts` 的 §7/§8/§9 三段 |
| `no-arrow-function` | 89 | **0** —— 回调一律改 `for` 循环或提成顶层具名函数;两个比较器留 `sort` 的签名并就地 disable |
| `jsdoc-tags` / `doc-every-member` | 58 | **0** |
| `no-object-spread` | 18 | **0** —— 见下面「键的次序」那条 |
| `typed-signature` | 5 | **0** |
| 其余 | 35 | **0** —— 分类横线、单行 JSDoc、顶层变量、没用上的 import |

**中文句子片段照 14 号的先例只收位置不搬文案**:全部进 `constants.ts` 的 `PV_TEXT`(§9 段,
表头就写着这是技术债、该住 `lib/i18n`、为什么这一轮不搬)。命名口径 `Head`/`Mid`/`Tail` = 句首/变量之间/句尾。

🔴 **对象展开退役时,键的次序一格都不能动**:老 `verdict` 的返回是 `JSON.stringify` 出去比的,
`{...(cond ? {x:1} : {})}` 改成「先建对象再 `if` 赋值」会把可选键挪到末尾,JSON 当场不一样。
写法只能是 `x: cond ? v : undefined` —— `JSON.stringify` 跳过 undefined,次序原样保住。

**顺手拆掉的两处 `as`**(都是「条件里判过非空、下面又断言一遍」):`find(...) as ScoreFactor` 改成
先取行、再拿它进条件(`if (... && mbHead)`),断言自然消失。另有一处 `as { partial?: boolean }` 是
**类型缺了一格**:`PathwayScore` 从来没声明过 `partial`,老代码靠对象展开塞进去,
`/api/profile-pathways` 只好断言着读 —— 已补声明,那处断言下一批可以删。

⚠️ **改箭头会让总数先涨后落**:箭头函数本来躲在 `typed-signature` / `jsdoc-tags` / `one-parameter`
三条闸外面,改成 `function` 才被查到(实测 102 → 89 的同时 typed-signature 40 → 72)。
那是真实暴露,不是倒退。

⚠️ 已清的 155 条里踩过两个坑,接手别再踩:
- **类型位置的字面量不能替**(`source: 'job'` 在类型注解里,换成 `FACTOR.job` 会被当成命名空间);
- **常量表少 `as const`,值会退成 `string`**,联合类型当场对不上(`VIA` / `STREAM_EVENT` / `FACTOR` 都踩过)。

### 4.2 还没迁的文件 —— ✅ 2026-08-20 全部迁完

| 文件 | 行 | 性质 | 迁法 |
|---|---|---|---|
| `caseLibrary` | 68 | 数据表 → `constants.ts` | ✅ `CASES` |
| `caseFacts` | 149 | 要连库 → `server` 门 | ✅ 改收 `Queryable`;C01 事实档落 `CASE_C01` 标量表 + `caseProfiles()` 构建函数 |
| `tripleWire` | 230 | 要连库 | ✅ **拆两半**,见下 |
| `tripleVerdict` | 696 | 纯判定 | ✅ 拆成 28 个函数;`evOfReq` / `quoteOfReq` 复用 `pathVerdict` 那份 |

🔴 **`tripleWire` 不是整块搬过来的**,因为整块搬会违反 §1 的红线(`functions.ts` 不 import `payload`)。
按「取数函数收一个能 query 的东西当参数」拆成两半:

- **纯的那半进域**:库行 → `TripleJob` / `TripleCompany` / `TripleProfile` 的映射,加付费闸 `wireRows`。
- **编排也进域**,但 `buildTripleWire` 收一个对象:`{ db, id, answers, profile, loggedIn, pro, data, designatedOf }`
  —— 连接池、登录态、六张底表、名录取数函数全部**由调用方注进来**。
- **凑齐这些东西的那一层不属于域**:新建 `lib/rulingServer.ts`(连接池 + 两份 TTL 缓存 +
  `tripleWireOf(id, answers)`)。`tripleWireOf` 存在的唯一理由是**两个调用点**
  (`/api/triple-verdict` 与 `/plan/pr` 的 SSR)要抄同样 4 行,不是为了好看。

于是 `functions.ts` 纯到浏览器也能打包,两个门真的只剩「露哪几个名字」的区别。

### 4.2b 函数长度闸 —— ✅ 2026-08-20 已加(60 行)

规则 `local/function-length` 写在 `cms/eslint.config.mjs`,与其余 16 道同一张名单(五个定型域)。

⚠️ **原表里「140 个函数只有 3 个超 60 行」是量错的** —— 那次没把多行签名的函数数进去。
真实分布是 8 个:`evaluateOne` 498、`verdictReasons` 133、`scoreAndRefLine` 127、`provinceGridScore` 126、
`pathLevers` 88、`occupationListReasons` 78、`gateManifest` 63、`languageReasons` 62。全部拆完。

拆法一律是**原样搬**:整段剪出去成函数,只把段里读的外部变量改成 `input.x`,各段自己攒
`reasons`/`missingSlots`,调用方按原序并回去 —— 次序进 JSON,一格不能动。

收工后 88 个函数里最长 57 行(`pickGate` / `gateManifest`),第三 56 —— 所以 60 这条线
**今天一个都不误伤,拦的是明天新长出来的那一个**。`evaluateOne` 现在 47 行,读起来是七步流水线:
`pathwayFacts`(①~④ 摆事实)→ `verdictReasons`(⑤ 裁决)→ `gateManifest`(⑥ 闸)→ `foldVerdict`(三值折叠)。

唯一的豁免:`consult/functions.ts` 的 `makeTools`(112 行),就地写了
`eslint-disable-next-line local/function-length -- …` 与理由(12 把工具的 `execute` 各自闭包着
库连接与收件箱,拆开就得把这两样显式传一大串)。

### 4.2c 🔴 拆的过程中撞见的**可疑判定逻辑**(还没动)—— **仍未查,见 [19 号 §5.4](19_lib-gauge与lib-points域定型.md)**

`evaluateOne` 里算出来的 `manifestGap`(「有这道闸、他明确答了没有」)**一次都没进裁决** ——
底下跟着一行 `void manifestGap`。`verdict` 只看 `manifestUnknown`,`availability` 只看 `manifestNoSource`,
「明确不满足」实际是靠 `blockedBy` 兜的。注释里写的「→ 现在走不了」并没有落地。

这一轮按「不改行为」原样搬了过来(`FoldVerdictIn.manifestGap` 的属性注释上标了这件事)。
**换消费者之前该把它弄清楚**:要么让它真的参与裁决,要么删掉它和那行 `void` ——
今天这样是「算了不用」,读的人会以为它在起作用。

### 4.2d 2026-08-20 补的六道闸(都是 Frank 逐个实拍出来的盲点)

| 闸 | 拦什么 | 开给谁 |
|---|---|---|
| `doc-every-function` | 顶层函数没 JSDoc(**导不导出无关** —— 老 `doc-every-export` 只盯导出的,10 个函数集体漏网) | 六个域 |
| `function-length` | 函数超 60 行 | 六个域 |
| `no-comment-in-function` | 函数体里有注释(要解释就拆成函数、写成它的 JSDoc) | 先只 `ruling` |
| `no-magic-number` | `functions.ts` 里的裸数字(0/1/-1 除外) | 先只 `ruling` |
| `no-split-import` | 同一模块拆成多行 import(同种) | 先只 `ruling` |
| `no-import-in-leaf` | `constants.ts` / `types.ts` 里有 import | 先只 `ruling` |

另修两处盲点:`no-bare-strings` 从此认**正则字面量**(它的 `value` 是 RegExp 不是 string,第一版直接漏);
三条 doc 闸取 JSDoc 时**跳过 `eslint-disable` 行**(否则写个 disable 顺手把注释闸也关了,实测 5 个假阴性)。

清完的存量:函数体内注释 142 → 0(拆出 19 个 3~13 行的新函数)、裸数字 32 → 0、正则 7 条进 `constants.ts`。
别的域的存量记在 `eslint.config.mjs` 那个 files 块的注释里,清完一个加一个。

### 4.2e 形状改成**本域自己声明**(2026-08-20 Frank 定)

原话:「直接就新建,然后自己依赖自己直接用。所有的域都这么做。之后所有域都重构完毕之后,
再考虑不同域之间重复的问题,和不同域的边界问题。」

`types.ts` 第 0 段现在自己声明 18 个形状(`ReqRow` / `ScoreRow` / `EeRow` / `EngineProfile` /
`EngineResult` / `GridProfile` / `CrsProfile` / `MbEoiProfile` / `PathwaySpec` …),
**只声明本域真正读的那几格**:`EngineResult` 不写引擎那头的 `basis` / `needLow` / `tiers`,
`PathwaySpec` 不写 `gates` / `ui` / `note`。下层多一格不必跟着改,真读不到会当场 tsc 红。

| | 改前 | 改后 |
|---|---|---|
| `types.ts` 的跨域 import | 4 个域 | **0** |
| `constants.ts` 的 import | `./types` 4 个类型 | **0** |
| `functions.ts` 的值 import | 5 | 5(引擎调用,这条边去不掉) |

🔴 **只管形状,不管行为**:`rules` / `score` / `i18n` 的函数不许复制 —— 实测消费者
`score` 14 个文件、`rules` 9 个,复制一份等于给全站口径开个岔。判据见 CLAUDE.md 同日补的那条。

### 4.2f `gateManifest` 该并回 `pathways`(收口时一起做)—— **仍未做,见 [19 号 §5.3](19_lib-gauge与lib-points域定型.md)**

实测消费者:`pathways` 2 个文件 + `i18n` 1 + `verdict` 1。删掉将死的 `verdict` 之后,
36 行的它只剩 `pathways` 一个真消费者 —— 而 `gates` 本来就是通道声明里的一个字段。
按 CLAUDE.md「一个消费者的不是公共」,该并回去。

### 4.3 收口 —— ✅ 2026-08-20 做完

1. ✅ 开 `index.ts`(浏览器那半)/ `server.ts`(取数那半)两个门,门里只有转发
2. ✅ 换 11 处生产消费者:3 个 API 路由 + 4 个 `cases/` `plan/pr` 页面 + `lib/chat` ×2 + `lib/employers` ×1
3. ✅ 两份 TTL 缓存(`getVerdictData` / `getDesignatedEmployers`)**没进域**,住 `lib/rulingServer.ts`
4. ✅ **整个 `lib/verdict` 目录删掉**(2,745 行)
5. ✅ 删对拍探针 `rulingParity.int.spec.ts` 与 `tripleVerdict` 里那个临时 describe

**没做**:把 `ruling` 改名回 `verdict`。改名要动 40+ 处 import,而 `ruling` 这个名字本身没毛病
(它回答的问题就是「判定」)—— 为了一个名字做一次全站 diff,收益是零。**这条从计划里划掉。**

#### 4.3a 金标测试怎么迁的(这一步的判断值得记)

七个判定层金标里有 **~78 个位置参数调用点**,而判定域一律「一个函数一个参数」。
没有逐个改调用点,而是**每个测试文件顶上加一层位置参数垫片**:

```ts
import { pathVerdict as rulingPathVerdict } from '@/lib/ruling'
/** 垫片:金标沿用位置参数,判定域收对象参数(换实现时用例一个字不动) */
function pathVerdict(profile: VerdictProfile, data: VerdictData) {
  return rulingPathVerdict({ profile: profile, data: data })
}
```

理由:**换实现时,你要的正是「金标本身没被动过」**。78 处手改的风险全落在断言之外 ——
改坏一个 fixture 和实现有 bug,在测试报红时长得一模一样。垫片是 5 行,风险为零。

#### 4.3b 顺手拆掉的两个 `as`

- `caseFacts` 的 `profile: {…} as VerdictProfile` 盖住的是 **`hasOffer` / `inCanada` /
  `fieldMatch` / `frenchOk` 四格根本没声明**(运行时是 `undefined`)。改成显式 `null`(= 没答)。
- `lmiaNocsOf` 的 `typeof raw === 'string' ? JSON.parse(raw) : raw` 是**类型在对冲**
  (2026-08-20 Frank 实拍:「这个地方为什么要判断类型,不应该在 type 里准备好么」)。
  根子是 `Row = Record<string, Cell>` 那句注释「列的值域是确定的」对 `jsonb` 列**是假的**。
  修法不是补 `typeof`,是让那句话变真 —— 查询改成 `SELECT lmia_nocs::text`,入参落回 `string | null`。

同一轮把答案侧的运行时收窄全部收进 5 个具名槽函数(`answerNum` / `answerBool` / `answerText` /
`provinceOf` / `permitOf`)。整个域的 `typeof` 现在**只剩 3 处,全在这几个函数体内**:
它们下游拿到的已经是干净值。留着的那 3 处是**信任边界本身**(`req.json()` 与 `JSON.parse` 的产物),
类型准备不了 —— 在 type 里写 `fieldMatch: boolean` 不是「准备好」,是撒谎:TS 类型运行时会被擦掉,
声明一个不成立的形状等于把校验取消掉,而不是做掉。

#### 4.3c 记账:`difficulty` 列有同款对冲,但**不在这轮修**

`/api/profile-pathways` 读 `stats.difficulty`(`json` 列)时同样写着 `typeof raw === 'string' ? …`。
但它不是同款小修:`PROV_DIFFICULTY` 系列**四条 SQL、8 个消费者、跨 6 个域**
(`score` / `stats` / `chat` / `employers` + 3 个路由),其中只有这一处带对冲,其余 7 处直接当对象用。
改列的取法要同时动那 7 处 —— **那是跨域大扫除,不是外科手术**。跟着各域定型走,谁定型谁修。

---

## 5 · 验收

- [x] `npx tsc --noEmit` 零错
- [x] 五个域(`consult` / `agent` / `llm` / `error` / `log`)eslint **零 error 零 warning**
- [x] `ruling` **474 → 0**(2026-08-20 清零;`npx eslint src/lib/ruling` 零 error 零 warning)
- [x] `npx vitest run` **719 条全绿**(2026-08-20 收口后;= 728 − 9 个对拍探针,探针随老域一起删)
- [x] `npm run build` 过,全路由出齐 —— **这道闸是收口的关键**:两个门分错会把连接池打进浏览器包,
      `tsc` 全绿、只有 `build` 才炸
- [x] 七个判定层金标(`pathVerdict` / `verdictMatrix` / `verdictWording` / `tripleVerdict` /
      `employerVerdict` / `designationMatch` / `scoreLine`)**改跑 `lib/ruling`,断言一个字没动**
- [x] `npm run dupcheck` —— **0 组**(2026-08-20)。开工时报 10 组,全是 `ruling` 与 `verdict`
      两边同一段 `evaluateOne` 逐字重复;这一轮把 `evaluateOne` 拆成七步之后自然归零。
      **不是收拢出来的** —— 那两份注定只活一份,过渡期本来就不该为它做任何收拢。
- [x] 对拍探针 4/4
- [x] `functions.ts` 的 474 条清零(见 §4.1)
- [x] 加函数长度闸并拆 `evaluateOne`(见 §4.2b)
- [ ] 迁 §4.2 那四个文件(`caseLibrary` / `caseFacts` / `tripleWire` / `tripleVerdict`)
- [ ] 查 §4.2c 的 `manifestGap`(换消费者之前弄清楚)
- [ ] 换消费者 + 删老域
- [ ] `npm run build` ✓ / push 后拉 `/api/version` 确认换版

> ⚠️ 迁 §4.2 那四个文件时,`functions.ts` 的 import 表要**加回**这一轮删掉的那几个名字
> (`CaseTier` / `Cell` / `Queryable` / `Row` / `SqlResult` / `TeerScope` / `TrainableRow` /
> `NamedList` / `OpeningCount` / `RuleProfile` / `DEFAULT_PROFILE` / `EDU_KEYS` / `systemShort`)——
> 它们当时是为还没迁的文件预先 import 的,这一轮按闸门要求清掉了。
