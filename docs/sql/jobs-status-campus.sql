-- 2026-09-13 jobs.status 枚举补 campus 值(纯追加,不动数据;换版前先在生产执行,否则 seed 整批回滚)。
-- 背景:hireac 域(Algonquin College HireAC 校内板,登录源)首灌 376 帖上了公开职位板,Frank「不应该放到职位里面吧」。
-- 定案:校内板帖照样进 jobs 表(详情页 /jobs/[id] 免造),但 status 记 campus 不记 open ——
--   职位板 / 统计 / 榜单 / 雇主池 / 向导一切 status='open' 的查询天然不看它;只有一级导航「校内板」页 /coop 读 status='campus';
--   seed 对账(CLOSE_STALE)把 campus 与 open 一并收关,不在列即下架。
-- 惯例:生产加枚举值 docs/sql 手写 DDL,DB_PUSH 不碰(见 jobs-origin-careerbeacon.sql)。
ALTER TYPE enum_jobs_status ADD VALUE IF NOT EXISTS 'campus';
