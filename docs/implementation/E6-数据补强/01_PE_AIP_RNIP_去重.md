# E6-01 · 数据补强：PE AIP / RNIP / 内容级去重

> Epic **E6 数据补强** · 负责人 Frank · 4 SP · 批次 B9（**已让位**：2026-07-03 产品重设计提案采纳后，容量让给 E5-00 档案匹配 + E5-04 地区统计；入学后再排）
> 通用约定与索引见 [实现文档 README](../README.md)。决策 D9：#5 公司官网、MB PNP 不进本期。RNIP 做成后升格为 E5-04 统计页的输入之一。

---

## 1. 整体目标

按性价比补三个信号缺口：① AIP 指定雇主补 PE 省；② RNIP 试点社区标记（advisor-fields-plan #6）；③ JB 重发岗内容级去重（运维注意②的根治）。三项相互独立，可各自单独收口。

## 2. 验收标准

- [ ] ① `06_scrape_aip` 覆盖 PE → designated_employers 含 PE 记录，AIP 匹配对 PE 岗生效。
- [ ] ② 新 RNIP 社区维护表（IRCC 官方清单，httpx）→ 岗位地点命中试点社区 → 地点弹框事实块显示 + 来源行（E4-04 机制）。
- [ ] ③ mart 按（公司+标题+城市）识别 JB 重发 → 合并为一条（保最新 posting_id，firstSeen 取最早）→ open 岗虚高收敛。
- [ ] 三项均过数据回归清单（岗位数变化可解释）。

## 3. 实现步骤

- [ ] **3.1 PE AIP**：`etl/06_scrape_aip_employers.py` 加 PE 源（PE 官网名单页，httpx；结构参照 NL/NB/NS 现有解析）。
- [ ] **3.2 RNIP**：`etl/build_rnip_communities.py`（新）→ `raw/rnip/communities.json`（跟踪）；09 按 city/province 打 `rnipCommunity` 标 → Jobs.ts 加字段（重启+重灌）→ 地点事实块显示。
- [ ] **3.3 去重**：09 加合并 pass（normName 复用 05c 的规范化）；**先跑统计**（重发对数量级）再决定合并策略细节，记录进本档。
- [ ] **3.4** 每项独立 commit + 回归。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| `etl/06_scrape_aip_employers.py` | ① PE 源 |
| `etl/build_rnip_communities.py`（新）· `Jobs.ts` · 地点事实块 | ② RNIP |
| `etl/09_build_mart.py` | ③ 合并 pass |

## 5. 现有代码

- ① STATUS 记载「PE 仍 TODO」，NL/NB/NS 解析器现成。
- ③ STATUS 运维注意②已预判：「真要去重得按内容(公司+标题)而非 posting_id」。

## 6. 完成定义（DoD）

- [ ] 完成的子项各自 §2 勾选（允许部分收口——本批是降级预案牺牲位）。
