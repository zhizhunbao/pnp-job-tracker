-- 公司真总部六列(2026-09-20;Frank 09-19「省改成总部的省」+ 批动生产表结构;设计稿 docs/design/公司官网定期抓取-20260919.md 第四节)
-- 来源 = sites 域官网整理记录 data/processed/sites/facts.json(总部一节过了页面原句核对的才带),官网没标总部的退
-- company 域维基总部兜底 data/processed/company_wiki_hq.json(Wikidata「总部所在地」属性,只有市 / 省,没有原句)。
-- 判据(Frank):凡是给用户看的公司事实,必须能指回一句官网原文 —— hq_quote 存那句原文,hq_source 存出处网址(官网那一页 / Wikidata 条目)。
-- 公司卡「总部」行、雇主板「总部」列读这几列;companies.region 在总部省是加拿大省码时改取它(mart 汇装时算好,本文件不动 region 列)。
-- 幂等、可空、只加不改:老代码不读这几列,先跑它再换版(新代码 companyDetail / employerPoolPage 会 SELECT 它们,列不存在公司页与雇主板 500;
-- seed 的 COLS_COMPANIES 也会写它们)。类型照 Payload 的 text / textarea / date(varchar / varchar / timestamptz(3)),DB_PUSH 时不会提示改列。
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hq_address varchar;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hq_city varchar;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hq_province varchar;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hq_quote varchar;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hq_source varchar;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS site_checked_at timestamp(3) with time zone;
