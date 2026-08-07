-- B4 LMIA 时间窗三列(docs/implementation/在招担保雇主/04_B4 §3a;幂等,生产先跑本文件再等整点批回填)
-- 口径:全表最新季往回 4/2/1 季 ≈ 近一年/近半年/最近一季(官方粒度=季度,不硬折月)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lmia_positions_4q integer;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lmia_positions_2q integer;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lmia_positions_1q integer;
-- 改 seed 列白名单必清 seed_state(表级哈希否则静默跳过,counts=-2)
DELETE FROM seed_state;
