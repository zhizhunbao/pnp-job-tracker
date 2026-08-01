-- E13-01 · 省提名官方**门槛**维度(规则引擎第一刀;DDL 先行:生产先跑这段,再 push 带 collection 的代码)
-- 惯例见 db-push-minefield:dev 默认不推 schema,加列/删列一律手写 SQL,别让 DB_PUSH 猜。
-- 数据来源:etl/pnp/build_bc_req.py(BC PNP Skills Immigration Program Guide 官方 PDF)→ mart/pnp_requirements.json → seed。
--
-- 三张 pnp_* 表各答一个问题,别混:
--   pnp_occupations    这个职业**在不在**公开清单
--   pnp_score_factors  在了之后**能打几分**
--   pnp_requirements   打分之前**先要满足什么**(本表)
--
-- subject 是这轮新增的维度:门槛不只落在申请人身上(BC 6.7/6.8、ON OINP 都对**雇主**设了门槛)。
-- applies_* 三列是适用条件(该条只对某些 TEER / 某个区域 / 某个家庭人数生效);引擎按它挑行,
-- 挑不到就是 unknown —— 不拿别省别档的门槛套(设计《规则引擎与题库配对》§3)。

CREATE TABLE IF NOT EXISTS pnp_requirements (
  id                 serial PRIMARY KEY,
  province           varchar,
  program            varchar,        -- PNP / AIP(与 pnp_occupations.program 同族,分路隔离)
  stream             varchar,        -- 官方通道名;Part 3/6 那种通用要求写「(all streams)」
  subject            varchar,        -- applicant=落在申请人 / employer=落在雇主
  factor             varchar,        -- language / income / experience / education / empYears / empStaff …
  op                 varchar,        -- >= / <= / in / none(none=官方明说这档不要求)
  value              integer,        -- 数值阈值(CLB 4 / 24 个月 / 31264 加元)
  value_text         varchar,        -- 非数值阈值(学历档名等)
  unit               varchar,        -- CLB / months / CAD/yr / employees / years
  applies_teer       varchar,        -- "2,3,4,5" —— 空=不分 TEER
  applies_area       varchar,        -- metro-vancouver / rest-of-bc —— 空=全省
  applies_family_size integer,       -- 最低收入表专用(1..7,7=7 人及以上)
  basis              varchar,        -- occMedian 等「阈值不是绝对数」的口径
  label              varchar,        -- 官方原文(英文)—— 报告里挂出处供核对
  section            varchar,        -- 官方文件节号(3.4 / 3.10 / 6.8)
  seq                integer,
  effective          varchar,        -- 官方生效日 —— 过期检测锚点
  url                varchar,        -- 官方文件(PDF)
  page_url           varchar,        -- 官方网页入口
  fetched            varchar,
  updated_at         timestamptz DEFAULT now(),
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pnp_requirements_province_idx ON pnp_requirements (province);
CREATE INDEX IF NOT EXISTS pnp_requirements_factor_idx   ON pnp_requirements (factor);

-- ⚠️ 手写建表还差这一步(2026-07-27 实撞):Payload 的 payload_locked_documents_rels 表**每个 collection 一列**,
-- 少了它,seed 里的 `DELETE FROM payload_locked_documents_rels WHERE <table>_id IS NOT NULL` 直接 42703 报错,
-- 整个 seed 事务回滚(表现为 /seed 返回 500、无 body)。新增 ETL 维度表时这段必须跟着跑。
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pnp_requirements_id integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_pnp_requirements_fk') THEN
    ALTER TABLE payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_pnp_requirements_fk
      FOREIGN KEY (pnp_requirements_id) REFERENCES pnp_requirements(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pnp_requirements_id_idx
  ON payload_locked_documents_rels (pnp_requirements_id);
