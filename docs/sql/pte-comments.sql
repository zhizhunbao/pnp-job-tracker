-- PTE 题下评论:comments 表补四列一索引  2026-09-03
-- additive、幂等(IF NOT EXISTS),不动既有新闻评论一行。
-- 惯例见 db-push-minefield:加列一律手写 SQL,别让 DB_PUSH 猜;Payload Comments collection 对应字段 qid / kind / examDate / examCity。
--
-- 为什么(Frank 2026-09-03「加评论有什么问题吗」→ 批二就带,设计稿 docs/design/PTE刷题-20260903.md「题下评论区」):
--   三家机经站的评论区九成是「考试记录」(日期 + 城市),那是「最近考了」的原料;
--   做成结构化钮「我考到了」免审直接进栏,自由留言复用新闻评论那套(登录 → pending → 人工过审)。
--
-- 口径:
--   qid       挂在哪道题(pte_questions.qid = 源:题型:源内 id);NULL = 新闻评论(news_slug 那一路)
--   kind      exam(考试记录,hook 直接 approved)/ note(留言,pending 待审);NULL = 新闻评论
--   exam_date 考试日 YYYY-MM-DD(kind=exam 必填,hook 校验不许未来)
--   exam_city 考点城市(选填,≤ 40 字)
--
-- 跑法(生产):① 跑本文件 → ② 部署带 Comments 四字段 + components/pte 的代码 → ③ 抽查:
--   SELECT qid, kind, exam_date, exam_city, status, author_name FROM comments WHERE qid IS NOT NULL ORDER BY created_at DESC LIMIT 20;

ALTER TABLE comments ADD COLUMN IF NOT EXISTS qid varchar;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS kind varchar;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS exam_date varchar;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS exam_city varchar;
-- 题页取评论 = 按题 + 过审 + 时间倒序,一条索引盖住(热筛选列缺索引 = 连接池事故,CLAUDE.md)
CREATE INDEX IF NOT EXISTS comments_qid_status_created_idx ON comments (qid, status, created_at DESC);
