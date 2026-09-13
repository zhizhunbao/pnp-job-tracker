-- 2026-09-13 jobs.origin 枚举补 hireac 值(纯追加,不动数据;换版前先在生产执行,否则 seed 整批回滚)。
-- 背景:hireac 域(Algonquin College HireAC 校内岗位板,登录源,2026-09-13 立域)接进 mart IN_BOARD_STORES,
-- 汇装后 mart jobs.json 出现 origin=hireac 帖;库里 enum_jobs_origin 没有该值即 seed
-- "invalid input value for enum enum_jobs_origin: hireac" 整批回滚(jobillico/jobboom/careerbeacon 三次同型实撞,
-- 见 jobs-origin-careerbeacon.sql)。惯例:生产加枚举值 docs/sql 手写 DDL,DB_PUSH 不碰。
ALTER TYPE enum_jobs_origin ADD VALUE IF NOT EXISTS 'hireac';
