-- 「我的简历」一人多份(最多 5 份,一份默认)  2026-10-06
-- Frank 10-06「这个可以上传多份简历吧」→ 选「支持,最多 5 份」。
-- 前情:user_resumes 由 docs/sql/apply-b2-20261005.sql 建成「一人一份」(主键 = user_id),10-05 晚已在生产跑过,
--   当时表里只有 1 行(助手走查时传进 Frank 账号的样例简历)。
-- 改法:主键换成自增 id;加 is_default(默认那份,投递时默认附它);按人取清单的索引。
--   「一人至多一份默认」「一人至多 5 份」由应用层保证(换默认是一条 UPDATE 同时改两行,
--   非延迟的部分唯一索引会在语句中途报冲突,所以不建)。
-- 原生表,不进 seed;🔴 DB_PUSH=1 会提议删它,一律答 N。
-- 跑法(生产,幂等):① 跑本文件 → ② 部署本批代码 → ③ 抽查:
--   SELECT user_id, count(*), count(*) FILTER (WHERE is_default) FROM user_resumes GROUP BY user_id;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_resumes' AND column_name = 'id') THEN
    ALTER TABLE user_resumes DROP CONSTRAINT user_resumes_pkey;
    ALTER TABLE user_resumes ADD COLUMN id serial PRIMARY KEY;
  END IF;
END $$;

ALTER TABLE user_resumes ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- 迁移前一人一份:现有的每一行都是那个人唯一的一份,标成默认
UPDATE user_resumes u SET is_default = true
  WHERE NOT EXISTS (SELECT 1 FROM user_resumes d WHERE d.user_id = u.user_id AND d.is_default);

CREATE INDEX IF NOT EXISTS user_resumes_user_idx ON user_resumes (user_id, uploaded_at DESC);
