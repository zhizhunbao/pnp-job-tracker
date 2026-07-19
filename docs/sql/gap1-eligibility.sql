-- GAP1③ JD 身份预筛(2026-07-19):jobs 加两列——红旗枚举 + 命中原句(citation 可核验)。
-- 值域:eligibility_flag ∈ ('no_sponsorship','pr_required',NULL);全量实测 94+12=106 岗命中(精确优先宁可漏)。
-- 幂等;普通 ALTER 秒级,无 CONCURRENTLY 需求;33k 行不需要索引(筛选谓词=COALESCE(flag,'')='',全表可扫)。
-- 用法:psql "$DATABASE_URI" -f docs/sql/gap1-eligibility.sql
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS eligibility_flag varchar;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS eligibility_quote varchar;
