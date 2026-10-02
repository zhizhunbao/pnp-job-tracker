-- AIP 指定雇主拆表(2026-10-02,三弹框统一第 3 步):designated_employers 加六列。
-- Frank「这是不是 拆成人能看懂表格比较好」「不需要一次查询 1574 家吧」「可以,做吧」「做完一起推」(加列授权同条)。
-- 写入方 = mart:with_designated_split(AIP 三省名单与 NL 官网名录同一把尺子)——
--   trade 招牌 / store 门店(只认地名,宁可留空)/ legal 法人 / brand 招牌键(同省同制度同招牌各家共用)/
--   brand_n 同招牌法人家数 / match_keys 比对键(名单这一行几种写法的归一名,「|」连接,与 AIP 打标同一把尺子)。
-- 读取方 = AIP 弹框指定雇主卡:按本岗公司的归一名对 match_keys,只取本岗雇主那一行与同招牌的几家(不再整表预载 3863 家)。
-- 先于换版执行(换版后的灌库代码会写这几列;旧代码不读不写,先跑无害)。可空、无默认值,加列是瞬时的元数据变更。
-- 灌库顺序见记忆 single-table-change-no-full-chain:换版完成后删 seed_state 该表哈希 → mart --only designated_table → upload → seed。

ALTER TABLE designated_employers ADD COLUMN IF NOT EXISTS trade varchar;
ALTER TABLE designated_employers ADD COLUMN IF NOT EXISTS store varchar;
ALTER TABLE designated_employers ADD COLUMN IF NOT EXISTS legal varchar;
ALTER TABLE designated_employers ADD COLUMN IF NOT EXISTS brand varchar;
ALTER TABLE designated_employers ADD COLUMN IF NOT EXISTS brand_n numeric;
ALTER TABLE designated_employers ADD COLUMN IF NOT EXISTS match_keys varchar;

-- 弹框按 省 + 招牌键 取同招牌的几家。
CREATE INDEX IF NOT EXISTS designated_employers_province_brand_idx ON designated_employers (province, brand);
