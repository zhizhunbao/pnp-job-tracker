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

### 4.1 `functions.ts` 的 499 条闸门违规

| 规则 | 条数 | 备注 |
|---|---|---|
| `no-bare-strings` | 247 | **其中 64 个是中文句子片段** —— 遗留的 `VerdictReason.text`。按宪法该住 `lib/i18n`,但类型注释写着「留着不动:多处测试钉着这些措辞」。**照 14 号处理 `FRIEND_MSG` 的先例:这轮只收位置不搬文案**,进 `constants.ts` 并标成技术债 |
| `no-arrow-function` | 102 | 20 个箭头小工具 + `evaluateOne`(500 行)里的内联回调。提成具名时**别改语义**,对拍是网 |
| `typed-signature` | 40 | 入参/返回要 `XxxIn` / `XxxOut`,且必须是本域声明的 |
| `functions-file-no-variables` | 20 | 顶层常量还没挪完 |
| 其余 | 90 | 对象展开、JSDoc 标签、分类横线 |

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

### 4.3 收口

1. 开 `index.ts` / `server.ts` 两个门
2. 换消费者:`lib/plan` 与 `lib/verdict` 现在从 `'../chat'` 取的 7 个类型 + `loadVerdictData`,改从 `ruling` 取
3. `getVerdictData` 那个 TTL 缓存**留在路由层**,不进域
4. 全绿后**整个 `lib/verdict` 目录删掉**,再把 `ruling` 改名回 `verdict`
5. 删对拍探针 `rulingParity.int.spec.ts`

---

## 5 · 验收

- [x] `npx tsc --noEmit` 零错
- [x] 六个域(`consult` / `ruling` / `agent` / `llm` / `error` / `log`)eslint **零 error 零 warning**
- [x] `npx vitest run` **719 条全绿**
- [x] `npm run dupcheck` 零重复
- [x] 对拍探针 4/4
- [ ] `functions.ts` 的 499 条清零
- [ ] 换消费者 + 删老域
- [ ] `npm run build` ✓ / push 后拉 `/api/version` 确认换版
