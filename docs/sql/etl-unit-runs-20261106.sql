-- 调度单元跑完的历史(2026-11-06 Frank「跑完的任务是不是应该有历史记录」,页面形态选「新增一张卡」):
-- 管理员队列页 /queue 加「最近跑完」卡,所有单元按跑完时刻倒序列最近 100 轮,失败的挂红胶囊、下面带本轮最后几行报错。
-- 一轮一行;写入方 = 调度器每轮跑完那次上报(POST /api/queue/units 带 round 一格),同一次请求顺手删掉 7 天前的行。
-- additive、幂等(IF NOT EXISTS);不动既有数据。原生表,不进 seed、不补 payload_locked_documents_rels;
-- 🔴 DB_PUSH=1 会提议删这张表,一律答 N。惯例(db-push-minefield):只写文件不执行,上线前在生产跑(Frank 审后跑)。
--
-- 跑法(生产):① 跑本文件 → ② 部署本批代码(没跑本文件就部署:上报照样写 etl_units,插历史那步失败留痕回 500,
--   调度器只记一行 !)→ ③ 重启 ETL 容器 → ④ 抽查:SELECT name, ok, ended_at FROM etl_unit_runs ORDER BY ended_at DESC LIMIT 10;

CREATE TABLE IF NOT EXISTS etl_unit_runs (
  id          bigserial PRIMARY KEY,
  -- 单元名(= etl_units.name;不设外键:单元行可被管理员删掉,历史照留)
  name        varchar NOT NULL,
  -- 这一轮开跑 / 跑完的时刻
  started_at  timestamptz NOT NULL,
  ended_at    timestamptz NOT NULL,
  -- 这一轮成没成
  ok          boolean NOT NULL,
  -- 失败时本轮最后几行出错行(同 healthchecks /fail 正文的截法);成功 = NULL
  error       text
);
-- 页面按跑完时刻倒序取、清理按跑完时刻删,都走这一个索引
CREATE INDEX IF NOT EXISTS etl_unit_runs_ended_idx ON etl_unit_runs (ended_at DESC);
