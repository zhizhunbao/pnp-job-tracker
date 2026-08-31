-- 雇主池两表(雇主板重构批一,2026-08-30;设计稿 docs/design/雇主板重构-20260829.md)
-- 惯例(db-push-minefield):建表一律手写 SQL 先行,别让 DB_PUSH 猜;**人工审后手动跑生产**,
-- 之后再部署带 collection/seed 白名单的代码(新维度表六步:忘给 payload_locked_documents_rels
-- 补列 = seed 500 无 body)。
--
-- 口径(Frank 拍死,etl/employers 是唯一口径来源,板与顾问只读):
--   · 一行=一雇主(employer_pool)+ 雇主×大类桶行(employer_pool_buckets,切面星住桶行);
--   · 星级权重 指定雇主 >> 在招活跃+入门可及 > 技能类 LMIA(旁证);
--   · 裸 LMIA 总量永不入星不入排序;wage/水位可空保 null 不折 0。
-- 列与 etl/employers/scheme.py 的 PoolRow/BucketRow 一一对齐(camelCase → snake_case 由
-- Payload 建列惯例转换;jsonb 三列 = 清单格)。
--
-- 跑法(生产):① 跑本文件 → ② 部署带 EmployerPool/EmployerPoolBuckets collection 与
--   seed 白名单的代码 → ③ curl -H "x-seed-token: $SEED_TOKEN" .../api/seed 增量灌
--   → ④ 抽查:SELECT count(*) FROM employer_pool;  -- 期望 ~6.7 万
--            SELECT star, count(*) FROM employer_pool_buckets GROUP BY star ORDER BY star;

CREATE TABLE IF NOT EXISTS employer_pool (
  id                    serial PRIMARY KEY,
  key                   varchar NOT NULL UNIQUE,   -- slug 或 n:+归一名(池主键)
  slug                  varchar,                   -- 有公司详情页才有
  name                  varchar NOT NULL,
  industry              varchar,
  province              varchar,
  city                  varchar,
  designated            boolean NOT NULL DEFAULT false,
  designated_programs   jsonb,                     -- ["AIP","RCIP",…]
  designated_provinces  jsonb,
  open_jobs_total       numeric NOT NULL DEFAULT 0,
  hist_jobs             numeric NOT NULL DEFAULT 0,
  provinces_active      numeric NOT NULL DEFAULT 0,
  cities_active         numeric NOT NULL DEFAULT 0,
  website_known         boolean NOT NULL DEFAULT false,
  lmia_skilled_total    numeric NOT NULL DEFAULT 0,
  lmia_last_quarter     varchar,
  fetched               varchar,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employer_pool_buckets (
  id                serial PRIMARY KEY,
  employer_key      varchar NOT NULL,              -- = employer_pool.key
  broad             varchar NOT NULL DEFAULT '',   -- 本站大类;'' = 指定雇主无线索通用桶
  open_jobs         numeric NOT NULL DEFAULT 0,
  latest_posted     varchar,
  top_titles        jsonb,
  entry_jobs        numeric NOT NULL DEFAULT 0,
  entry_share       numeric,                       -- 可空:无在招不表态
  min_experience    varchar,
  lmia_skilled      numeric NOT NULL DEFAULT 0,
  lmia_last_quarter varchar,
  star              numeric NOT NULL DEFAULT 1,
  wage_med_annual   numeric,                       -- 可空保 null,不折 0
  wage_index_pct    numeric,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employer_key, broad)
);

-- 板的热查询面:大类×省 切面 + 星级排序(prod-pool-wedge 教训:热筛选列缺索引 = 生产 500)
CREATE INDEX IF NOT EXISTS employer_pool_buckets_broad_star_idx
  ON employer_pool_buckets (broad, star DESC, open_jobs DESC);
CREATE INDEX IF NOT EXISTS employer_pool_buckets_key_idx
  ON employer_pool_buckets (employer_key);
CREATE INDEX IF NOT EXISTS employer_pool_province_idx
  ON employer_pool (province);
CREATE INDEX IF NOT EXISTS employer_pool_name_idx
  ON employer_pool (name);                          -- 查证态全库搜(批二可换 trgm)

-- 新维度表六步之关键一步:锁表 rels 补列(缺 = seed 500 无 body)
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS employer_pool_id integer;
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS employer_pool_buckets_id integer;
