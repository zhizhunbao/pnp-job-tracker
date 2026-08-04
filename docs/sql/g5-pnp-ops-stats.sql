-- G5 · 省级运营统计维度(对话即产品 §三 工具层 `lookupOps(prov)` 的底表)
-- 2026-08-04(G6):AB/SK/BC 三省 → 四省,补 MB(月度运营数据 + 年报处理天数)与 BC 处理时长。
-- 本表**不需要新列**,只多了 metric/unit/scope_kind 的取值(见下);要跑的 DDL 只有
-- docs/sql/g6-pnp-requirements-condition.sql(那是 pnp_requirements 的事)。
-- 答的是「等多久 / 名额还剩多少 / 被捞概率多大」:配额、已用、待处理、积压游标、
-- EOI 池人数、处理周数、SIRS 分数段分布。数据来源:etl/09_build_mart.py → data/mart/pnp_ops_stats.json → seed。
--
-- ⚠️ 顺序:**先在生产跑本文件,再 push 带 collection 的代码,最后灌 seed**。
-- 惯例见 db-push-minefield:dev 默认不推 schema,加列/删列一律手写 SQL,别让 DB_PUSH 猜。
--
-- 与既有 pnp_* 表的分工(各答一个问题,别混):
--   pnp_occupations    这个职业**在不在**公开清单
--   pnp_score_factors  在了之后**能打几分**
--   pnp_requirements   打分之前**先要满足什么**
--   pnp_ops_stats      满足了之后**还要等多久 / 还剩多少名额**(本表)
--
-- 🔴 红线:`value` 必须可空。官方的隐私抑制值(AB「Less than 10」、BC「<5」)与「本项不适用」
--    一律 value=NULL + value_text 存官方原文,**绝不折成 0**。
--    这张表存在的全部目的就是让「0 / 本站没有 / 官方不公布」三件事在报告里分得开 ——
--    折成 0 就等于替官方编了一个数字,报告会说出「配额已用 0」这种假话。
--
-- scope / scope_kind 是适用范围:scope_kind 说这个 scope 是哪一类(stream / category / scoreBand / all),
-- scope 是具体值(通道名 / SIRS 分数段 "80-89" 等)。引擎按它挑行,挑不到就是 unknown,不拿别省别档的数套。

CREATE TABLE IF NOT EXISTS pnp_ops_stats (
  id           serial PRIMARY KEY,
  province     varchar,        -- AB / BC / SK
  program      varchar,        -- PNP / AIP(与 pnp_occupations.program 同族,分路隔离)
  -- metric 固定词表(ETL 只产这些,别自造):
  --   AB  allocation / issued / remaining / to_process(省级 scope='' 各一行 + 每 stream 一行)
  --       assessing_up_to(积压游标,自由文本恒 value=NULL)/ eoi_pool(每 stream)/ eoi_pool_total(省级)
  --   SK  processing_weeks / allocation / nominations_ytd / capped_pct / capped_spots / priority_sector
  --   BC  sirs_pool(每分数段一行)/ processing_months(每阶段一行,G6 2026-08-04)
  --   MB  allocation / nominations_ytd / nominations_enhanced_ytd / refusals_ytd / laa_ytd /
  --       applications_received_ytd / in_assessment / pending_assessment / inventory /
  --       processing_days(_approved,_refused,每通道一行)/ processing_commitment    (G6 2026-08-04)
  -- ⚠️ 处理时长的后缀 = **官方发布的单位**,不换算:SK 发周(processing_weeks)、BC 发月
  --    (processing_months)、MB 发天(processing_days)。3 个月折成 13 周 = 替官方编了个它没给的精度
  --    (BC 原话只说「约 80% 的案子在 3 个月内」)。要比较请消费端自己换,库里存官方原样。
  metric       varchar,
  scope        varchar,        -- 具体范围值(官方通道名 / 行业 / SIRS 分数段 "80 - 89" / 阶段名;省级留空串)
  scope_kind   varchar,        -- stream / sector / category / scoreRange / stage —— 说明 scope 是哪一类;省级留空串
  label        varchar,        -- 官方原文(英文)—— 报告里挂出处供核对
  value        integer,        -- 🔴 可空:隐私抑制 / 不适用 一律 NULL(原文进 value_text),绝不写 0
  value_text   varchar,        -- 官方原文的非数值表述("Less than 10" / "<5" / "n/a")
  unit         varchar,        -- people / spots / weeks / months / days / nominations / applications / invitations / percent / text / flag
  as_of        varchar,        -- 官方口径日(ISO 字符串)—— 过期检测锚点;SK/MB 与 BC 处理时长没有,改用 period
  period       varchar,        -- 统计期(SK "2026Q2";MB "2026 Jan-Jun"/"2026-06"/"2024";AB 与 BC 池分布留空,它们给的是 as_of)
  url          varchar,        -- 官方页面/文件
  fetched      varchar,
  section      varchar,        -- 官方文件节号/表名
  seq          integer,
  updated_at   timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pnp_ops_stats_province_idx ON pnp_ops_stats (province);
CREATE INDEX IF NOT EXISTS pnp_ops_stats_metric_idx   ON pnp_ops_stats (metric);

-- ⚠️ 手写建表还差这一步(2026-07-27 实撞):Payload 的 payload_locked_documents_rels 表**每个 collection 一列**,
-- 少了它,seed 里的 `DELETE FROM payload_locked_documents_rels WHERE <table>_id IS NOT NULL` 直接 42703 报错,
-- 整个 seed 事务回滚(表现为 /seed 返回 500、无 body)。新增 ETL 维度表时这段必须跟着跑。
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pnp_ops_stats_id integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_pnp_ops_stats_fk') THEN
    ALTER TABLE payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_pnp_ops_stats_fk
      FOREIGN KEY (pnp_ops_stats_id) REFERENCES pnp_ops_stats(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pnp_ops_stats_id_idx
  ON payload_locked_documents_rels (pnp_ops_stats_id);
