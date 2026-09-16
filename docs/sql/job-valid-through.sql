-- 职位截止日(2026-09-16 Frank「截止日期字段需要」「有就写,没有就不写」)
-- 第三方板(Jobillico / Jobboom / CareerBeacon / GC Jobs / HireAC)的帖子自带发帖方写的截止日,100% 有;
-- Job Bank 帖没有这一格,列留空。页面 JobPosting 结构化数据有值才输出 validThrough。
-- 幂等、可空、只加不改:老代码不读这一列,先跑它再换版(新代码 JOB_COLUMNS 会读它,列不存在全站职位查询 500)。
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS valid_through timestamptz;
