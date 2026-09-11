-- 城市段重设计批(2026-09-11,设计稿 docs/design/把脉页城市段-20260911.md)
-- DDL 先行:生产先跑这段,再 push 带 collection 字段的代码。
-- stats_city 加两列(additive):
--   pilot           = 城内 Job Bank 帖的试点打标聚合(RCIP / FCIP / RCIP+FCIP;无为 NULL)
--   pilot_community = 试点社区官方名('Sudbury, ON';表 3 按它汇总各社区在招)
-- 快照内容自本批起由 seed 收尾在库内重算(SQL.REFRESH_CITY_STATS,与职位板同一份 WHERE)——
-- mart 侧 stats_city 文件照灌但随即被覆盖(留置减法)。

ALTER TABLE stats_city ADD COLUMN IF NOT EXISTS pilot varchar;
ALTER TABLE stats_city ADD COLUMN IF NOT EXISTS pilot_community varchar;
