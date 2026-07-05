# E6-05 · OINP 改制:ON 具名 chip 下架(列表 chip 与评分侧)

> Epic **E6 数据补强** · 负责人 Frank · 1 SP · 2026-07-05 立项(调研完,**方案 A 待拍板,未动代码**)
> 上位:[E6-04](04_省PNP抽选线.md) §0 连带发现(「OINP 具名 chip 语义存疑,另立项处理」)。E6-04 管的是弹框通告行,**本项管列表 chip 与评分/匹配侧**。

## 0. 调研结论(2026-07-05 实测 ontario.ca)

**改制事实**(O.Reg 422/17 修订,2026-06-26 生效):旧 8 流全删、EOI 系统关闭、不再按旧流发邀请;本项目两条具名通道的母流——Employer Job Offer: In-Demand Skills(→ oinp-in-demand.json 56 NOC)与 Human Capital Priorities: Tech Draws(→ oinp-tech.json 9 NOC)——都在被删之列。

**新「Ontario Workforce Priority」流已公布的只有 reg 级分档条件,没有职业清单**(2026-updates / streams 页均实查):

| 分档 | 已公布条件 |
|---|---|
| TEER 0-3 | 长期 offer + CLB 6 + 高等教育 + 近 6 月(或累计 2 年)经验 |
| TEER 4-5 | 长期 offer + CLB 4 + 高中 + 近 2 年内累计 9 月经验 |
| 自雇医生 | 免 offer,CPSO 注册 + OHIP 计费资格 |

即新流按 **TEER 分档、全职业**设计("all NOC TEERs"),大概率**不会再有** 56/9 式职业清单;邀请如何「priority」未公布,e-Filing 夏末重开。

**关键实测:死清单不会自然失效。** raw/pnp 两份 OINP json `fetched=2026-06-28`(改制后两天)仍解析出 56/9 个 NOC——旧页内容未撤,`build_on.py` 周更会一直给死清单续命;等 ontario.ca 撤页则触发「抓取失败保留旧表」,同样永不失效。**必须主动下架。**

**三方案对比(建议 A)**:

| 方案 | 判定 | 理由 |
|---|---|---|
| **A 下架**(停产两清单+退役 build_on) | ✅ 推荐 | 循「宁可留空不瞎猜」:旧流已死、NOC 集合无官方后继;全链目录驱动**自动回退**泛 TEER 粗筛,零前端/规则代码改动;省级改制事实已由弹框 ON 通告行(E6-04)承担解释 |
| B 改标「改制中」 | ✗ | 列表 chip 是**职业级**信号,改制是**省级**事实,错位;按死清单继续高亮 65 个 NOC=瞎猜;新增状态/i18n/维护面,违反 Ponytail |
| C 等新流清单替换 | ✗ | 新流大概率无职业清单(TEER 分档);等待期间琥珀 chip 持续误导——用户以为定向通道开着,实际 EOI 已关 |

## 1. 整体目标

下架 ON 两条具名通道数据:退役 `etl/pnp/build_on.py`、删两份 oinp json → chip / +12 评分 / pnpEligible / 弹框清单 / match 规则**全链数据驱动回退**到泛 TEER 粗筛。**目录驱动机制一行不改**——新流将来若出清单,丢一个新 json 进 raw/pnp 即恢复。

## 2. 验收标准

- [ ] ① `raw/pnp` 无 oinp-*.json;`build_on.py` 及 sources/pnp step 移除;08→09 跑通,载入省无 ON
- [ ] ② 08 产物:ON 岗 `pnpStream` 全空;in-demand 56 NOC(TEER4-5)的 ON 岗 `pnpEligible=false`;原命中 65 NOC 的 ON 岗分数 -12(前后快照抽查;tech 9 NOC 是 TEER0-1,只失 chip 与 +12,仍绿「可提名」)
- [ ] ③ mart `pnp_occupations` 无 province=ON 行(-65 行);`pnp_draws` 的 ON 改制通告行**仍在**(由 draws.json 携带,不受影响)
- [ ] ④ 前端(本地 dev 直连生产库,DOM 实测):/jobs ON 无琥珀 chip(TEER0-3 绿/TEER4-5 灰);弹框 PNP 清单区无 OINP 两清单、顶部通告行照显;match 侧「省点名招 +30」(match.ts:99)与「TEER4-5 具名通道 +10」(match.ts:143)对 ON 不再触发
- [ ] ⑤ 生产:mart 传 Storage → seed(**无 DDL**)→ 终验同 ④;核对 dims 重灌后 pnp_occupations 的 ON 行真删非残留
- [ ] ⑥ 连带影响记档并接受:sponsor-likely 榜单 ON 公司 namedJobs 归 0、邮件提醒 match 可能高→中降档——均属**如实反映通道关闭**,非回归

