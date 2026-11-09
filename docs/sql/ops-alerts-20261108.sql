-- 运维页:事件与报警、通道探活、通道实测(2026-11-08 Frank「一气呵成弄完运维」)。
-- 事件照 SWEBOK 4.1 与 Azure Monitor alerts:一次触发一行,user_state = new / ack / closed;同一规则只许一行未恢复。
CREATE TABLE IF NOT EXISTS ops_alerts (
  id bigserial PRIMARY KEY,
  rule text NOT NULL,
  condition text NOT NULL,
  fired_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  user_state text NOT NULL DEFAULT 'new',
  user_state_at timestamptz,
  cause text,
  action text
);
CREATE UNIQUE INDEX IF NOT EXISTS ops_alerts_open_idx ON ops_alerts (rule) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS ops_alerts_fired_idx ON ops_alerts (fired_at DESC);

-- 探活:一个通道一轮一行,保留 30 天。
CREATE TABLE IF NOT EXISTS ops_probes (
  id bigserial PRIMARY KEY,
  channel text NOT NULL,
  ok boolean NOT NULL,
  ms integer,
  error text,
  probed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ops_probes_channel_idx ON ops_probes (channel, probed_at DESC);

-- 通道实测:一个功能、一个模型一行(列照 Claude 文档的成功标准)。
CREATE TABLE IF NOT EXISTS ai_evals (
  id bigserial PRIMARY KEY,
  feature text NOT NULL,
  model text NOT NULL,
  state text NOT NULL DEFAULT 'running',
  accuracy numeric,
  consistency numeric,
  tone numeric,
  privacy numeric,
  method text,
  samples integer NOT NULL DEFAULT 0,
  latency_ms integer,
  cost_usd numeric NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS ai_evals_started_idx ON ai_evals (started_at DESC);
