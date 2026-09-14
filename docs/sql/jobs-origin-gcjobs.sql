-- 2026-09-13 jobs.origin 枚举补 gcjobs 值(纯追加,不动数据;换版前先在生产执行,否则 seed 整批回滚)。
-- 背景:gcjobs 域(GC Jobs 联邦公务员招聘站公开搜索,2026-09-13 立域,Frank「那 GC Jobs 接一下吧」)接进 mart IN_BOARD_STORES,
-- 汇装后 mart jobs.json 出现 origin=gcjobs 帖;库里 enum_jobs_origin 没有该值即 seed 整批回滚(四次同型实撞,见 jobs-origin-careerbeacon.sql)。
ALTER TYPE enum_jobs_origin ADD VALUE IF NOT EXISTS 'gcjobs';
