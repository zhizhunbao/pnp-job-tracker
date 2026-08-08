-- jobs.fine 索引补齐(2026-08-08,幂等可重跑)
-- 背景:生产池楔死事故——/(职位板)与 /start 25s 超时,robots 正常;pg_stat_activity 见 9 条并发
-- `WHERE j.fine = $1` 计数/列表查询各跑 3-12s 全等 IO(AioIoCompletion)。根因:细类筛选(jobsSql fFine,
-- 浏览分类树细类页入口)上线晚于 E10 P5 索引批,broad/mid/category 皆有索引,唯 fine 裸奔——
-- 64k 行顺序扫描(pg_stat_user_tables:seq_scan 56,564 次、seq_tup_read 27 亿)并发即打穿小实例 IO。
-- 用法:node/psql 直跑;CONCURRENTLY 不锁表不进事务块。
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_fine ON jobs (fine);
-- 验证:EXPLAIN SELECT count(*) FROM jobs WHERE fine = '...' 应走 idx_jobs_fine;/start 与 / 恢复秒开
