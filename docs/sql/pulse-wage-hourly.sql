-- 把脉页招聘对比:时薪三列(2026-09-11 Frank「中位时薪,最低时薪 最高时薪」)
-- ESDC 官方工资带低/中/高位时薪,按桶内在招岗取中位 —— 口径同 median_wage_annual,
-- 见 etl/mart/functions.py to_stats_row 段注释。加列 additive,不动既有列。
ALTER TABLE stats ADD COLUMN IF NOT EXISTS wage_low_hourly numeric;
ALTER TABLE stats ADD COLUMN IF NOT EXISTS wage_med_hourly numeric;
ALTER TABLE stats ADD COLUMN IF NOT EXISTS wage_high_hourly numeric;
