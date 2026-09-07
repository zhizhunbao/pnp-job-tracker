-- 2026-09-06 jobs.origin 枚举补 jobillico / jobboom 两值(纯追加,不动数据)。
-- 背景:etl 当日新立 jobillico / jobboom 两域接进 mart(ed4c9b1d),mart jobs.json 出现 origin=jobillico 160 行、
-- jobboom 91 行,库里 enum_jobs_origin 只有 jobbank / ats / directory → seed 在第 4363 个参数处
-- "invalid input value for enum enum_jobs_origin" 整批回滚,连着两轮 500(生产实撞,同日库满事故的余波里发现)。
-- 惯例:生产加列/加枚举值 docs/sql 手写 DDL 先行,DB_PUSH 不碰(见 CLAUDE.md「生产加列/建表」)。
ALTER TYPE enum_jobs_origin ADD VALUE IF NOT EXISTS 'jobillico';
ALTER TYPE enum_jobs_origin ADD VALUE IF NOT EXISTS 'jobboom';
