-- C4 数据补口 · 两列 additive(2026-08-05,docs/implementation/C4-数据补口-20260805.md)
-- **先跑本文件,再灌 seed**;DB_PUSH 一律答 N(它会威胁删手写列,教训在案)。
--
-- ① pnp_occupations.applies_to —— 清单适用范围(空串 = 全项目适用)。
--    病根:SK 那 152 条排除清单只管 OID / EE 两个子类别,Employment Offer 子类别是雇主 offer 制
--    不受它约束(官方原句已 quote-anchored 在 raw/pnp/sk-excluded.json)。旧模型表达不了
--    「清单管哪几条子通道」,于是 72310 木匠被误判成「SK 走不通」—— 判定层拿这一列当门。
ALTER TABLE pnp_occupations ADD COLUMN IF NOT EXISTS applies_to varchar;

-- ② designated_employers.nocs —— 雇主申报的 NOC 码(逗号连接;空串 = 该来源无此信息)。
--    NL 一省改取官方省站全量名录(639 家,带各自申报 NOC,取代旧聚合源的 94 行——同一体系,并存会重复):
--    「639 家里 3 家申报过 72310」这种分母/分子结论要能一条 SQL 出来。NB/NS 行此列空串。
--    ⚠️ 案例 C01 原文写「645 家仅 1 家申报 72310」—— W4 逐页核实为 639 家 3 家,案例文档已照数据修正。
ALTER TABLE designated_employers ADD COLUMN IF NOT EXISTS nocs varchar;

-- ⚠️ 跑完后照惯例清 seed_state(mart 哈希若恰好没变会整表静默跳过、新列永远 NULL):
--   DELETE FROM seed_state WHERE name IN ('pnp_occupations', 'designated_employers');
-- 顺序:① 本文件 → ② DELETE seed_state → ③ seed(带 token)→ ④ 抽查:
--   SELECT count(*) FROM designated_employers WHERE province='NL';                   -- ≈639
--   SELECT name, location FROM designated_employers WHERE nocs LIKE '%72310%';       -- 预期 3 行
--   SELECT applies_to, count(*) FROM pnp_occupations WHERE province='SK' GROUP BY 1; -- 152 条带 OID/EE
