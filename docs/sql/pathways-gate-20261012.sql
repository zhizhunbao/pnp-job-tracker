-- 通道对照表 pathways 加一列 gate(补全通道的申请门槛,2026-10-12)
-- 惯例(db-push-minefield):加列一律手写 SQL 先行,别让 DB_PUSH 猜;**只写文件不执行,人工审后手动跑生产**,
-- 之后再部署带 Pathways collection 新字段与 lib/mart 装载规格的代码。只加列、不改任何旧数据;列可空。
-- ⚠ 必须先于代码:读库 SQL(PNP_STEPS)会多取 gate 一列,生产没这一列时整条查询挂、申请步骤与门槛卡不出(本地 dev 直连生产,同样)。
--
-- 为什么加:Frank「申请门槛 都有了吗?难民的申请门槛是什么」→「做」—— 2026-10-12 补的 56 条通道(九省创业 / 商业、育空 / 西北地区、
-- 魁北克、联邦经济类、家庭团聚与难民)在门槛表里没有行,「申请门槛」页只写本站未收录。门槛逐条人工核定(etl/pathways),
-- 三语文本随数据走、官方原句自校对 crawl 缓存,前端只读列。
--
-- 跑法(生产):① 跑本文件 → ② 部署带本批 cms 改动的代码 → ③ 换版之后
--   DELETE FROM seed_state WHERE name = 'pathways';(加列窗口期旧代码会按旧列算哈希偷记,不清就静默跳过)
--   → ④ 本地跑汇装单表件、seed → ⑤ 抽查:
--   SELECT key, jsonb_array_length(gate) FROM pathways WHERE gate IS NOT NULL ORDER BY seq;

-- gate:[{ factor, text: {zh, en, ko}, quote, url }];没登 null
ALTER TABLE pathways ADD COLUMN IF NOT EXISTS gate jsonb;
