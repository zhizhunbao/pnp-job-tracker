-- 顶栏通知铃铛(2026-10-11 批 5「提示统一 + 顶栏铃铛」,Frank「所有的消息 是不是应该统一放到一个地方显示」,照 Azure 门户的 Notifications):
-- 铃铛清单从既有表现算(雇主回信 inbox_messages、退信 / 已发出 applications、今日推荐),只多记一样:每人「上次看铃铛」的时刻,
-- 比它新的算未读(红色数字)。新表一张 notify_seen(一人一行)。
-- additive、幂等(IF NOT EXISTS);不动既有数据。原生表,不进 seed、不补 payload_locked_documents_rels;
-- 🔴 不往 users 加列(users 归 Payload 管,DB_PUSH=1 会提议删手加的列);🔴 DB_PUSH=1 会提议删这张表,一律答 N。
-- 惯例(db-push-minefield):只写文件不执行,上线前在生产跑(Frank 审后跑)。
--
-- 跑法(生产):① 跑本文件 → ② 部署本批代码(没跑本文件就部署:/api/notify 与 /api/notify/seen 报 500 并留痕,铃铛不出数字、面板出「没拉下来」)
--   → ③ 抽查:SELECT count(*), max(seen_at) FROM notify_seen;

CREATE TABLE IF NOT EXISTS notify_seen (
  user_id    integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- 上次打开铃铛面板的时刻;比它新的通知算未读
  seen_at    timestamptz NOT NULL DEFAULT now()
);
