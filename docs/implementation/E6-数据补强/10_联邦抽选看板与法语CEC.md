# E6-10 · 联邦抽选看板（CEC / 法语 / 类别轮次全量）

> 立项 2026-07-26（Frank 走查连报：「ee stem 好久没有抽人了吧 现在都是在抽 cec 和法语吧」「cec 和法语 通道也没有」）。
> 起因：站上只有**按 NOC 划分的类别抽选**（ee_categories），于是出现两个问题——
> ① 久未抽选的类别照旧当活信号显示（STEM 上次 2024-04，27 个月前）；
> ② 现阶段真正在大量发邀的 **CEC 与法语类别**站上完全没有，用户拿着 EE 标会误判。
> 展示层的止血已于 2026-07-26 上线（休眠降级 + 弹框口径注，见 `25c7f79`）；本立项做**数据层补全**。

## 1. 整体目标

把**联邦 Express Entry 的抽选事实**完整落库并可查：各轮次的日期、类型（general / program-specific / category-based）、
CRS 分数线、发邀数；让站上的 EE 信号从「这个岗属于某类别」升级为「这条路现在还通不通、要多少分」。

## 2. 验收标准

- [ ] `ee_draws` 表（新）落库官方 rounds-invitations 全量轮次：`draw_no / date / type / category / crs / invitations / url / fetched`
- [ ] 类型至少区分：General、CEC、FSW、FST、PNP-linked、French-language proficiency、各 category-based
- [ ] EE 弹框的口径注改成**活数据**（现为静态文案）：「最近 N 轮里 CEC x 轮、法语 y 轮、类别 z 轮」
- [ ] 休眠判定改吃 `ee_draws`（现吃 ee_categories.draw_date，只有类别轮次）
- [ ] 法语类别有独立呈现：它按语言能力判定、不按职业划 —— 不能挂到岗位上，只能作为**通道说明 + 分数线参考**

## 3. 实现步骤

- [ ] **3.1** 抓取：`etl/sources/ee/build_ee_draws.py` —— 官方 rounds-invitations 页（含历史分页）。
      canada.ca 容器 httpx 直取（[[pnp-ee-data-sources]] 惯例：先试直取，别默认抓不了）。
- [ ] **3.2** 清洗：轮次类型归一（官方文案里 "Canadian Experience Class" / "French language proficiency (Version 1)" 等）→ 有限枚举。
- [ ] **3.3** mart：`data/mart/ee_draws.json`，列对齐 DB；seed 纯加载。
- [ ] **3.4** 前端：EE 弹框「联邦抽选近况」块（最近 10 轮，类型着色）；休眠判定换源。
- [ ] **3.5** 三语 label（类型名与说明）。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| `etl/sources/ee/build_ee_draws.py`（新） | 抓取+清洗 |
| `data/raw/ee/draws.json` / `data/mart/ee_draws.json` | 原料 / 集市 |
| `cms/src/collections/EeDraws.ts`（新） | schema（DDL 先行，见 [[db-push-minefield]]） |
| `cms/src/app/(frontend)/jobs/JobsTable.tsx` | EE 弹框块 + 休眠判定换源 |

## 5. 红线与坑

- **不许把法语类别挂到岗位上**：它按语言能力判定，与职业无关；挂上去就是撒谎。
- 类别归属仍是事实（STEM 岗确实属 STEM），**休眠 ≠ 不属于**——文案别把两者混同。
- 历史轮次很多，前端只展示最近 N 轮 + 可展开；别把全量塞进弹框（同 #123 教训）。

## 6. 完成定义（DoD）

- [ ] §2 全勾；生产复验：EE 弹框显示最近轮次真数据，STEM 岗仍标休眠且口径注为活数据。
