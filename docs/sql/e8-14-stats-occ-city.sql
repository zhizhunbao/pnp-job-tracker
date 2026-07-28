-- E8-14 ②③ · 统计主图的两个新粒度(职业 / 城市)
-- DDL 先行:生产先跑这段,再 push 带 collection 的代码。
-- 现有 stats 表是 省×大类×中类,出不了「具体职业」与「城市」两条横轴 —— 这两张补上。
-- 语义:**当下状态**的维度表,走 seed 的「清空 + 重灌」(与 stats_daily 的只追加不同)。

CREATE TABLE IF NOT EXISTS stats_occupation (
  id                   serial PRIMARY KEY,
  noc                  varchar,
  province             varchar,   -- 'all' = 全国行(前端默认用它,选省时切到具体省)
  title_zh             varchar,
  title_en             varchar,
  teer                 integer,
  broad                varchar,
  open_jobs            integer,
  new7d                integer,
  median_salary_annual integer,
  named_jobs           integer,
  fetched              varchar,
  updated_at           timestamptz DEFAULT now(),
  created_at           timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stats_occupation_noc_idx  ON stats_occupation (noc);
CREATE INDEX IF NOT EXISTS stats_occupation_prov_idx ON stats_occupation (province);

CREATE TABLE IF NOT EXISTS stats_city (
  id                   serial PRIMARY KEY,
  city                 varchar,
  province             varchar,
  open_jobs            integer,
  new7d                integer,
  median_salary_annual integer,
  named_jobs           integer,
  fetched              varchar,
  updated_at           timestamptz DEFAULT now(),
  created_at           timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stats_city_prov_idx ON stats_city (province);

-- 新增 ETL 维度表必跟这一步:payload_locked_documents_rels 每个 collection 一列,
-- 少了它 seed 的 DELETE 直接 42703、整事务回滚(表现为 /seed 500 无 body)。
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS stats_occupation_id integer;
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS stats_city_id integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_stats_occupation_fk') THEN
    ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_stats_occupation_fk
      FOREIGN KEY (stats_occupation_id) REFERENCES stats_occupation(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_stats_city_fk') THEN
    ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_stats_city_fk
      FOREIGN KEY (stats_city_id) REFERENCES stats_city(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_stats_occupation_id_idx ON payload_locked_documents_rels (stats_occupation_id);
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_stats_city_id_idx ON payload_locked_documents_rels (stats_city_id);
