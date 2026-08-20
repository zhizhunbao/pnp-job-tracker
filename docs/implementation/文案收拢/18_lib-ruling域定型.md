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

### 4.1 `functions.ts` 的 474 条闸门违规

| 规则 | 条数 | 备注 |
|---|---|---|
| `no-bare-strings` | 247 | **其中 64 个是中文句子片段** —— 遗留的 `VerdictReason.text`。按宪法该住 `lib/i18n`,但类型注释写着「留着不动:多处测试钉着这些措辞」。**照 14 号处理 `FRIEND_MSG` 的先例:这轮只收位置不搬文案**,进 `constants.ts` 并标成技术债 |
| `no-arrow-function` | **89** | 顶层 13 个已改完;剩的全是 `evaluateOne` 里的内联回调 |
| `jsdoc-tags` / `doc-every-member` | 58 | 改成具名函数后才暴露出来的 |
| `no-object-spread` | 18 | 字段写全 |
| `typed-signature` | **5** | 已从 72 清到 5 |
| 其余 | 35 | 分类横线、单行 JSDoc、顶层变量 |

⚠️ **改箭头会让总数先涨后落**:箭头函数本来躲在 `typed-signature` / `jsdoc-tags` / `one-parameter`
三条闸外面,改成 `function` 才被查到(实测 102 → 89 的同时 typed-signature 40 → 72)。
那是真实暴露,不是倒退。

⚠️ 已清的 155 条里踩过两个坑,接手别再踩:
- **类型位置的字面量不能替**(`source: 'job'` 在类型注解里,换成 `FACTOR.job` 会被当成命名空间);
- **常量表少 `as const`,值会退成 `string`**,联合类型当场对不上(`VIA` / `STREAM_EVENT` / `FACTOR` 都踩过)。

### 4.2 还没迁的文件

| 文件 | 行 | 性质 |
|---|---|---|
| `caseLibrary` | 68 | 数据表 → `constants.ts` |
| `caseFacts` | 149 | 要连库 → `server` 门 |
| `tripleWire` | 230 | 要连库 |
| `tripleVerdict` | 696 | 纯判定;**`evOfReq` / `quoteOfReq` 与 `pathVerdict` 逐字重复,迁的时候收拢** |

### 4.2b 还没加的一条闸:函数长度

140 个函数里**只有 3 个超过 60 行**,第四名就掉到 55 —— 所以 60 行是条不误伤的线:

| 行 | 函数 | 判断 |
|---|---|---|
| **498** | `ruling/functions.ts` 的 `evaluateOne` | **真该拆**。里面按因素分了七八段(语言/经验/居住/清单/闸/抽选/分数),每段都能独立成函数。拆它是改结构、风险最高的一种 —— 但对拍网抓得住(见 §4.0) |
| 112 | `consult/functions.ts` 的 `makeTools` | **建议豁免并写明理由**:它是工具表,12 把工具的 `execute` 要闭包 `db` 与收件箱,拆开就得把闭包变量显式传,反而更绕 |
| 75 | `ruling/functions.ts` 的 `pathLevers` | 两根杠杆各一段,拆得动 |

### 4.3 收口

1. 开 `index.ts` / `server.ts` 两个门
2. 换消费者:`lib/plan` 与 `lib/verdict` 现在从 `'../chat'` 取的 7 个类型 + `loadVerdictData`,改从 `ruling` 取
3. `getVerdictData` 那个 TTL 缓存**留在路由层**,不进域
4. 全绿后**整个 `lib/verdict` 目录删掉**,再把 `ruling` 改名回 `verdict`
5. 删对拍探针 `rulingParity.int.spec.ts`

---

## 5 · 验收

- [x] `npx tsc --noEmit` 零错
- [x] 五个域(`consult` / `agent` / `llm` / `error` / `log`)eslint **零 error 零 warning**
- [ ] `ruling` 还剩 **474 条**(它是这一批的主战场,其余五域已清完)
- [x] `npx vitest run` **723 条全绿**(含对拍探针 4 条)
- [x] `npm run dupcheck` —— **过渡期报 10 组是正常的**:`ruling` 与 `verdict` 并存,
      两边同一段 `evaluateOne` 逐字重复。**删掉老域之后它会自动归零**;
      在那之前别为它做任何收拢(那两份注定只活一份)
- [x] 对拍探针 4/4
- [ ] `functions.ts` 的 474 条清零(见 §4.1;开工前先读 §4.0)
- [ ] 加函数长度闸并拆 `evaluateOne`(见 §4.2b)
- [ ] 换消费者 + 删老域
- [ ] `npm run build` ✓ / push 后拉 `/api/version` 确认换版
