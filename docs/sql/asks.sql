-- 站内向导留痕 asks(2026-09-04):挂件每一轮落一行,kind 分带路 / 问题 / 建议。collection = cms/src/collections/Asks.ts。
-- 出处 docs/design/顾问改向导-20260904.md §4(批一数据层)。
--
-- 为什么要它:AI 顾问改站内向导,产品目的从「答」变成「收」—— 用户最常问什么、最想要什么功能、
-- 有多少是站上没有的,全靠这张表回答。chat_logs 停写不删(复现率仪表盘的历史还在)。
--
-- ⚠️ 顺序照 chat-logs.sql 惯例:**先在生产跑本文件,再 push 带 collection 的代码**。
-- 手写 DDL 的理由见 [[db-push-minefield]]:dev 默认不推 schema,别让 DB_PUSH 猜。
--
-- 🔴 隐私口径:不存 IP、不存 user 关系;email 只在用户点「留个邮箱」主动填时写,其余 NULL。
--   thread 沿 chat_logs 口径 = sha256(首轮提问)前 16 位,串追问不指向人。
-- kind / status 用 varchar 不用 Payload select:select 在 postgres 生成 enum 类型,手写 DDL 多一种类型要维护
--   (chat_logs 的 err 同款取舍)。params 用 jsonb 不用 array:Payload array 会拆成独立子表。
-- 用法:psql "$DATABASE_URI" -f docs/sql/asks.sql
CREATE TABLE IF NOT EXISTS asks (
  id         serial PRIMARY KEY,
  thread     varchar,        -- sha256(首轮提问)前 16 位:串起多轮,不指向人
  turn       integer,        -- 本串里的第几轮(由 history 里的 user 消息数推)
  lang       varchar,        -- zh / en / ko
  path       varchar,        -- 提问时所在页(带参):知道他从哪问的
  question   varchar,        -- 用户原话(服务端截断 2,000)
  kind       varchar,        -- nav / question / suggestion
  dest       varchar,        -- 目的地目录键(guide/constants DEST_ROUTE);非 nav 为 NULL
  params     jsonb,          -- 带去目的地的参数(省 / NOC / 市 …)
  say        varchar,        -- 向导那一句
  email      varchar,        -- 用户主动留的邮箱;没留为 NULL
  status     varchar DEFAULT 'new',  -- new / answered / built,Frank 在后台改
  ms         integer,        -- 端到端耗时
  err        varchar,        -- llm / limit / net;成功为 NULL(catch 不静默)
  updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
  created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);

-- 查询形态:按时间倒序翻最近的;按 thread 还原一串;按 kind / status 分组看「站上没有的」与「做没做」
CREATE INDEX IF NOT EXISTS asks_created_at_idx ON asks (created_at DESC);
CREATE INDEX IF NOT EXISTS asks_thread_idx     ON asks (thread, turn);
CREATE INDEX IF NOT EXISTS asks_kind_idx       ON asks (kind);
CREATE INDEX IF NOT EXISTS asks_status_idx     ON asks (status);

-- ⚠️ 手写建表还差这一步(见 [[new-etl-dim-table-checklist]]、chat-logs.sql 的同款尾巴):
-- Payload 的 payload_locked_documents_rels 表**每个 collection 一列**,少了它 admin 打开这张表会 42703。
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS asks_id integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_asks_fk') THEN
    ALTER TABLE payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_asks_fk
      FOREIGN KEY (asks_id) REFERENCES asks(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_asks_id_idx
  ON payload_locked_documents_rels (asks_id);
