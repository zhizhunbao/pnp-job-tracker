-- 通道对照表 pathways 加一列 category(各省官方分类,2026-10-12)
-- 惯例(db-push-minefield):加列一律手写 SQL 先行,别让 DB_PUSH 猜;**只写文件不执行,人工审后手动跑生产**,
-- 之后再部署带 Pathways collection 新字段与 lib/mart 装载规格的代码。只加列、不改任何旧数据;列可空。
-- ⚠ 必须先于代码:首屏维度 SQL(DIMS_PATHWAYS)会多取 category 一列,生产没这一列时职位板首屏维度整条查询挂(本地 dev 直连生产,同样)。
--
-- 为什么加:Frank「只有联邦 有 子分类 其他没有子分类吗」→「各省有自己单独的分类吗」→ 选「照搬各省官方分类」:
-- 资讯「申请门槛」「申请步骤」两页按各省官网自己的分类出组头(BC Skills / Entrepreneur Immigration、MB 三个 stream ……)。
-- 分类逐省人工核定(etl/pathways PROV_CATEGORIES),官方原句自校对 crawl 缓存,前端只读列。
--
-- 跑法(生产):① 跑本文件 → ② 部署带本批 cms 改动的代码 → ③ 换版之后
--   DELETE FROM seed_state WHERE name = 'pathways';(加列窗口期旧代码会按旧列算哈希偷记,不清就静默跳过)
--   → ④ 本地跑汇装单表件、seed → ⑤ 抽查:
--   SELECT key, category ->> 'en' FROM pathways WHERE category IS NOT NULL ORDER BY seq;

-- category:{ key, en, zh, ko };官方平铺列通道的省与联邦为 null
ALTER TABLE pathways ADD COLUMN IF NOT EXISTS category jsonb;
