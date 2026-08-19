# 12 · `collectFacts` 从「一个整体」拆成「按工具」

> 立项:2026-08-18(`11_agent兜底接入pi.md` §7 点名的「下一步第一件」)
> 状态:**已完工**,三个文件(`cards.ts` / `facts.ts` / `tools.ts`),**纯重构、行为零变化**
> 前置:`lib/agent/` 兜底已上线并默认关(`86b671c7`)

---

## 1 · 为什么先做这一步

三层形状(① 库里的 lookup 出 Fact ② 官方页现抓只出文字 ③ 记缺口)全建在「**每个工具能自己出 Fact**」上。
而 `collectFacts` 原先是**一个整体**:按槽位一次 `Promise.all` 调七个 lookup,再用 200 行把七种返回
统一摆成 `Fact[]`。哪几个一起调、结果怎么摆,都是人预先写死的 —— agent 想单独调一个 `lookupDraws`
拿一条带出处的事实,做不到:摆事实的代码和「这一轮要调哪几个」焊在一起。

**不管最后是 agent 挑工具还是别的,那 200 行的单体组装都得先散开。这一步无悔。**

---

## 2 · 形状:摆事实归 `facts.ts`,编排归 `collectFacts`

`facts.ts` 本来就是「摆」的那一半(文件头第一句:「与 tools.ts 的分界:那边是**查**,这边是**摆**」),
而且已经住着两个同形状的渲染器 `planFacts` / `verdictFacts`。所以不新建文件,**一个工具一段**收进去:

| 工具 | 渲染器 | 它自己带的口径 |
|---|---|---|
| `lookupJobs` | `jobsFacts(all, named, ctx, lang)` | 主数永远是总在招;子集只给点名省;零经验 6 个其余 4 个 |
| `lookupCoverage` | `coverageFacts(r, ctx, lang)` | `exclusion` 不包装成「官方不公布」 |
| `lookupThresholds` | `thresholdsFacts(r, ctx, lang)` | 点名省与「不设门槛」的省排前、最多 3 省;`need==null && pass` 是信号不是空 |
| `lookupDraws` | `drawsFacts(results, lang)` | 查不到照样出四态行 |
| `lookupOps` | `opsFacts(results, lang)` | 六个指标码换人话;`value=null` 不折成 0 |
| `lookupEE` | `eeFacts(r, lang)` | 没命中也要出声 —— 那正是答案 |
| `checkClaims` | `claimsFacts(r, ctx, lang)` | 商业话术只给一条判断,不套四态 |
| `lookupPermit` | `federalRuleFacts(results, lang)` | 原样搬家(本来就在 `cards.ts` 里是这个形状) |
| `lookupCrs` | `crsFacts(results, lang)` | 同上 |
| `lookupPlan` / `lookupVerdict` | `planFacts` / `verdictFacts` | 本来就在 `facts.ts` |

`collectFacts` 剩下的**只有编排**:调哪几个(两拨 `Promise.all` 原样没动)+ 摆的顺序。
整个组装段从 167 行变成一张表:

```ts
const script = { noc, zeroExp, provs: slots.provs, claims: slots.claims }
const out: Fact[] = [
  ...(verdict ? verdictFacts(verdict, lang) : []),
  ...jobsFacts(jobs, named, script, lang),
  ...(plan ? planFacts(plan, lang) : []),
  ...federalRuleFacts(federal, lang), ...crsFacts(grids, lang),
  ...coverageFacts(coverage, script, lang),   ...thresholdsFacts(thresholds, script, lang),
  ...drawsFacts(draws, lang), ...opsFacts(ops, lang), ...eeFacts(ee, lang),
  ...claimsFacts(claims, script, lang),
]
```

**顺序即优先级这件事,现在一眼看得见**(超预算是从尾巴砍的)。
`script` = 抽到的槽里**会改变「怎么摆」的那几样**;各渲染器只在签名里声明自己真用到的字段 ——
`coverageFacts` 要 `{noc, provs}`、`thresholdsFacts` 要 `{zeroExp, provs}`,一看签名就知道它依赖什么。

