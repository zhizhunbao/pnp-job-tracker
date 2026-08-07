-- E13-09(2026-08-08):pnp_eligible 口径根修正配套列——「先省内工作 6 个月可提名」省份。
-- pnp_provs 语义同步收紧为「拿 offer 即可(direct)」;两列口径 = etl/08_score.pnp_direct/pnp_eligible,
-- 五省普通通道锚句见 docs/implementation/E13-把脉首页/09_pnp_eligible口径根修正.md §2。
-- 纯增量 ADD COLUMN(DB_PUSH 雷区惯例:加列一律 docs/sql 手写)。
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS pnp_provs_cond varchar;
-- 改列后必须清表级哈希,否则 seed 静默跳过(counts=-2 坑)
DELETE FROM seed_state WHERE name = 'stats_occupation';
