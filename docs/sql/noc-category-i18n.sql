-- noc_categories 的中/小分类英韩名(2026-08-03,分类换成 NOC 官方层级那一批)
--
-- 为什么加在维度表而不是前端 i18n:先前中/小分类的英韩显示靠 i18n 里人肉维护的 cat.* 键 ——
-- 分类一变(这次从手搓桶换成官方 Sub-major/Minor 共 251 个类别),英文界面立刻冒出中文类别名
-- (#247 就是同一类事故)。名字跟着分类走同一条管线:
--   mid_en / fine_en = StatCan 官方类别名(去掉「Technical occupations in」这类每条都重复的套话前缀)
--   mid_ko / fine_ko = 本地模型译(逐条校验,不过关留空 → 前端回退英文,宁可留空也不瞎编)
-- 中文名就是列里存的值本身(mid/fine),不另存一列。
--
-- additive:只加列,不动既有数据。跑法(生产)——先跑这份 DDL,再部署代码,
-- 最后 DELETE FROM seed_state WHERE name = 'noc_categories' 再灌
-- (顺序错了会因表级哈希一致而静默跳过,counts=-2)。

ALTER TABLE noc_categories ADD COLUMN IF NOT EXISTS mid_en varchar;
ALTER TABLE noc_categories ADD COLUMN IF NOT EXISTS mid_ko varchar;
ALTER TABLE noc_categories ADD COLUMN IF NOT EXISTS fine_en varchar;
ALTER TABLE noc_categories ADD COLUMN IF NOT EXISTS fine_ko varchar;

-- 灌数前清掉表级哈希(这张表这次是整表换血:104 行 → 官方层级下的新组合)
-- DELETE FROM seed_state WHERE name = 'noc_categories';
