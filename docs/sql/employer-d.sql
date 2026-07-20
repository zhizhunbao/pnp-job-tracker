-- 雇主 D(2026-07-19 Frank 批):行业(在库岗 NOC 大类多数派)+中韩别名(Wikidata 跨语言标签)+知名(有 Wikipedia 条目)
-- 幂等;富化脚本 etl/clean/_enrich_company_facts.py 直写(seed 白名单外,增量对账不影响)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS alias_zh text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS alias_ko text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS wiki_url text;
