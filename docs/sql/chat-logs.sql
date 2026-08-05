-- D1 对话留痕(2026-08-05):把每一轮问答落库。collection = cms/src/collections/ChatLogs.ts。
-- 出处 docs/design/对话Case-Harness方案-20260805.md §1.1 / §7①。
--
-- 为什么必须有:在此之前对话内容**一个字都没存** —— route 只 console.log 了
-- 「noc=… facts=N in=123ch」(连问题原文都没有,只有字数),Umami 那边只有事件计数。
-- 于是「用户实际最常问什么」「哪类问题最容易 guard 降级」无法回答,而复现率仪表盘的数据源正是这张表。
--
-- ⚠️ 顺序照 g9 惯例:**先在生产跑本文件,再 push 带 collection 的代码**。
-- 手写 DDL 的理由见 [[db-push-minefield]]:dev 默认不推 schema,别让 DB_PUSH 猜。
--
-- 🔴 隐私口径(设计 §7①):不存 IP、不存 user 关系、不存邮箱。thread 是**首轮提问文本**的哈希,
--   只用来把同一串追问串起来 —— 它不指向任何人;换个人问同一句话会落进同一个 thread,这是可接受的取舍。
-- 🔴 tools 用 jsonb 不用 text[]:Payload 的 array 字段会被拆成独立子表,为一个字符串列表不值。
-- 时间戳用 Payload 自带的 created_at,不另建 ts 列。
CREATE TABLE IF NOT EXISTS chat_logs (
  id         serial PRIMARY KEY,
  thread     varchar,        -- sha256(首轮提问)前 16 位:串起多轮,不指向人
  turn       integer,        -- 本串里的第几轮(由 history 里的 user 消息数推)
  lang       varchar,        -- zh / en / ko
  question   varchar,        -- 用户原话(服务端截断 2,000)
  answer     varchar,        -- 最终答复(服务端截断 8,000);失败时 NULL
  noc        varchar,        -- 抽出来的 NOC —— 最常用的 group by,从 slots 提到列上
  slots      jsonb,          -- 整份槽位:看抽槽对不对
  facts      jsonb,          -- 整份事实(含 cited):复现率靠它回算,D3 给 Fact 加 code 后可回填
  tools      jsonb,          -- 本轮实际打了哪些 lookup(去重保序)
  degraded   boolean DEFAULT false,
  err        varchar,        -- tooShort / noOcc / llm / guard;成功为 NULL
  ms         integer,        -- 端到端耗时
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 查询形态:按时间倒序翻最近的问题;按 thread 还原一串追问;按 NOC/降级/错误码做聚合
CREATE INDEX IF NOT EXISTS chat_logs_created_at_idx ON chat_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS chat_logs_thread_idx     ON chat_logs (thread, turn);
CREATE INDEX IF NOT EXISTS chat_logs_lang_idx       ON chat_logs (lang);
CREATE INDEX IF NOT EXISTS chat_logs_noc_idx        ON chat_logs (noc);
CREATE INDEX IF NOT EXISTS chat_logs_err_idx        ON chat_logs (err);

-- ⚠️ 手写建表还差这一步(见 [[new-etl-dim-table-checklist]]、g9-ee-points-grid.sql 的同款尾巴):
-- Payload 的 payload_locked_documents_rels 表**每个 collection 一列**,少了它 admin 打开这张表会 42703。
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS chat_logs_id integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_chat_logs_fk') THEN
    ALTER TABLE payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_chat_logs_fk
      FOREIGN KEY (chat_logs_id) REFERENCES chat_logs(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_chat_logs_id_idx
  ON payload_locked_documents_rels (chat_logs_id);
