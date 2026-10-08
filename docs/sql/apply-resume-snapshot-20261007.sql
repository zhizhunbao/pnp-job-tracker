-- 站内投递:简历原件随投递记录快照(2026-10-07 Frank「我的简历 我的 cover letter 是不是要跟着已投职位走」→「你觉得呢」→ 四条都做)
-- 发出那一刻把所附简历的原件(base64,同 user_resumes.file_b64)与 MIME 抄进这一条投递,
-- 之后替换 / 删掉那份简历,「我的求职」里这一条照样能打开当时发出去的版本。求职信全文本来就在 cover_text 里。
-- additive、幂等(IF NOT EXISTS);不动既有数据。原生表,不进 seed;DB_PUSH 提议删列一律答 N。
-- 设计稿:docs/design/投递页-B2-实施方案-20261005.md(本批改判见 CLAUDE 会话 10-07 记录)。

ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_b64  text;          -- 发出时所附简历原件(base64);草稿为 NULL
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_mime varchar(120);  -- 那份原件的 MIME(application/pdf 或 docx)
