-- 「我的求职」三张表操作列加「删除」(2026-10-12 Frank「这个所有的 操作列 都应该有个 删除 按钮」,选「各删各的」):
--   今日推荐「删除」= 这一岗以后不再推(新表 pick_dismissed,一人一岗一行);
--   我的投递「删除」= 草稿真删,已发出的只从列表藏起(applications 加 hidden_at,投递记录与雇主回信留库,收件箱照常收);
--   我的收藏「删除」= 原「取消收藏」改名,不动库。
-- additive、幂等(IF NOT EXISTS);不动既有数据。原生表 / 原生列,不进 seed、不补 payload_locked_documents_rels;
-- 🔴 DB_PUSH=1 会提议删这张表与这一列,一律答 N。惯例:只写文件不执行,上线前在生产跑(Frank 审后跑)。
--
-- 跑法(生产):① 跑本文件 → ② 部署本批代码(没跑本文件就部署:今日推荐与我的投递两张表报 500 并留痕)
--   → ③ 抽查:SELECT count(*) FROM pick_dismissed; SELECT count(*) FROM applications WHERE hidden_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS pick_dismissed (
  user_id    integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id     integer NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  -- 点「删除」的时刻
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

-- 已发出的投递被本人从列表藏起的时刻;NULL = 在列表里
ALTER TABLE applications ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
