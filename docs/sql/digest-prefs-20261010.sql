-- 新岗推送设置(2026-10-10 批 2「我的求职」四段,docs/design/我的/我的求职-20261009.md 第 3 节 16b / 16d):
-- 「把推荐和收藏动态发到邮箱」不发 / 每天 / 每周 + 可改的收件邮箱(换成别的邮箱先发确认信,点了才生效)。
-- 新表 digest_prefs,一人一行;没行 = 没设过 = 不发、发到账户邮箱(新用户默认不发)。
-- 老用户照现状搬:每周摘要原先只发免费号、且没退订的人 → 'weekly';退订过的、Pro(原先收不到周报)→ 'off'。
-- additive、幂等;不动既有数据(users.weekly_opt_out 留着不删,新代码不再读它)。
-- 惯例(db-push-minefield):建表一律手写 SQL 先行;只写文件不执行,上线前在生产跑(Frank 审后跑)。
-- 原生表,不进 seed、不补 payload_locked_documents_rels;🔴 DB_PUSH=1 会提议删这张表,一律答 N。
--
-- 跑法(生产):① 跑本文件 → ② 部署本批代码 → ③ 抽查:
--   SELECT freq, count(*) FROM digest_prefs GROUP BY freq;

CREATE TABLE IF NOT EXISTS digest_prefs (
  user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- 频率:off 不发 / daily 每天(今日推荐)/ weekly 每周(收藏岗动态)
  freq text NOT NULL DEFAULT 'off' CHECK (freq IN ('off', 'daily', 'weekly')),
  -- 收件邮箱;NULL = 账户邮箱
  email text,
  -- 待确认的新邮箱与发确认信的时刻(7 天内点链接有效)
  pending_email text,
  pending_at timestamptz,
  -- 上次每日推送的时刻(一天只发一封)
  last_daily_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 按频率取收件人(只索引要发的两档)
CREATE INDEX IF NOT EXISTS digest_prefs_freq_idx ON digest_prefs (freq) WHERE freq <> 'off';

-- 老用户照现状搬
INSERT INTO digest_prefs (user_id, freq)
SELECT id, CASE WHEN weekly_opt_out IS TRUE OR pro_until > now() THEN 'off' ELSE 'weekly' END
  FROM users
ON CONFLICT (user_id) DO NOTHING;
