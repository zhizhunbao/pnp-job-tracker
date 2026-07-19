-- stats 表加 NOC 中类维度列(2026-07-19,图表三级下钻 省→大类→中类→职位板)
-- 幂等;加列即可,无需回填——下一轮 ETL 整点重灌 stats 全表(11_build_stats.py 已带 mid)。
-- 行量:119 → ~600(10 省 × 大类 × 在场中类),无需索引。
ALTER TABLE stats ADD COLUMN IF NOT EXISTS mid varchar;
