-- F 件(E8-07,2026-07-20):评论楼中楼+置顶 两列(additive,幂等)。
-- 生产已代跑(etl/run 同日);Payload Comments collection 对应字段 parent(relationship)/pinned(checkbox)。
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id integer;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments (parent_id);