行数:`cards.ts` 465 → 271,`facts.ts` 374 → 653(+8 行是 `tools.ts` 给同模块开放四个 result 类型)。

### 三条红线怎么守住的

- **Fact 必带 evidence**:evidence 一直是 `fact()` 的必填参数,拆开没碰它。新段的横幅把这条写死在
  `facts.ts` 顶上(`guardAnswer` 的数字溯源、前端出处区、「官方不公布 vs 本站未收录」都靠它)。
- **口径不在 schema 里,在 lookup 的代码里**:每一条口径注**跟着它管的那几行代码整段搬进对应函数**,
  一条都没留在调用点。调用点现在只剩「调不调、摆哪一格」的理由。
- **行为零变化**:见下。

---

## 3 · 怎么证明它真没变(不是「测试过了」四个字)

1. **逐行对拍**:把 `HEAD` 的 `cards.ts` 与新的 `facts.ts` 都剥成「去注释的代码行」,
   套上已知改名(`thresholds.`→`r.`、`slots.provs`→`ctx.provs`、`zeroExp`→`ctx.zeroExp`…)再 diff。
   逐块核过,只有三处是**写法**变化,语义相同:
   - `ee`:`for…push` 换成 `.map`(同序同元素);
   - `claims`:`if (claims) {…}` 换成 `if (!r) return out`;
   - `ops`:`OPS_KEYS` 从函数内提到模块级(同一份常量)。
2. **门槛那段的行变量 `r` 改叫 `row`** —— 因为函数参数现在也叫 `r`(整份返回),
   两个 `r` 套在一起读的人要数括号。除此之外一个标识符都没改。
3. **vitest 按用例全名前后对拍**:不是比 passed 数字,是比 `(状态, 全名)` 的集合 ——
   699 条**逐条相同**,新增失败 0。
4. **eslint 输出逐字 diff**:全文只有一行不同 —— `cards.ts` 那个 `pool: any` 的行号
   从 220 变 174(上面少了 46 行)。问题数与那 1 个既存 error 一模一样。

---

## 4 · 验收

| 项 | 基线 | 本轮 |
|---|---|---|
| `npx tsc --noEmit` | 0 | **0** |
| `npx vitest run` | 699 / 694 过 / **5 败** | 699 / 694 过 / 5 败,**按用例全名逐条相同** |
| `npx eslint .` | 561 problems / 1 error | **561 / 1**,输出逐字相同(只差一个行号) |

那 5 个败是**既存**的生产库口径漂移(`CEC 516` 那组),与本轮无关 —— 前后是同样的 5 条。
纯 `.ts` 逻辑层,一个 `.tsx` 都没动,按规矩没跑渲染探针。

---

## 5 · 下一步(不到 60 行,本轮**没做**)

1. **联邦题信号接线** —— agent 已经能判「这是 CRS 题,不依赖职业」,但那个判断没接上(实测 2/8 里的那条 ⚠️)。
2. **`profileContext` 传给 agent** —— 「按我已填的条件」那两条现在必然回落反问。
3. **工具集补 `lookupPermit`** —— PGWP 主张核对(「两个一年能换 3 年」)现在没工具可用。
4. 接线时才给桶加导出:`lib/agent` 只能从 `@/lib/chat` 桶取(eslint 边界闸),
   而**现在这十个渲染器一个都没上桶** —— 没有消费者的名字不进桶,那是桶的意义所在。
   包 `AgentTool` 时每个工具三行:`await lookupX(pool, args)` → `xFacts(r, …)` → 收进这一轮的 facts。

**没做也不该现在做**:让 agent 直接写 SQL(逃生舱押后,理由见 11 号 §6)、第 ② 层现抓(先把 10 个门打开
看还剩多少问法真的漏)。
