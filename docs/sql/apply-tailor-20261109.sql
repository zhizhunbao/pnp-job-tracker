-- 高质量投递:每个职位一份专属简历与核对结果  2026-11-09
-- Frank 11-09「每个职位都应该重写简历」「这个对比要完全和最终发出去的完全一致」。
-- tailor_cv      本岗简历的结构化草稿(lib/cv 的 CvDraft 形,改写与修改都从它出)
-- tailor_pdf_b64 本岗简历的 PDF;预览和发信用的都是这一份字节
-- tailor_review  职位要求、逐条覆盖情况、分数、自动重试次数
-- tailor_facts   用户在右侧栏补充的真实经历(要求 id -> 文字)
-- 原生表,不进 seed;🔴 DB_PUSH=1 会提议删这几列,一律答 N。
-- 跑法(生产,幂等):① 跑本文件 → ② 部署本批代码。

ALTER TABLE applications ADD COLUMN IF NOT EXISTS tailor_cv jsonb;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tailor_pdf_b64 text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tailor_review jsonb;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tailor_facts jsonb;
