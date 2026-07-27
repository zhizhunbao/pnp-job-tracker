-- E12-09 · 省提名注册打分表维度(DDL 先行:生产先跑这段,再 push 带 collection 的代码)
-- 惯例见 db-push-minefield:dev 默认不推 schema,删列/改类型一律手写 SQL,别让 DB_PUSH 猜。
-- 数据来源:etl/pnp/build_bc_sirs.py(BC PNP Skills Immigration Program Guide 官方 PDF)→ mart/pnp_score_factors.json → seed。

CREATE TABLE IF NOT EXISTS pnp_score_factors (
  id              serial PRIMARY KEY,
  province        varchar,
  system          varchar,          -- 分制名(SIRS…),各省互不相通
  factor          varchar,          -- work / education / language / wage / area
  kind            varchar,          -- row=档位 / bonus=加分 / rule=规则(wage 不穷举)
  seq             integer,
  label           varchar,
  points          integer,          -- rule 行为空
  xor_prev        boolean DEFAULT false,   -- 与上一条加分二选一(官方原文「…, or」)
  rule            varchar,
  factor_max      integer,
  max_total       integer,
  guide_effective varchar,          -- 官方指南生效日 —— 过期检测锚点
  url             varchar,
  fetched         varchar,
  updated_at      timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pnp_score_factors_province_idx ON pnp_score_factors (province);
CREATE INDEX IF NOT EXISTS pnp_score_factors_factor_idx   ON pnp_score_factors (factor);
