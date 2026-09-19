-- 雇主池加「在招 EE 类别」列(2026-09-19 Frank「类别 和 全部大类 雇主也是需要的吧」「授权,加列」)。
-- 值 = 该雇主在招岗覆盖的联邦 EE 类别(职位板「全部类别」那一套:医疗社服 / STEM / 技工 / 教育 / 运输 …,岗上是「A/B」多段的拆开),
-- jsonb 字符串数组,岗多的在前;NULL / [] = 没有在招或岗都不属任何 EE 类别。雇主板「全部类别」下拉按它筛(p.ees ? $12),
-- 所以建 GIN 索引。尺子 = etl/employers ees_of。纯加列,幂等,不动既有数据。
-- 顺序同 employer-pool-broads-20260918.sql:① 跑本文件 ② 推 cms 代码并确认换版 ③ 删 seed_state 的 employer_pool 表哈希
--   ④ 重建雇主池 → --only upload → curl seed。
ALTER TABLE employer_pool ADD COLUMN IF NOT EXISTS ees jsonb;
CREATE INDEX IF NOT EXISTS employer_pool_ees_idx
  ON employer_pool USING gin (ees);
