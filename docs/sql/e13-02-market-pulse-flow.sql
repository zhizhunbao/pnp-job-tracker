-- E13-02(把脉首页 ETL 派生指标)——stats_occupation 补「新增/环比/下架/净值/在架天数/脉象分」七列,
-- stats_daily 补「当日下架计数」一列。算法/权重定案见
-- docs/implementation/E13-把脉首页/00_总设计与口径.md §3(v2,2026-08-06 晚修订;etl/11_build_stats.py 单一实现)。
--
-- v1→v2:closed30d/stats_daily.closed 的下架信号从「postings.last_seen 停更」(实测证伪,虚高约六成)
-- 换成 verify_expired.py 的判死台账(expired_ids.json);pulse_score 动量分量从 net30d/openJobs 换成
-- mom30d(环比涨跌:new30d/new30d_prev−1)。
-- v2→v3:mom30d 的分母窗口 (T−60d,T−30d] 撞上抓取从局部覆盖扩到全 10 省全职业的爬坡期(2026-06-18~
-- 07-02 那两周),v2 实测中位数 +169%,不是真实环比 —— 加 COVERAGE_COMPLETE 闸门(11_build_stats.py
-- 顶部常量,现为 2026-07-02),分母窗起点早于它就整列写 NULL,8-31 起自然解禁。另加窗口更短、当前干净
-- 的 mom14d(new14d/new14d_prev−1),pulse_score 动量分量换成它。本文件新增 new14d_prev/mom14d 两列
-- (new14d 本身不入库,只是算 mom14d 的中间量)。
--
-- 惯例见 db-push-minefield:dev 默认不推 schema,加列一律 docs/sql 手写。纯 ADD COLUMN。
-- 执行顺序:本 DDL 先行 → 部署代码(seed 白名单已含新列;两张 collection 已加字段)
--          → stats_occupation 走 dims 清空重灌自动生效;stats_daily 只 UPSERT 追加,老行的 closed 补不回,
--             留 NULL 即可(不倒查历史)。

ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS new30d        integer;
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS new30d_prev   integer;   -- count(datePosted∈(T−60d,T−30d]),仅作 mom30d 分母,不单独上前端
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS mom30d        numeric;   -- new30d/new30d_prev−1;分母窗撞抓取爬坡期时整列 NULL(见上,8-31 起解禁)
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS new14d        integer;   -- count(datePosted∈(T−14d,T]);S1「近14天新发」主数字直读
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS new14d_prev   integer;   -- count(datePosted∈(T−28d,T−14d]),仅作 mom14d 分母,不单独上前端
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS mom14d        numeric;   -- new14d/new14d_prev−1;new14d_prev<5 记 NULL——眼下唯一干净的环比,pulse_score 动量分量用它
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS closed30d     integer;   -- 源=expired_ids.json 判死台账;排水期虚高,暂不上前端
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS net30d        integer;   -- new30d − closed30d(随台账积累变准)
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS avg_days_open numeric;   -- 天;样本<5 记 NULL(ETL 侧已判)
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS pulse_score   numeric;   -- 0.5·z(mom14d) + 0.3·z(通道命中率) + 0.2·z(薪资偏离)(组内,province 同组)

ALTER TABLE stats_daily ADD COLUMN IF NOT EXISTS closed integer;   -- 当日下架计数,源=expired_ids.json 判死台账;排水期虚高,暂不上前端(口径见 11_build_stats.build_flow_stats 顶部注释)
