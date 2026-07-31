-- E8-14b(2026-07-31 Frank「改成范围啊」):职业统计表补 ESDC 低/高位年薪两列。
-- 口径与 median_wage_annual 同族:每岗按其 NOC×省 查 ESDC 官方表的 low/high,再取中位(etl/11_build_stats.agg)。
-- 纯增量 ADD COLUMN(DB_PUSH 雷区惯例:加列一律 docs/sql 手写,不跑 payload push);
-- 执行顺序:本 DDL 先行 → 部署代码(seed 白名单已含新列)→ 清 seed_state('stats_occupation') → 重灌。
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS wage_low_annual numeric;
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS wage_high_annual numeric;
