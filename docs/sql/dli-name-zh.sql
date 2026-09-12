-- dli 表加通行中文译名列(2026-09-12 Frank「大学名 最好也加上中文翻译吧」;
-- 值来自 etl/dli/constants.py NAME_ZH 人工核定表,表外空串,前端回退英文原名。
-- 同批 dli 粒度改「一校一校区城一行」(纯行级变化,列不动,seed 全量重灌自替换)。
ALTER TABLE dli ADD COLUMN IF NOT EXISTS name_zh text;
