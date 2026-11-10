-- 补充经历写回基础简历  2026-11-10
-- Frank「投递走顺」任务书第 37 条:补充的内容写回基础简历,换职位不用再填。
-- 做法:user_resumes 加一列 extra_text,存在默认那份基础简历的行上;换文件是原行更新,这一列不动。
--   改写时把它当「用户补充」喂给模型,不并进基础简历文字(并进去会被「不许丢年份」的校验误伤)。
-- 原生表,不进 seed;🔴 DB_PUSH=1 会提议删它,一律答 N。
-- 跑法(生产,幂等):① 跑本文件 → ② 部署本批代码。2026-11-10 Frank 已在生产跑过。

ALTER TABLE user_resumes ADD COLUMN IF NOT EXISTS extra_text text NOT NULL DEFAULT '';
