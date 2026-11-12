-- 今日推荐排序重做(「投递走顺」任务书第 3 批,第 44、48 条;2026-11-11)
-- 惯例:加列一律手写 SQL 先行,只写文件不执行,Frank 审后在生产跑;additive、幂等,不动既有数据。
-- 原生列 / 原生表,不进 seed、不补 payload_locked_documents_rels;DB_PUSH=1 会提议删这些列和表,一律答 N。
--
-- 跑法(生产):① 逐条跑本文件(函数体里有分号,不能按分号切;CREATE INDEX CONCURRENTLY 不能放在事务里)
--   → ② 部署带简历匹配与推荐记录的代码(没跑本文件就部署:今日推荐报 500 并留痕)→ ③ 抽查见文末。

-- 1. 简历正文(第 44 条):上传时提取,简历匹配拿它对职位描述;已有的 72 份由脚本回填
ALTER TABLE user_resumes ADD COLUMN IF NOT EXISTS body_text text;

-- 正文提取的时刻(NULL = 还没提取)
ALTER TABLE user_resumes ADD COLUMN IF NOT EXISTS body_at timestamptz;

-- 2. 职位检索向量(第 44 条):职位名加描述,只给在架岗算,下架置空
--    不用生成列:22.5 万行会整表重写并锁表;空列加触发器,只回填在架的 2.7 万行
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS jd_tsv tsvector;

CREATE OR REPLACE FUNCTION jobs_jd_tsv_set() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status::text <> 'open' THEN
    NEW.jd_tsv := NULL;
  ELSIF TG_OP = 'INSERT' OR NEW.jd_tsv IS NULL
     OR NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description THEN
    NEW.jd_tsv := to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, ''));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS jobs_jd_tsv_trg ON jobs;

CREATE TRIGGER jobs_jd_tsv_trg BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION jobs_jd_tsv_set();

-- 回填在架岗(约 2.7 万行,只锁行)
UPDATE jobs SET jd_tsv = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
 WHERE status = 'open' AND jd_tsv IS NULL;

-- 不能放在事务里,单独一条跑
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_jd_tsv ON jobs USING gin (jd_tsv) WHERE status = 'open';

-- 3. 推荐记录(第 48 条):每天推了哪些、排第几、什么档,点了没、投了没
CREATE TABLE IF NOT EXISTS pick_log (
  user_id    integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        date NOT NULL,
  job_id     integer NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  rank       smallint NOT NULL,
  goal       varchar(8) NOT NULL,
  level      varchar(8) NOT NULL,
  score      smallint NOT NULL,
  parts      jsonb,
  via        varchar(8) NOT NULL DEFAULT 'page',
  clicked_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day, job_id)
);

CREATE INDEX IF NOT EXISTS pick_log_day_idx ON pick_log (day);

-- 4. 投递入口(第 48 条):从哪个页面发起的投递(NULL = 这一列上线之前的投递)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS entry varchar(16);

-- 抽查:
--   SELECT count(*) FILTER (WHERE jd_tsv IS NOT NULL) AS tsv, count(*) AS open FROM jobs WHERE status = 'open';
--   SELECT indexname FROM pg_indexes WHERE indexname = 'idx_jobs_jd_tsv';
--   SELECT count(*) FROM pick_log;
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'user_resumes' AND column_name IN ('body_text', 'body_at');
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'entry';
