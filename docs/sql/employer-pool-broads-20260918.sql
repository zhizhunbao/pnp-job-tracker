-- 雇主池加「在招大类」列(2026-09-18 Frank「全部 EE 类别后面再加一个全部类别,是我们正常用的类别」「授权,加列」)。
-- 值 = 该雇主在招岗覆盖的本站大类(职位板那一套:餐饮 / 医疗 / 技工 / IT …),jsonb 字符串数组,岗多的在前;
-- NULL / [] = 没有在招或岗都未分类。雇主板「全部类别」下拉按它筛(p.broads ? $11),所以建 GIN 索引
-- (新筛选参数上线必有索引,08-08 jobs.fine 实撞)。尺子 = etl/employers broads_of。
-- 纯加列,幂等(IF NOT EXISTS),不动既有数据;旧代码 seed 不写这一列也不受影响。
-- 顺序同 employer-pool-sector-20260918.sql:① 跑本文件 ② 推 cms 代码并确认换版 ③ 删 seed_state 的 employer_pool 表哈希
--   ④ 重建雇主池 → --only upload → curl seed ⑤ 抽查 SELECT count(*) FILTER (WHERE jsonb_array_length(broads) > 0) FROM employer_pool;
ALTER TABLE employer_pool ADD COLUMN IF NOT EXISTS broads jsonb;
CREATE INDEX IF NOT EXISTS employer_pool_broads_idx
  ON employer_pool USING gin (broads);
