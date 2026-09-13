-- 城市段行业 / 试点 / AIP 表加最低时薪与中位时薪(2026-09-12 Frank「这些都加一个 查岗位的 操作列,
-- 并加 最低时薪 和 中位时薪」)。口径同招聘对比横表:ESDC 官方工资带的下端 / 中位,桶内在招岗取中位。
-- 行业表的两格进 stats_city.by_broad jsonb(格加 'low' 键,不用加列);试点与 AIP 两组表加四列:
--   aip_wage_low_hourly / aip_wage_med_hourly   = 城内 AIP 资格岗(jobs.aip = true)的官方带
--   pilot_wage_low_hourly / pilot_wage_med_hourly = 试点社区(pilot_community)覆盖城全部在招岗的官方带,
--                                                  按社区一次算好写在每个城行上(同社区各城同值)
-- 值随 seed 收尾 SQL.REFRESH_CITY_STATS 重算;换版到下轮 seed 之间是 NULL,前端显杠。
-- 加列 additive,不动既有列;惯例:生产加列 docs/sql 手写 DDL 先行,DB_PUSH 不碰(照 pulse-city-aip.sql)。
ALTER TABLE stats_city ADD COLUMN IF NOT EXISTS aip_wage_low_hourly numeric;
ALTER TABLE stats_city ADD COLUMN IF NOT EXISTS aip_wage_med_hourly numeric;
ALTER TABLE stats_city ADD COLUMN IF NOT EXISTS pilot_wage_low_hourly numeric;
ALTER TABLE stats_city ADD COLUMN IF NOT EXISTS pilot_wage_med_hourly numeric;
