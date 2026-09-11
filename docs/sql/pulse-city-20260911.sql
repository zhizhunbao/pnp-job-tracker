-- 城市段重设计批(2026-09-11,设计稿 docs/design/把脉页城市段-20260911.md)
-- DDL 先行:生产先跑这段,再 push 带 collection 字段的代码。
-- stats_city 加两列(additive):
--   pilot           = 城内 Job Bank 帖的试点打标聚合(RCIP / FCIP / RCIP+FCIP;无为 NULL)
--   pilot_community = 试点社区官方名('Sudbury, ON';表 3 按它汇总各社区在招)
-- 快照内容自本批起由 seed 收尾在库内重算(SQL.REFRESH_CITY_STATS,与职位板同一份 WHERE)——
-- mart 侧 stats_city 文件照灌但随即被覆盖(留置减法)。

ALTER TABLE stats_city ADD COLUMN IF NOT EXISTS pilot varchar;
ALTER TABLE stats_city ADD COLUMN IF NOT EXISTS pilot_community varchar;

-- 同日当晚追加:大类分布随快照聚合(jsonb {大类: 在招数})——「行业对比」表改读快照,
-- 原 jobs 现查在 IO 弱库上一次缓存失效全表扫 ~30s(pg_stat_activity 实拍),城市段从此零现查。
ALTER TABLE stats_city ADD COLUMN IF NOT EXISTS by_broad jsonb;

-- 批二(同日晚,Frank「城市的人口 gdp 失业率 没有吗」):cities 维度挂五格城市刻度
-- (statcan 域段6:CSD 人口 17-10-0155 + CMA 失业率 14-10-0459;GDP 城市级止 2022 评估不上)。
-- 🔴 unemp_rate 是 CMA 口径(素里=温哥华都会区值),展示层列名写「都会区失业率」。
ALTER TABLE cities ADD COLUMN IF NOT EXISTS population integer;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS pop_period varchar;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS unemp_rate numeric;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS unemp_period varchar;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS cma varchar;
