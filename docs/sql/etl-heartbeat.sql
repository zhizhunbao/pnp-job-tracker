-- 2026-07-26(Frank「前端数据时间怎么没更新」→ 拍板改成「最近核对时间」):ETL 心跳单行表。
-- 起因:页面那个时间原本取 max(last_seen)=「数据最后一次真的变了」。过了午夜 Job Bank 当天
-- 还没发新岗(00:30 那轮实测返回 0 行),数据确实没变 → 时间就冻在昨晚,读起来像站死了。
-- 改成记录**每轮 seed 成功完成的时刻**:每小时都动,回答的是「这站活着、刚核对过官方来源」。
-- additive 幂等;schema 先行再 push(B4 教训)。
CREATE TABLE IF NOT EXISTS etl_heartbeat (
  id smallint PRIMARY KEY DEFAULT 1,
  last_seed timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT etl_heartbeat_one_row CHECK (id = 1)
);
INSERT INTO etl_heartbeat (id, last_seed) VALUES (1, now()) ON CONFLICT (id) DO NOTHING;
