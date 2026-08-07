-- E13-07(通道档)——stats_occupation 补 channel_tier 一列(全国行有值,省行 NULL)。
-- 口径:etl/11_build_stats.py channel_tier(),交叉三个既有信号(单一实现,前端零计算):
--   both=省紧缺清单∩联邦EE类别 · prov=仅省清单 · fed=仅联邦类别 ·
--   ee=无点名但 TEER 0-3(EE 泛池可)· employer=无点名且 TEER 4-5(仅雇主担保,最难档)。
-- 粗筛信号非资格认定;工作项=docs/implementation/E13-把脉首页/07_通道档.md。
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS channel_tier varchar;
