-- 岗位「谁能投」(2026-09-05 Frank「只招公民这种怎么标注,需要单独的字段吗」→ 岗位级字段):
-- Job Bank 详情页「Who can apply for this job?」原文归三档 citizens_pr / temporary_ok / anyone;
-- 外站聚合帖没这块留 NULL(宁缺不猜)。幂等;seed 白名单内。
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS who_can_apply text;
