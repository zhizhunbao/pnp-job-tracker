-- 雇主池加「区」列(2026-09-18 Frank「区的字段没有啊」「授权,加区字段」;设计稿 docs/design/雇主分类与搜索-20260918.md)。
-- 值 = 该雇主主省主市的在招岗里出现最多的区(etl/employers home_district_of);NULL = 岗都没带区 / 没有在招。
-- 雇主板「区」可选列(字段面板里勾)读这一列;不是筛选列,不建索引。
-- 纯加列,幂等(IF NOT EXISTS),不动既有数据;旧代码 seed 不写这一列也不受影响。
-- 顺序同 employer-pool-sector-20260918.sql:① 跑本文件 ② 推 cms 代码并确认换版 ③ 删 seed_state 的 employer_pool 表哈希
--   ④ 重建雇主池 → --only upload → curl seed ⑤ 抽查 SELECT count(*) FILTER (WHERE district IS NOT NULL) FROM employer_pool;
ALTER TABLE employer_pool ADD COLUMN IF NOT EXISTS district varchar;
