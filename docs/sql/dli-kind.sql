-- dli 表加院校种类列(2026-09-12 Frank「这个应该加一个 大学 和 学院的 筛选吧」):
-- IRCC 名单没有种类格,etl/dli 按校名判词派生(university / college / other,见 etl/dli/constants.py KIND_*),
-- 城市段留学院校表的胶囊筛选读它。加列 additive,不动既有列;生产加列 docs/sql 手写 DDL 先行,DB_PUSH 不碰。
ALTER TABLE dli ADD COLUMN IF NOT EXISTS kind varchar;
