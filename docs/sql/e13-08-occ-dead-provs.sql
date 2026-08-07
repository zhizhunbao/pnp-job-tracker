-- E13-08(2026-08-07 Frank 走查拍板):职业统计表补「完全无路可走的省」一列。
-- 口径 = etl/08_score.any_pr_path 的 9 省补集(PNP∪联邦EE∪AIP∪联邦保育专项 全 False 才判死;
-- RCIP 社区级不进省判、QC 不判死),锚句见 08_score 顶注与 docs/implementation/E13-把脉首页/08_跨通道无路可走判定.md。
-- 值:顿号 join 省码;空串 = 处处有路;NULL = TEER 未分类判不了(强负断言不硬判)。
-- 纯增量 ADD COLUMN(DB_PUSH 雷区惯例:加列一律 docs/sql 手写,不跑 payload push);
-- 执行顺序:本 DDL 先行 → 部署代码(seed 白名单已含新列)→ 清 seed_state → 重灌。
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS dead_provs varchar;
-- 改列后必须清表级哈希,否则 seed 静默跳过(counts=-2 坑)
DELETE FROM seed_state WHERE name = 'stats_occupation';