## 3. 实现步骤

- [ ] **3.1** 删 `etl/pnp/build_on.py`;`etl/sources/pnp/__init__.py` steps 删该行,原位注释「ON 2026-06-26 改制旧流全删、新 Workforce Priority 流无职业清单 → 不产出(同 BC/SK 先例);清单若重现,按 git 史 build_on 模板重写」
- [ ] **3.2** `git rm data/raw/pnp/oinp-in-demand.json data/raw/pnp/oinp-tech.json`(历史可考)
- [ ] **3.3** 重跑 08→09(零代码改动),抽查 ②③(留意 08 打印的载入省清单)
- [ ] **3.4** 本地 build + DOM 目检 ④(直连生产库,验完关 dev,防 pooler 打满)
- [ ] **3.5** mart 上传 → 生产 seed(SEED_TOKEN)→ 终验 ⑤
- [ ] **3.6** STATUS 记档、盘点/E6-04 连带项结案、commit/push

## 4. 涉及文件

**删**:`etl/pnp/build_on.py` · `data/raw/pnp/oinp-in-demand.json` · `data/raw/pnp/oinp-tech.json`
**改**:`etl/sources/pnp/__init__.py`(steps 一行)
**零改动**(数据驱动回退,列出仅为验收点):`etl/08_score.py` · `etl/09_build_mart.py` · `cms/src/lib/match.ts` · `cms/.../jobs/JobsTable.tsx`(pnp 三档) · PnpListSection/i18n

## 5. 现有代码(回退依据)

- `08_score.py:107` `_load_pnp_tables()` 目录驱动:ON 无文件 = 无 inclusion 表 → `pnp_eligible`(:191)回 TEER0-3 粗筛、`pnp_stream`(:199)回 None、+12(:224)撤;注释本就写明**「某省没文件 = 留空不猜」**——本项正是让 ON 回到这个默认。
- `09_build_mart.py:247` pnp_occupations 同目录驱动;draws.json 无 occupations 键,08/09 天然分流(E6-04 实证)。
- `match.ts:99/:143` 两条规则读 dims/pnpStream,数据空即不触发,规则代码不动。
- 前端三档(JobsTable.tsx:822):stream=None 自然回退绿「可提名」/灰;QC 紫不涉。
- 先例:BC 无清单不产出(sources/pnp 注释)、SK 无抽选不产出(E6-04 §0)——「没数据 = 不产出」。

## 6. 完成定义(DoD)

- [ ] 用户拍板方案 → §2 全勾 + STATUS 记档 + commit/push;E6-04 §0 连带发现与 STATUS 任务卡结案。

## 7. 实施记录

- 2026-07-05 立项 + 调研(§0 实测三页:oinp-tech-draws 顶部通告、2026-updates 新流分档条件、streams 页无清单细则)。**待拍板,未动代码。**
- **跟进钩子**(拍板后写进 3.1 注释):pnp 源周更里 build_draws 的 ON notice 持续盯 oinp 页;e-Filing 重开(夏末)后复查两件事——① 新流若出职业清单 → 新 json 进 raw/pnp 即恢复具名 chip;② 若确认 TEER4-5 全职业可走(reg 已写 CLB4 分档),评估给 ON 建新 type 语义(如 `all`)让 TEER4-5 回绿——**属新语义扩展,另立项,莫混本项**(本项只做保守回退)。
