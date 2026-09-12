-- 2026-09-11 jobs.origin 枚举补 careerbeacon 值(纯追加,不动数据;已于当晚在生产执行)。
-- 背景:careerbeacon 域(大西洋四省板,2026-09-11 立域,代码随并行批仍未提交)在工作区接进
-- IN_BOARD_STORES,当日 build 链按工作区汇装 → mart jobs.json 出现 origin=careerbeacon 帖,
-- 库里 enum_jobs_origin 没有该值 → seed "invalid input value for enum enum_jobs_origin:
-- careerbeacon" 整批回滚(升库前该错被 256MB OOM 掐连接盖着,库升 1GB 后 67 秒定点炸出;
-- 与 jobillico/jobboom 同型实撞,见 jobs-origin-jobillico-jobboom.sql)。
-- Frank 拍板加值放行(CareerBeacon 帖随之上板);惯例:生产加枚举值 docs/sql 手写 DDL,DB_PUSH 不碰。
ALTER TYPE enum_jobs_origin ADD VALUE IF NOT EXISTS 'careerbeacon';
