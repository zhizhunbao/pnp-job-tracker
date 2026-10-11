-- 收件箱(2026-10-10 批 3,docs/design/我的/我的求职-20261009.md 1.5 / 2.5 / 1.6 / 2.6):
-- Frank 拍板:每人一个专属投递邮箱(投递的 Reply-To);雇主回信进站内收件箱,默认同时转一份到账户邮箱(可关);
-- 收到回信那一条投递记成「雇主回复」(applications.status = 'replied',约束 B2 已留)。
-- 新表两张:inbox_aliases(一人一行:专属地址 + 转发开关)、inbox_messages(收到的与回出去的信)。
-- additive、幂等(IF NOT EXISTS);不动既有数据。
-- 惯例(db-push-minefield):建表一律手写 SQL 先行;只写文件不执行,上线前在生产跑(Frank 审后跑)。
-- 原生表,不进 seed、不补 payload_locked_documents_rels;🔴 DB_PUSH=1 会提议删这两张表,一律答 N。
--
-- 跑法(生产):① 跑本文件 → ② 部署本批代码 → ③ 配 INBOUND_DOMAIN(没配 = 收件箱不开通,投递回复地址照旧用账户邮箱)→ ④ 抽查:
--   SELECT count(*) FROM inbox_aliases;
--   SELECT direction, count(*), count(*) FILTER (WHERE read_at IS NULL) AS unread FROM inbox_messages GROUP BY direction;
--   SELECT status, count(*) FROM applications GROUP BY status;

CREATE TABLE IF NOT EXISTS inbox_aliases (
  user_id    integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- 专属地址的 @ 前那段:英文名小写 + '.' + 5 位随机(如 liwei.k3x9q);投递时 Reply-To = <alias>+a<投递行 id>@<INBOUND_DOMAIN>
  alias      varchar(40) NOT NULL UNIQUE CHECK (alias ~ '^[a-z0-9.]{3,40}$'),
  -- 收到回信同时转一份到账户邮箱(默认开)
  forward    boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inbox_messages (
  id             serial PRIMARY KEY,
  user_id        integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 对上的那一条投递(子地址标记 → 邮件头串 → 发件人 = 雇主邮箱,三档都对不上 = NULL);投递删了置空,信留着
  application_id integer REFERENCES applications(id) ON DELETE SET NULL,
  direction      varchar(3) NOT NULL CHECK (direction IN ('in', 'out')),
  from_addr      varchar(320) NOT NULL,
  from_name      varchar(200) NOT NULL DEFAULT '',
  to_addr        varchar(320) NOT NULL,
  subject        varchar(1000) NOT NULL DEFAULT '',
  -- 只存纯文本(HTML 信在服务端去标签;不存原 HTML,不在站内渲染外来 HTML)
  body_text      text NOT NULL DEFAULT '' CHECK (char_length(body_text) <= 100000),
  message_id     varchar(1000),            -- 收到的那一封的 Message-ID(后来的信按 In-Reply-To / References 对上同一条投递)
  in_reply_to    varchar(1000),
  inbound_id     varchar(100),             -- Resend 收信 id(回调重放去重)
  resend_id      varchar(100),             -- 回出去的那一封的 Resend 邮件 id
  reply_of       integer REFERENCES inbox_messages(id) ON DELETE SET NULL,  -- 回出去的信回的是哪一封
  read_at        timestamptz,              -- NULL = 没读(只看 direction = 'in')
  forwarded_at   timestamptz,              -- 转到账户邮箱的时刻(NULL = 没转:开关关着 / 没发出去)
  received_at    timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 回调重放去重(ON CONFLICT 的目标)
CREATE UNIQUE INDEX IF NOT EXISTS inbox_messages_inbound_uq ON inbox_messages (inbound_id) WHERE inbound_id IS NOT NULL;
-- 收件箱清单(本人,最近的在前)
CREATE INDEX IF NOT EXISTS inbox_messages_user_idx ON inbox_messages (user_id, received_at DESC);
-- 「收件箱」页签未读数(每次进「我的」页都查)
CREATE INDEX IF NOT EXISTS inbox_messages_unread_idx ON inbox_messages (user_id) WHERE read_at IS NULL AND direction = 'in';
-- 「打开」一条投递:挂在它上面的往来信
CREATE INDEX IF NOT EXISTS inbox_messages_app_idx ON inbox_messages (application_id) WHERE application_id IS NOT NULL;
-- 按 In-Reply-To / References 对投递
CREATE INDEX IF NOT EXISTS inbox_messages_msgid_idx ON inbox_messages (user_id, message_id) WHERE message_id IS NOT NULL;
