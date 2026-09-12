-- 2026-09-12 城市段 AIP 表(Frank「AIP 也需要一个城市的表」):stats_city 加 aip_jobs 列
-- (该城在招中 AIP 资格岗数;jobs.aip 每轮 seed 已灌,快照随 REFRESH_CITY_STATS 收尾聚合)。
-- 加列 additive,不动既有列;惯例:生产加列 docs/sql 手写 DDL 先行,DB_PUSH 不碰。
ALTER TABLE stats_city ADD COLUMN IF NOT EXISTS aip_jobs integer;
