-- 搜索 trgm 索引(2026-07-19,Frank「搜索要 7-8 秒」;API 实测带 q 3-5s / 不带 q 0.16s)
-- 根因:q 搜索 = 多列 ILIKE '%..%' OR(含跨表 c.name),btree 帮不上,jobs 全表扫 ×(count+rows 两查)。
-- 修法:pg_trgm GIN 让每个 ILIKE 分支走位图 OR;跨表分支已在代码侧改 company_id IN 子查询(jobsSql.ts)。
-- 幂等可重跑;CONCURRENTLY 不锁表、不能进事务块(别加 BEGIN)。
-- 用法:psql "$DATABASE_URI" -f docs/sql/search-trgm-indexes.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_title_trgm        ON jobs USING gin (title gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_city_trgm         ON jobs USING gin (city gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_district_trgm     ON jobs USING gin (district gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_noc_trgm          ON jobs USING gin (noc gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_source_label_trgm ON jobs USING gin (source_label gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_name_trgm    ON companies USING gin (name gin_trgm_ops);
-- 子查询回连用(Payload 可能已建 FK 索引,IF NOT EXISTS 兜底)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_company_id        ON jobs (company_id);

-- 验证:EXPLAIN (ANALYZE) 带 q 查询应出现 BitmapOr + Bitmap Index Scan on idx_jobs_*_trgm;
-- 生产口径:/api/jobs?q=<公司名> 从 3-5s 进 <500ms 档。

-- ── B4-02 技能股下沉(Frank 2026-07-19「有 LMIA 但没法移民」)────────────────────────
-- mart 早已算好 lmiaPositionsSkilled(High Wage/GTS/PR-only),seed 一直丢弃;加列后下一轮 seed 自动回填。
-- 用途:match 规则 6 改「技能股才 +5,纯农业/低薪股中性提示」;名录/弹框标注股别口径。
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lmia_positions_skilled integer;
