# E6-04 · 省 PNP 抽选线(省抽选事实层)

> Epic **E6 数据补强** · 负责人 Frank · 3 SP · 2026-07-05 起手源盘点(上 session),2026-07-05 本文档立项
> 上位分析:[功能价值盘点](../../功能价值盘点与数据缺口.md) §4-P1「各省 PNP 抽选分数线/EOI 历史」。

## 0. 设计修正(2026-07-05 实测源盘点,推翻交接假设)

交接文档(STATUS E6-04 段)原设想「诚实分两档」:A 档=发布 CRS 线的 EE 对齐流(OINP Tech Draws / AAIP EE 流)可算「差 X 分」;B 档=省自有分制只做事实展示。**实测结论:A 档在 2026-07 已全灭,全部走 B 档(事实展示),不加 match 规则**:

| 省 | 2026-07 实况(httpx 实测) | 结论 |
|---|---|---|
| **ON** | **2026-06-26 OINP 改制**(O.Reg 422/17):旧 8 流全删、EOI 关闭、不再发邀请;新「Ontario Workforce Priority」流待夏末开放 e-Filing。oinp-tech-draws 页只剩通告,无抽选表 | 无未来抽选;**出改制通告行(notice)** |
| **AB** | alberta.ca/aaip-processing-information「Table 10. Draw information」齐全(日期/流/最低分/邀请数),但 **2026 已换 WEOI 自有分制**——连 Alberta Express Entry Stream 的最低分也是 WEOI 分(47-71 区间),非 CRS | 抓,标注 WEOI 分制 |
| **BC** | welcomebc.ca invitations-to-apply **httpx 200**(交接猜的 403 不成立,带 Chrome UA 即通);干净 HTML 表:Date/ITA type/Selection factors/Minimum score/Number of invitations(SIRS 自有分制,~111-136) | 抓,标注 SIRS 分制 |
| **MB** | immigratemanitoba.com/draws/ 索引页含近期各期正文(prose 无表):期号/日期/流/LAA 数/(有时)最低分,MPNP 自有 1000 分制 | 抓,prose 解析,解析不到的字段留空 |
| **SK** | **2025 改制后无 EOI 抽选**:sinp-processing-statistics 只有处理时长+行业配额窗口(Employment Offer 模式,job offer 前置) | 不产出(某省没数据=不猜) |
| QC | 不属 PNP(设计既定) | 不适用 |

**推论**:「差 X 分」维持联邦 EE 独有(match 规则 3 不动);省抽选线是**事实层**——弹框展示 + 快报素材(raw 留全量)。**诚实红线:省分数必须带分制标注(≠CRS),展示措辞循「粗筛信号,非资格认定」。**

**连带发现(本项不改,已另记)**:OINP 改制后,现有 oinp-in-demand(56 NOC)/oinp-tech(9 NOC)清单对应的旧流已关闭,前端「OINP 紧缺技能/科技」具名 chip 语义存疑——待新 Workforce Priority 流细则公布后另立项处理;本项的 ON 通告行先把改制事实摆到弹框里。

## 1. 整体目标

省 PNP 抽选事实进弹框:点 PNP 字段,清单区顶部新增「本省最近抽选」块——日期/流/最低分(带省分制标注)/邀请数,行级来源链+抓取日。数据链循全套既有模式:`etl/pnp/build_draws.py`(pnp 源周更)→ `raw/pnp/draws.json` → 09 → `mart/pnp_draws.json` → seed → 新维度表 `pnp_draws` → props 进 PnpListSection。

## 2. 验收标准

- [x] ① `build_draws.py` 三省一通告跑通(2026-07-05 实跑):BC 12 条(rowspan 展开器)、AB 12 条(Table 10)、MB 10 条(prose;多流通用抽选 score 按「宁可留空」置 null)、ON 1 条 notice;**08_score 目录驱动不受影响**(实证:载入省仍 AB/NS/ON/SK,draws.json 无 occupations 键被 08_score.py:118 跳过)
- [x] ② mart/pnp_draws.json 25 行(BC 8/AB 8/MB 8/ON notice 1),列对齐 DB
- [x] ③ PnpDraws collection + seed 白名单 + payload-types 重生成 + `npm run build` 过
- [ ] ④ 弹框:BC/AB/MB 岗顶部见最近抽选(分数带分制短标注);ON 岗见改制通告;SK/QC 岗此块不出现;三语(**代码就绪,验证卡 ⑤ 的 DDL——本地 dev 也直连生产库**)
- [ ] ⑤ 生产:DDL 先行(含 payload_locked_documents_rels.pnp_draws_id,B7 清单)→ push → seed → 生产弹框终验(**卡用户授权:生产 DDL 被会话权限拦下,SQL 已备好见 §7**)

