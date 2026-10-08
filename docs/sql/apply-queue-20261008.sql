-- 智能投递队列(2026-10-08 Frank「找一个最好的直接抄」= 照 AIApply 的 Auto Apply:每天按求职条件挑岗、AI 写好信,进「今日待投」):
-- 投递表状态加 queued(队列里,信已写好)/ declined(用户跳过,不再进队列);投递偏好加「智能投递」开关与上次跑队列的时刻;
-- 按人按状态取队列的索引。additive、幂等;不动既有数据。
-- 惯例(db-push-minefield):建表 / 改约束一律手写 SQL 先行;只写文件不执行,上线前在生产跑(Frank 审后跑,或 Frank 授权助手跑)。
-- 原生表,不进 seed、不补 payload_locked_documents_rels;🔴 DB_PUSH=1 会提议删这些表,一律答 N。
--
-- 跑法(生产):① 跑本文件 → ② 部署本批代码 → ③ 抽查:
--   SELECT status, count(*) FROM applications GROUP BY status;
--   SELECT count(*) FILTER (WHERE auto_queue) FROM apply_prefs;

-- 状态集合:draft / queued / sending / sent / replied / bounced / declined(约束名是建表时内联 CHECK 的默认名)
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check
  CHECK (status IN ('draft', 'queued', 'sending', 'sent', 'replied', 'bounced', 'declined'));

-- 「智能投递」开关(默认关;开了每天挑岗写信)与上次跑队列的时刻(挑岗只看这之后新上的岗)
ALTER TABLE apply_prefs ADD COLUMN IF NOT EXISTS auto_queue boolean NOT NULL DEFAULT false;
ALTER TABLE apply_prefs ADD COLUMN IF NOT EXISTS last_queue_at timestamptz;

-- 按人取队列 / 按状态数(「我的求职」顶上「今日待投 N」)
CREATE INDEX IF NOT EXISTS applications_user_status_idx ON applications (user_id, status);
