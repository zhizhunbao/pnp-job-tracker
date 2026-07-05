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

- [x] ① `raw/pnp` 无 oinp-*.json;`build_on.py` 及 sources/pnp step 移除;08→09 跑通(2026-07-05 实跑 16341 岗)
- [x] ② 08 产物:pnpStream 全站仅剩 SK/AB/NS 六通道(OINP 0);ON TEER4-5 岗 945 个全部 `pnpEligible=false`;抽查 ON 44101(PSW)= false/None/43 分(改前 55 = 撤 +12 实证)
- [x] ③ mart `pnp_occupations` 182 行、ON 0 行(只剩 AB/NS/SK);`pnp_draws` 25 行、ON 改制通告行仍在
- [x] ④ 生产 SSR 实测(offer2pr.com/jobs):开放岗零 OINP chip;pnp_draws ON 通告(note "OINP redesign…")在 props 里照传;match 两规则数据驱动(dims 无 ON 行即不触发,规则代码零改动)
- [x] ⑤ 生产:mart 传 Storage(16 表,含重跑的 rankings/stats)→ seed ok:true(pnp_occupations 182/jobs 12671)→ 终验同 ④
- [x] ⑥ 连带影响记档:sponsor-likely 榜单重建后 30 家具名命中(不再含 OINP 聚合);邮件提醒 match 降档属如实。**已知残值(待用户授权 DML)**:3 个「本次 mart 未含、发布<30 天」的 open ON 岗仍带旧 OINP stream——seed 只更新本批岗、下架只杀 30 天+,旧值最多滞留 30 天自然消亡;一次性清理 SQL 见 §7

## 3. 实现步骤

- [x] **3.1** 删 `etl/pnp/build_on.py`;`etl/sources/pnp/__init__.py` steps 删该行,原位注释记改制事实与恢复路径
- [x] **3.2** git rm 两份清单(历史可考)
- [x] **3.3** 重跑 08→09 **+ 10/11**(rankings 的 sponsor-likely 第二排序键聚合具名通道,必须连带重建),抽查 ②③
- [x] **3.4** 前端零代码改动,本地 DOM 目检以生产 SSR 终验代替(④)
- [x] **3.5** mart 上传 → 生产 seed(SEED_TOKEN,offer2pr.com/seed)→ 终验 ⑤
- [x] **3.6** STATUS 记档、commit/push(与同批 UI 三修一起合 main 部署)

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

- [x] 用户拍板方案 A(2026-07-05)→ §2 全勾 + STATUS 记档 + commit/push;E6-04 §0 连带发现与 STATUS 任务卡结案。§7 残值 SQL 用户授权「跑」后已执行(3+3 行,残值归零,SSR 复核 0 chip/通告在)——**本项全结**。

## 7. 实施记录

- 2026-07-05 立项 + 调研(§0 实测三页:oinp-tech-draws 顶部通告、2026-updates 新流分档条件、streams 页无清单细则)。
- 2026-07-05 用户拍板方案 A,当日全链落地:代码删除 → 08/09/10/11 重跑 → mart 上传 → push(Render 部署)→ 生产 seed ok:true → SSR 终验。**教训记档:rankings(10)不重跑会带着旧 mart 的 OINP 聚合上载**——凡动 jobs 信号列,10/11 连带重跑。
- **残值发现**:seed 增量模型的结构性边角——「本批 mart 未含 + 发布<30 天」的 open 岗不被更新也不被下架,旧信号最多滞留 30 天(本次 3 行,VON Canada PSW 等)。一次性清理(直连生产,**需用户授权后执行**;不执行则 8 月初自然下架):

```sql
UPDATE jobs SET pnp_stream = NULL WHERE pnp_stream LIKE 'OINP%';
UPDATE jobs SET pnp_eligible = false WHERE province='ON' AND teer IN (4,5) AND pnp_eligible = true;
```

  → **已执行**(2026-07-05 用户授权「跑」,单事务):清 stream 3 行 + 翻 eligible 3 行,残值归零;SSR 复核 0 chip、通告行在。

- **跟进钩子**:pnp 源周更里 build_draws 的 ON notice 持续盯 oinp 页;e-Filing 重开(夏末)后复查两件事——① 新流若出职业清单 → 新 json 进 raw/pnp 即恢复具名 chip;② 若确认 TEER4-5 全职业可走(reg 已写 CLB4 分档),评估给 ON 建新 type 语义(如 `all`)让 TEER4-5 回绿——**属新语义扩展,另立项**。
- **跟进钩子**(拍板后写进 3.1 注释):pnp 源周更里 build_draws 的 ON notice 持续盯 oinp 页;e-Filing 重开(夏末)后复查两件事——① 新流若出职业清单 → 新 json 进 raw/pnp 即恢复具名 chip;② 若确认 TEER4-5 全职业可走(reg 已写 CLB4 分档),评估给 ON 建新 type 语义(如 `all`)让 TEER4-5 回绿——**属新语义扩展,另立项,莫混本项**(本项只做保守回退)。
