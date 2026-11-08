-- AI 额度闸与用量账本(2026-11-08 Frank「Claude API 额度绝不能超」「记录每个功能的 AI 用量和成本」;第 2 批)。
-- ai_budgets:一笔额度一行(同一时刻只有一行 active)。used_usd = 已结算 + 在途预扣,闸就靠这一格。
-- ai_usage:一次模型调用一行,只记功能、通道、token、成本、耗时,🔴 不存提示词和回答。
-- additive、幂等(IF NOT EXISTS / ON CONFLICT);不动既有数据。原生表,不进 seed、不补 payload_locked_documents_rels;
-- 🔴 DB_PUSH=1 会提议删这两张表,一律答 N。
--
-- 跑法(生产):① 跑本文件 → ② 部署本批代码(没跑本文件就部署:预扣撞 42P01,一律按「花不起」降级到 qwen,Claude 一分钱不花)
--   → ③ 抽查:SELECT name, limit_usd, used_usd, expires_at, active FROM ai_budgets;

BEGIN;

CREATE TABLE IF NOT EXISTS ai_budgets (
  id            serial PRIMARY KEY,
  -- 这笔额度的名字
  name          varchar NOT NULL UNIQUE,
  -- 总线:到这儿就不再发 Claude 请求(美元)
  limit_usd     numeric(12,6) NOT NULL,
  -- 日线:一个 UTC 日最多花多少(美元)
  day_limit_usd numeric(12,6) NOT NULL,
  -- 已结算 + 在途预扣(美元)
  used_usd      numeric(12,6) NOT NULL DEFAULT 0,
  -- day_key 这一天的已结算 + 在途预扣(美元)
  day_used_usd  numeric(12,6) NOT NULL DEFAULT 0,
  -- day_used_usd 记的是哪个 UTC 日;换日后第一次预扣时归零
  day_key       date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  -- 生效与到期;到期后闸按 0 算
  starts_at     timestamptz NOT NULL,
  expires_at    timestamptz NOT NULL,
  -- 正在用的那一笔
  active        boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- 同一时刻只许一笔 active:闸的 UPDATE 靠它只命中一行
CREATE UNIQUE INDEX IF NOT EXISTS ai_budgets_one_active_idx ON ai_budgets ((true)) WHERE active;

CREATE TABLE IF NOT EXISTS ai_usage (
  id                 bigserial PRIMARY KEY,
  -- 记在哪笔额度上;免费通道和被拦下的调用 = NULL
  budget_id          integer REFERENCES ai_budgets (id),
  -- 功能名(调用点传的,如 apply.letter)
  feature            varchar NOT NULL,
  -- 通道:anthropic / friend / ollama
  channel            varchar NOT NULL,
  model              varchar NOT NULL,
  -- reserved 在途 / ok 成功 / failed 失败退款 / unknown 结局不明按预扣全额记 / blocked 闸拦下
  state              varchar NOT NULL,
  -- 这次是从哪个通道降级来的;没降级 = NULL
  degraded_from      varchar,
  -- 预扣的最坏成本与结算后的实际成本(美元)
  reserved_usd       numeric(12,6) NOT NULL DEFAULT 0,
  cost_usd           numeric(12,6) NOT NULL DEFAULT 0,
  -- 上游报的 token;没报 = NULL
  input_tokens       integer,
  output_tokens      integer,
  cache_read_tokens  integer,
  cache_write_tokens integer,
  -- 送进去和拿回来的字符数
  input_chars        integer NOT NULL DEFAULT 0,
  output_chars       integer NOT NULL DEFAULT 0,
  ms                 integer,
  -- 失败原因(截断);成功 = NULL
  error              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  settled_at         timestamptz
);
-- 运维页按时间、按功能汇总都走这两个索引
CREATE INDEX IF NOT EXISTS ai_usage_created_idx ON ai_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_feature_idx ON ai_usage (feature, created_at DESC);

-- 2026-11-08 Console 赠金 $200,2026-11-22 UTC 到期;站内硬停线 $180,日线 $25(Frank 按默认值拍)。
-- 官方只写到期日,这里按当天 00:00 UTC 算,宁早勿晚。
INSERT INTO ai_budgets (name, limit_usd, day_limit_usd, starts_at, expires_at, active)
VALUES ('promo-20261108', 180, 25, '2026-11-08 00:00:00+00', '2026-11-22 00:00:00+00', true)
ON CONFLICT (name) DO NOTHING;

COMMIT;
