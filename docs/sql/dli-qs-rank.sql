-- dli 表加 QS 世界大学排名两列(2026-09-12 Frank「再加上 qs 排名」;
-- 值来自 etl/qs 域(topuniversities 官方端点,QS 名 → DLI 名人工核定映射),
-- 榜外 NULL/空串,前端显杠。qs_rank 排序用纯数,qs_rank_display 展示用(带 = 并列号)。
ALTER TABLE dli ADD COLUMN IF NOT EXISTS qs_rank integer;
ALTER TABLE dli ADD COLUMN IF NOT EXISTS qs_rank_display text;
