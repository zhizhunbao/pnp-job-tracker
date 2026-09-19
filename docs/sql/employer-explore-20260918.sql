-- 雇主探索队列(2026-09-18 Frank「雇主有个探索列表,用户列出过哪些雇主,就自动从那个表里翻译,类似于处理消息」)。
-- 一行 = 一家被雇主板列给用户看过的雇主:被列出几次、最后一次什么时候、办到哪一步、翻出来的中 / 韩文名。
-- 入队 = cms POST /api/employers/explore(板上报键,只认池里真有的);消费 = 数据层 explore 域的后台工人
-- (GET …/explore/todo 取活 → 家里本地模型翻 → POST …/explore/done 交活)。板上名下灰注先读 companies 的译名,
-- 没有再读这里的;status = skip(人名雇主)的连 companies 里已有的音译也不显示。
-- 只建新表与它的索引,不动任何既有表;幂等(IF NOT EXISTS)。不进 Payload(不是 collection,手写表,同 seed_state)。
CREATE TABLE IF NOT EXISTS employer_explore (
  key        varchar PRIMARY KEY,                 -- 雇主池主键(employer_pool.key)
  name       varchar NOT NULL,                    -- 雇主名(入队那一刻池里的名字)
  seen_count integer NOT NULL DEFAULT 1,          -- 被列出过几次(取活的优先级)
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now(),
  status     varchar NOT NULL DEFAULT 'pending',  -- pending 待办 / done 翻好 / skip 人名等不翻 / fail 没翻成
  alias_zh   varchar,
  alias_ko   varchar,
  trans_v    integer,                             -- 译文版本号(lib/db TRANS_V;对不上的板上当没有)
  note       varchar,                             -- 跳过 / 失败的由头
  done_at    timestamptz
);
CREATE INDEX IF NOT EXISTS employer_explore_todo_idx
  ON employer_explore (status, seen_count DESC, last_seen DESC);   -- 工人取活:待办里次数多的、最近的在前
