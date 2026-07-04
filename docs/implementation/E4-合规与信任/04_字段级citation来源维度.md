# E4-04 · 字段级 citation + 来源解释（field_sources 维度）

> Epic **E4 合规与信任** · 负责人 Frank · 3 SP · Sprint 2 · 批次 B6（**信任红线，超载时砍别的不砍它**）
> 完整设计见 [advisor-fields-plan.md Part C](../advisor-fields-plan.md)（字段→来源映射表在那里，单一来源不复制）。
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

用户要求：**所有字段都要从网上抓 citation 和来源解释**。每个字段事实块统一带来源行（官方链接 + 抓取的来源解释 + 抓取日期）；来源元数据由 ETL 抓取验证，收口成 `field_sources` 维度。

## 2. 验收标准

- [ ] 每个字段弹框事实块底部有来源行；**记录级 URL 优先**（pnp 通道 url / applyUrl 原帖 / 省 AIP 名单），数据集级兜底。
- [ ] 来源解释 = 抓取页面 `<title>`/meta description **原文**（不经 LLM 不翻译）；抓取失败 → unverified 只出链接（宁可留空）。
- [ ] 派生字段（score/vsMedian/状态口径等）明示「本站派生」+ 口径一句 + 底层来源链。
- [ ] `jobFacts()` 每行事实带来源短标注，AI 判断/对话能指回来源。
- [ ] 断源演练：故意改坏一个注册 URL → 前端降级为 unverified，不报错。

## 3. 实现步骤

- [ ] **3.1** `etl/build_field_sources.py`（新，挂 `pnp` 源周更）：注册表 fieldKey→{publisher, url, kind: dataset|derived}；URL 聚合自各 build 脚本既有常量与维护表 `url`/`fetched`（**不重复维护**）；httpx 逐 URL 验证 200 + 抽 title/meta description → `raw/sources/field-sources.json`（跟踪）。
- [ ] **3.2** 09 mart 产 `field_sources.json` 维度；派生字段的口径文案也进维度（单一来源）。
- [ ] **3.3** seed：新 collection `field-sources`（**dims 白名单加字段映射**——坑 2）；重启 dev 推 schema + 重灌。
- [ ] **3.4** 前端 `FieldFactsSection` 加 `<SourceLine field job dims>`：「来源：{publisher}（链接）· 抓取于 {fetched}」+ 解释摘录；PNP 块 surface 各通道已有的 `url`+`fetched`。
- [ ] **3.5** advisor route `jobFacts()` 行尾加来源短标注（如 `[src: ESDC wage data 2024]`）。
- [ ] **3.6** 断源演练 + 全字段弹框过一遍。

## 4. 涉及目录 / 文件

| 路径 | 角色 | 状态 |
|---|---|---|
| `etl/build_field_sources.py`（新）· `etl/sources.py` | 抓取 + 调度 | 新建/改 |
| `etl/09_build_mart.py` · `cms/src/app/seed/route.ts` · 新 collection | 维度链路 | 改/新建 |
| `jobs/JobsTable.tsx`（FieldFactsSection）· `api/advisor/route.ts` | 展示 + prompt | 改 |

## 5. 现有代码

- pnp/*.json 每通道**已有** `url`+`fetched`（如 sk-tech.json → saskatchewan.ca + 2026-06-27）——只是没显示；build_wages/build_noc_descriptions/build_ee_draws 的源 URL 在脚本常量里。
- FieldFactsSection 框架已就绪（Part A 完成项），加统一底行增量小。

## 6. 完成定义（DoD）

- [ ] §2 全勾（含断源演练）+ 数据回归清单 + push。
