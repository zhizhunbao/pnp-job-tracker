-- E8-14 ④ · 职业/城市统计补两列:ESDC 官方中位年薪 + 帖面薪资样本量
-- 背景(2026-07-28 Frank 放行):主图右轴一直只有**本站自算**的帖面中位,
-- 实核发现全国 17 个职业、分省 723 行是「1 个在招岗 + 一个中位年薪」—— 单样本叫中位数,
-- 在以「真实数据」为卖点的站上不能留。而这张表要往留学规划/职业规划扩展,更得站在官方数上。
--
-- median_wage_annual = ESDC 官方口径(每个岗按其 NOC×省 查官方工资表再取中位),与省级 stats 表同口径;
-- salary_n           = 有帖面薪资的岗位数 = 帖面中位的样本量(前端据此决定报不报,不在前端瞎定阈值)。
-- 实测:489 个职业里 488 个有官方中位;帖面样本 <5 的 73 个职业**全部**有官方数 —— 不必靠隐藏遮丑。
--
-- 跑法:先在生产跑这段(加列不改既有数据),再 push 带新字段的代码,最后
--       DELETE FROM seed_state WHERE name IN ('stats_occupation','stats_city'); 再灌
--       (表级哈希一致会静默跳过 counts=-2,这坑 2026-07-28 已踩过两次)。

ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS median_wage_annual integer;
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS salary_n           integer;

ALTER TABLE stats_city       ADD COLUMN IF NOT EXISTS median_wage_annual integer;
ALTER TABLE stats_city       ADD COLUMN IF NOT EXISTS salary_n           integer;
