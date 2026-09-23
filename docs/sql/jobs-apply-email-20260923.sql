-- 站内投递批 1(2026-09-23):jobs 加雇主投递邮箱列。
-- 设计稿 docs/design/站内投递批1-投递邮箱入库-20260923.md。
-- 写入方 = mart 投递邮箱段(Job Bank 直发读 jobbank 域 howto 役的投递区;其他来源从正文抽);
-- 灌库走 COALESCE 保旧值(mart 这轮没给就不冲掉库里已有的)。
-- Payload 字段 applyEmail 只给管理员读;列表 / 详情接口的列集(JOB_COLUMNS)不带它,
-- 只有投递栏 /api/jobs/applyhow 一个出口。
-- 先于换版执行(换版后的灌库代码会写这一列)。可空、无默认值,加列是瞬时的元数据变更。

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS apply_email varchar;
