-- 雇主池加「雇主类别」列(2026-09-18 雇主分类批一;设计稿 docs/design/雇主分类与搜索-20260918.md)。
-- 值 = federal / government(省级)/ municipal / indigenous / public,NULL = 私营;按名字判,
-- 尺子 = etl/names 域 sector_of(与 companies.sector 同一把)。雇主板「类别」下拉与列(批五)读这一列。
-- 纯加列,幂等(IF NOT EXISTS),不动既有数据;旧代码 seed 不写这一列也不受影响。
-- 顺序(加列窗口期的坑见记忆 seed-hash-poisoning-on-column-add):
--   ① 跑本文件
--   ② 推带 sector 的 cms 代码(collection EmployerPool / COLS_EMPLOYER_POOL / toEmployerPool)并确认 /api/version 换版
--   ③ 删 seed_state 里 employer_pool 的表哈希(防窗口期旧代码偷记新 mart 哈希 → 新列永远灌不进)
--   ④ docker compose exec -T build python etl/employers/main.py → python etl/load/main.py --only upload
--      → curl -H "x-seed-token: $SEED_TOKEN" https://offer2pr.com/api/seed
--   ⑤ 抽查:SELECT sector, count(*) FROM employer_pool GROUP BY sector ORDER BY 2 DESC;
ALTER TABLE employer_pool ADD COLUMN IF NOT EXISTS sector varchar;
CREATE INDEX IF NOT EXISTS employer_pool_sector_idx
  ON employer_pool (sector);                        -- 类别是筛选列:新筛选参数上线必有索引(08-08 jobs.fine 实撞)
