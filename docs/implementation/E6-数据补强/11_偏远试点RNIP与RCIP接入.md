# E6-11 · 偏远与乡村试点（RCIP / FCIP，原 RNIP）接入

> 立项 2026-07-26（Frank 走查：「还有偏远试点区域也没有」）。
> 起因：站上的移民信号只有 PNP、EE 类别、AIP 三条；**偏远/乡村试点整条路缺席** ——
> 而它恰恰是低 TEER、小城市岗位最现实的一条路，正好覆盖本站占比最大的那批岗
> （低门槛可提名岗 4,761 个，餐饮 490、零售 459、照护 383…）。

## 1. 整体目标

把「这个岗所在的社区是不是试点社区、该社区当前收哪些职业」变成可判定的字段，与 AIP 同级别地进入通道判定。

## 2. 验收标准

- [ ] `pilot_communities` 表（新）：社区名、省、试点类型（RCIP / FCIP）、状态、官方页、抓取日
- [ ] 社区职业要求落库（各社区自行公布优先职业/行业时）：`pilot_occupations`（社区 × NOC），无清单的社区**留空不猜**（同 PE/NL 惯例）
- [ ] 职位侧：`jobs.pilot`（社区命中）+ `jobs.pilot_stream`（命中的社区名/类型），走 08_score 判定
- [ ] 前端：与 PNP/EE/AIP 同款——列 + 胶囊 + 弹框（判定 + 凭什么 + 官方出处）
- [ ] 三语 label

## 3. 实现步骤

- [ ] **3.1** 抓官方社区名单（IRCC 页：Rural Community Immigration Pilot / Francophone Community Immigration Pilot）。
- [ ] **3.2** 地点匹配：社区名 → 本站 `city`（**这一步是主要风险**，见 §5）。
- [ ] **3.3** 逐社区找职业要求页（多数社区自建站，格式各异）→ 有 NOC 的落库，只给行业名的留空不猜。
- [ ] **3.4** 08_score 增加 pilot 判定；mart 列对齐；seed 加载。
- [ ] **3.5** 前端字段与弹框，口径注写明「试点由社区推荐，需社区背书，非省提名」。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| `etl/sources/pilot/build_pilots.py`（新） | 社区名单 + 职业要求 |
| `data/raw/pilot/*.json` / `data/mart/pilot_*.json` | 原料 / 集市 |
| `etl/08_score.py` | 判定接入 |
| `cms/src/collections/Jobs.ts` + 新维度表 | schema（DDL 先行） |

## 5. 红线与坑

- **社区名匹配是最大坑**：官方社区名与 Job Bank 的 city 未必同名（Sault Ste. Marie / North Bay 这类还好，
  乡村社区常带 Township/Regional Municipality 后缀）。宁可漏配也不要错配——错配=告诉用户「你这岗能走试点」而其实不在范围。
- 试点是**社区推荐制**，与省提名是两回事；文案不许把「社区在名单上」说成「你能移民」。
- 前身 RNIP 已结束、现行为 RCIP/FCIP —— 别把旧 RNIP 社区名单当现行（同 ON 旧通道教训）。

## 6. 完成定义（DoD）

- [ ] §2 全勾；生产复验：命中社区的岗显示试点标与依据，非试点社区无标；抽样 5 个社区对官方页逐字核。