## 3. 实现步骤

- [x] **3.1** `etl/pnp/build_draws.py`:单脚本一个清洗关注点(省抽选事实)。每省一个 parse 函数,抓取失败/解析空=保留旧数据(循 build_on 模式);挂 `etl/sources/pnp/__init__.py` steps。
- [x] **3.2** `09_build_mart.py`:读 raw/pnp/draws.json → mart `pnp_draws`(每省最新 ≤8 条)。
- [x] **3.3** CMS:`collections/PnpDraws.ts`(照 EeCategories 模式)+ payload.config 注册 + seed dims[] 一条 + payload-types 重生成。
- [x] **3.4** 前端:page.tsx dims 加 pnpDraws → AdvisorModal/FieldFactsSection 链 → PnpListSection 顶部 `PnpDrawsBlock` + i18n 三语键(pnpdraws.title/scale/min/inv/notice)。
- [ ] **3.5** 本地 build ✅ → 生产 DDL(卡授权)→ push(Render 自动部署)→ 触发生产 seed → 终验。

## 4. 涉及文件

`etl/pnp/build_draws.py`(新) · `etl/sources/pnp/__init__.py` · `etl/09_build_mart.py` · `cms/src/collections/PnpDraws.ts`(新) · `cms/src/payload.config.ts` · `cms/src/app/seed/route.ts` · `cms/src/app/(frontend)/jobs/page.tsx` · `cms/src/app/(frontend)/jobs/JobsTable.tsx` · `cms/src/app/(frontend)/jobs/i18n.ts`

## 5. 现有代码(复用点)

- 抓取模板:`etl/pnp/build_on.py`(httpx+bs4、失败保留旧表)、`etl/build_ee_draws.py`(draws.json 形态先例,tracked)。
- 08_score `_load_pnp_tables()` 目录驱动扫 `raw/pnp/*.json`,但要求 `province`+`occupations` 两键才收——draws.json 天然被跳过,无需改 08。
- 维度链先例:pnp_occupations 全链(mart 三元组 → seed 白名单 → page.tsx dims → PnpListSection props)。
- B7 教训:新 collection 手写 DDL 必须给 `payload_locked_documents_rels` 补 `pnp_draws_id` 列+索引+FK,否则 seed delete 阶段整事务炸。

## 6. 完成定义(DoD)

- [ ] §2 全勾 + STATUS 记档 + 盘点文档 §4-P1 行结案 + commit/push。

## 7. 实施记录

- 2026-07-05 立项。源盘点实测推翻交接的两档假设(§0);落库两方案中选**新维度表**(方案②嵌现有行不成立:BC/MB 在 pnp_occupations 无行可嵌,嵌 provinces json 列偏离既有扁平维度模式)。
- 2026-07-05 代码侧全落地(3.1-3.4 + build 过)。**生产 DDL 被会话权限拦下(直连正式库的 CREATE/ALTER 需用户授权)→ push/seed/终验连锁挂起**(代码先上而表不存在会让 /jobs 的 payload.find 500,B4 教训:先 DDL 再 push)。待授权后执行的 SQL(形状照生产 ee_categories information_schema 实查,B7 rels 清单齐):

```sql
CREATE TABLE IF NOT EXISTS pnp_draws (
  id serial PRIMARY KEY,
  province varchar, kind varchar, draw_date varchar, stream varchar,
  score numeric, scale varchar, invitations numeric, note varchar,
  label varchar, url varchar, fetched varchar,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pnp_draws_province_idx ON pnp_draws (province);
CREATE INDEX IF NOT EXISTS pnp_draws_updated_at_idx ON pnp_draws (updated_at);
CREATE INDEX IF NOT EXISTS pnp_draws_created_at_idx ON pnp_draws (created_at);
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pnp_draws_id integer;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pnp_draws_id_idx
  ON payload_locked_documents_rels (pnp_draws_id);
ALTER TABLE payload_locked_documents_rels
  ADD CONSTRAINT payload_locked_documents_rels_pnp_draws_fk
  FOREIGN KEY (pnp_draws_id) REFERENCES pnp_draws(id) ON DELETE CASCADE;
```
