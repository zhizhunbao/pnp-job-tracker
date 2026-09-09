-- 宏观时间序列长表(把脉页省份段,契约 docs/design/把脉页省份段-契约-20260906.md §2):
--   statcan 四表(人口/临时居民/GDP/失业率)+ ircc 三表(新发学签/PR 按年/配额)+ ee 抽选
--   → etl/mart 段21 build_macro_series → data/mart/macro_series.json → seed 灌
-- 流程(照 pilot-quota.sql 惯例):
--   ① 跑本文件(全部 additive,IF NOT EXISTS 可重跑)
--   ② DELETE FROM seed_state WHERE name = 'macro_series';  -- 防加列窗口期旧哈希静默跳过(首灌无旧哈希,防手滑重跑保险)
--   ③ 部署代码 → ④ seed(带 token)→ ⑤ 抽查:
--      SELECT geo, key, period, value, as_of, unit FROM macro_series WHERE geo = 'ON' AND key = 'pop' ORDER BY period DESC LIMIT 8;

-- 一行 = 一个(geo, key, period)点。
-- 🔴 value 可空列但官方缺位的点**根本不出行**(ETL 侧不折 0 —— 折 0 = 替官方编数);
--    period:季/月度 = refPer `YYYY-MM-DD`,年度 = `YYYY`;
--    as_of:完整年 = `YYYY`,进行年 YTD = `YYYY-MM`,季/月 = period 本身(前端必须照它标口径)。
CREATE TABLE IF NOT EXISTS macro_series (
  id serial PRIMARY KEY,
  geo varchar NOT NULL,        -- CA | 十省两位码(领地不收)
  key varchar NOT NULL,        -- pop|npr|asylum|workOnly|studyOnly|workStudy|other|gdp|unemp|studyNew|prAll|prPnp|alloc|eeInvites|comp(2026-09-08 名额竞争比,省级按年)|pnpShare|nprShare(2026-09-09 两个百分比派生:省提名÷PR、临时居民÷人口)
  period varchar NOT NULL,     -- 季/月度 YYYY-MM-DD;年度 YYYY
  freq varchar,                -- Q | M | A
  value numeric,               -- 值;官方缺位的点不出行,不折 0
  as_of varchar,               -- 该点数据截至(YYYY / YYYY-MM / YYYY-MM-DD)
  unit varchar,                -- people | dollars_millions | percent | nominations | ratio(comp,x : 1)
  source varchar,              -- 官方页 URL(alloc 逐年各归各的出处页)
  fetched varchar,             -- raw 抓取日
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS macro_series_geo_key_idx ON macro_series (geo, key);
-- 唯一键 = 契约 §2 的 (geo, key, period);seed 是 DELETE + 全量重灌,这条索引是防重的最后一道。
CREATE UNIQUE INDEX IF NOT EXISTS macro_series_geo_key_period_idx ON macro_series (geo, key, period);

-- 🔴 Payload 锁表补列(new-etl-dim-table 六步之一;不补的话 seed/admin 撞列缺失 → 500 无 body)
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS macro_series_id integer;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_macro_series_id_idx ON payload_locked_documents_rels (macro_series_id);
