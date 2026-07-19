-- E10 P5 · jobs 表索引补齐(2026-07-19,幂等可重跑)
-- 背景:E10 服务端分页后所有筛选/排序都打 jobs 表;#73 补齐排序白名单后,大分类/TEER 等列排序也进 SQL。
-- 33k 行量级收益温和(几十 ms 档),但随日更增长是一次性的地基。CONCURRENTLY 不锁表,生产可直接跑。
-- 用法:psql "$DATABASE_URI" -f docs/sql/e10-p5-indexes.sql(或逐条粘贴;CONCURRENTLY 不能进事务块,别加 BEGIN)

-- 排序热列(与 orderByClause 的 DESC NULLS LAST 形状对齐,默认序/评分/薪资/更新)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_date_posted_desc ON jobs (date_posted DESC NULLS LAST, score DESC NULLS LAST, id DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_score_desc       ON jobs (score DESC NULLS LAST, id DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_salary_desc      ON jobs (salary_annual DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_last_seen_desc   ON jobs (last_seen DESC NULLS LAST);

-- 筛选热列(WHERE 等值/联动下拉)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_province ON jobs (province);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_city     ON jobs (city);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_noc      ON jobs (noc);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_broad    ON jobs (broad);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status   ON jobs (status);

-- 验证:\di+ idx_jobs_* 全在;EXPLAIN 默认首屏应走 idx_jobs_date_posted_desc
