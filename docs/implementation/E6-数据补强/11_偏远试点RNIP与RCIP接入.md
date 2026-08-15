# E6-11 · 偏远与乡村试点（RCIP / FCIP，原 RNIP）接入

> 立项 2026-07-26（Frank 走查：「还有偏远试点区域也没有」）；**2026-08-14 重新拍板激活**
> （Frank：「通道要标明哪些是 pnp aip 或者 rcip 吧」「RCIP 也立项」）。
> 08-14 起点更新:`data/crawl/fed-rcip/` 已在周更役里（IRCC rural-franco-pilots 整节 30 页,
> 含参与社区名单页）——§3.1 的名单源不用再找,直接从 crawl 读。
> 联动 L2-09(决策页 offer 档):RCIP 行的「看在招岗」链接等 `jobs.pilot` 落地后才给
> （职位板筛选参数也要新增 `pilot`,与 `pnp`/`aip` 同款）。
> 起因：站上的移民信号只有 PNP、EE 类别、AIP 三条；**偏远/乡村试点整条路缺席** ——
> 而它恰恰是低 TEER、小城市岗位最现实的一条路，正好覆盖本站占比最大的那批岗
> （低门槛可提名岗 4,761 个，餐饮 490、零售 459、照护 383…）。

## 1. 整体目标

把「这个岗所在的社区是不是试点社区、该社区当前收哪些职业」变成可判定的字段，与 AIP 同级别地进入通道判定。

## 2. 验收标准

- [x] `pilot_communities` 表（新）：社区名、省、试点类型（RCIP / FCIP）、官方页、抓取日 —— 2026-08-15 批A 落库
      （20 社区 = 14 RCIP + 6 FCIP，源=fed-rcip crawl 的 IRCC 名单页;docs/sql/e6-11-pilot.sql）
- [x] 社区职业要求落库：`pilot_occupations` 503 行(18 社区,基本每社区 25 NOC;仅 1 行 sectorOnly)——
      批B 2026-08-15,agent 四路逐站抽取(官方页/PDF/组件数据源),docs/sql/e6-11-pilot-b.sql
- [x] **指定雇主维度**:2,516 家并入 designated_employers(source=RCIP/FCIP,location=社区名);
      Thunder Bay 官方标 excluded-from-2026 的 70 行已剔;Peace Liard 官方明示待公示(原句在 raw note);
      05f 归一匹配(与 05c/designationMatch 同口径)→ `jobs.pilot_employer`,在招命中 139 岗;
      弹框只做正向展示(false≠未指定,名单未公布的社区不写反话)
- [x] 职位侧：`jobs.pilot`（RCIP|FCIP|RCIP+FCIP）+ `jobs.pilot_community`（命中社区名）—— 批A:
      判定在 `etl/clean/05f_flag_pilot.py`（城市×省 精确匹配人工核对映射,不走 08_score;
      与 05c AIP 同款「一字段一脚本」），首轮 1,915/93,844 岗命中
- [x] 前端：与 PNP/EE/AIP 同款——列(RCIP/FCIP) + 胶囊 + 弹框（三态直判 + 社区名 + IRCC 官方出处行）
      + 筛选 fPilot(yes/RCIP/FCIP/no,URL 短名 pilot=) + 决策页 RCIP 行看岗链接
- [x] 三语 label（col/all/grp/ch.pilot.on|na/fact.pilotGate/dp.planSeeJobsPilot）

## 3. 实现步骤

- [x] **3.1** 抓官方社区名单（etl/build_pilots.py,IRCC 页 h3 标题锚切 RCIP/FCIP 两段;解析塌方哨兵保旧）。
- [x] **3.2** 地点匹配：人工核对映射（CITY_MAP,生产库城市名实测）——**单城社区 12 个**直接映射
      （含 Sudbury 双写名 Sudbury/Greater Sudbury）；**区域型社区 6 个 cities=[] 不打标**
      （Pictou County/West Kootenay/North Okanagan Shuswap/Peace Liard/Acadian Peninsula/Superior East,
      界线待社区官网举证后补,种子已进 crawl）。宁漏勿错执行到位。
- [x] **3.3** 逐社区职业要求页已抽(批B);区域社区界线全部举证补齐(CITY_MAP 20/20,城市键 68,
      试点岗 1,915→2,923;Rhineland 辖内/Bas-Caraquet 官方未单列 → 仍不映射)。
- [x] **3.4** 打标在 05f(城市匹配,不进 08_score);mart 列对齐(09);seed 加载(维度三元组+jobs 两列)。
- [x] **3.5** 前端字段与弹框,口径注=fact.pilotGate「试点为社区推荐制,雇主须先获社区指定;命中≠资格认定」。

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
