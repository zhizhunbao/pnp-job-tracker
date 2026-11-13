-- 雇主指定的投递邮件标题(2026-11-12):jobs 加一列。
-- 起因:Opus Art Supplies 的 Langley 店长帖(jb:50718489)原文写明「Please use the subject line "Retail Store Manager Application."」,
-- 本站代投的信标题却是固定模板 Application for <职位名> - <署名>,雇主按标题找信就漏掉(Frank「这个信息整理 jd 的时候没加进来啊」「依次修吧」)。
-- 写入方 = mart 投递邮箱段(etl/mart 的 text_subject_of:只认原文里带引号写明的现成标题,抽不准的留空)。
-- 灌库每轮照 mart 覆盖,不走 COALESCE 保旧值(标题由正文重算,规则会变)。
-- 读出方 = 投递域 APPLY_JOB 一条(lib/apply 的 mailSubjectOf:这一列有值就用它,没有才用模板)。
-- 先于换版执行(换版后的灌库与投递代码都会读写这一列)。可空、无默认值,加列是瞬时的元数据变更。

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS apply_subject varchar;
