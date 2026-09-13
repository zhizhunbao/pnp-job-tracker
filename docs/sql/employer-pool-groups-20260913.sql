-- 雇主池桶表改切八行业组(2026-09-13 Frank「八组 开批一」;设计稿 docs/design/雇主板重构-20260829.md 校正记录)。
-- 桶键由本站 27 大类(列 broad,中文大类名)改为 8 行业组键(列 ind_group:health/stem/trades/food/
-- transport/manufacturing/business/education;other = 未分类岗桶;'' = 指定雇主无线索通用桶),
-- 键表单一来源 etl/noc/constants.py GROUP_KEYS / BROAD_GROUP(与把脉页 IND_KEYS 同一份分组)。
-- 只改列名不动数据:RENAME COLUMN 后唯一键 (employer_key, ind_group) 与切面索引自动跟随,
-- 旧的 27 大类行由下一轮 seed 整表重灌(表哈希变 → DELETE + INSERT)换成组桶行,不需要手工清。
-- 顺序(窗口里旧代码 seed 会因缺 broad 列失败整体回滚、下小时兜底重试,窗口要短):
--   ① 部署带 ind_group 的代码(collection / COLS_EMPLOYER_POOL_BUCKETS / toEmployerPoolBucket)并确认 /api/version 换版
--   ② 跑本文件
--   ③ docker compose exec -T build python etl/employers/main.py → python etl/load/main.py --only upload
--      → curl -H "x-seed-token: $SEED_TOKEN" https://offer2pr.com/api/seed
--   ④ 抽查:SELECT ind_group, count(*) FROM employer_pool_buckets GROUP BY ind_group ORDER BY 2 DESC;  -- 期望 10 行(8 组 + '' + other)
-- 索引/约束改名只为名副其实(值不变);IF EXISTS 让重跑幂等。
ALTER TABLE employer_pool_buckets RENAME COLUMN broad TO ind_group;
ALTER TABLE employer_pool_buckets RENAME CONSTRAINT employer_pool_buckets_employer_key_broad_key TO employer_pool_buckets_employer_key_ind_group_key;
ALTER INDEX IF EXISTS employer_pool_buckets_broad_star_idx RENAME TO employer_pool_buckets_ind_group_star_idx;
