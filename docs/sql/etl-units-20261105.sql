-- 调度单元状态(2026-11-05 Frank「我这个账号是管理员,我需要在 header 加一项,我能看到所有在排队的任务」「其他账号看不到」,
-- 勾选范围含「ETL 调度单元」、形态选「独立页面」):本机 docker 63 个单元的计时只活在各容器内存里(sched 的 next_at),
-- 管理员页 /queue 要看得见「谁在跑、谁排在下一轮、谁失联」,就让每个容器开跑 / 跑完 / 等盒子时把本单元一行 upsert 进来
-- (POST /api/queue/units,带 x-seed-token,与上传 mart 同一把钥匙)。一单元一行,只留现状不留历史。
-- additive、幂等(IF NOT EXISTS);不动既有数据。原生表,不进 seed、不补 payload_locked_documents_rels;
-- 🔴 DB_PUSH=1 会提议删这张表,一律答 N。惯例(db-push-minefield):只写文件不执行,上线前在生产跑(Frank 审后跑)。
--
-- 跑法(生产):① 跑本文件 → ② 部署本批代码(没跑本文件就部署:/queue 的「ETL 调度单元」卡空着,上报接口 500 并留痕,
--   调度器那头只记一行 ! 不影响本轮)→ ③ 重启 ETL 容器(docker compose up -d,带上新的 SEED_TOKEN / UNITS_URL 环境)
--   → ④ 抽查:SELECT state, count(*) FROM etl_units GROUP BY state;

CREATE TABLE IF NOT EXISTS etl_units (
  -- 单元名(= 容器的 SOURCE,域 META 的 name)
  name        varchar PRIMARY KEY,
  -- 节奏(秒,META interval)
  interval_s  integer NOT NULL,
  -- 现在在干嘛:run 正在跑 / wait 等下一轮 / llm 等 LLM 盒子(盒子不通不起步)
  state       varchar NOT NULL,
  -- 上一轮成败;NULL = 容器起来后还没跑完过一轮
  last_ok     boolean,
  -- 本轮(state = run)或上一轮的开跑时刻
  started_at  timestamptz,
  -- 上一轮跑完的时刻
  ended_at    timestamptz,
  -- 下一轮最早开跑的时刻(消费者单元上游有新轮次会提前)
  next_at     timestamptz,
  -- 最近一次上报的时刻
  reported_at timestamptz NOT NULL DEFAULT now()
);
