-- 通道对照表 pathways 加一列 fits(身份对照,2026-10-11;效果图 docs/design/资讯/申请步骤-分区筛选-20261011.md)
-- 惯例(db-push-minefield):加列一律手写 SQL 先行,别让 DB_PUSH 猜;**只写文件不执行,人工审后手动跑生产**,
-- 之后再部署带 Pathways collection 新字段与 lib/mart 装载规格的代码。只加列、不改任何旧数据;列可空。
-- ⚠ 必须先于代码:读库 SQL(PNP_STEPS)会多取 fits 一列,生产没这一列时整条查询挂、申请步骤卡不出(本地 dev 直连生产,同样)。
--
-- 为什么加:Frank「每个通道适合不同的身份」「有的人想帮别人查」—— 资讯页「申请步骤」按 省份 / 身份 / 教育经历 筛通道。
-- 身份 × 通道能不能走、院校条件由 etl/pathways 段 6 人工核定(不能走与院校条件逐格挂官方原句,自校对 crawl 缓存),前端只读列。
--
-- 跑法(生产):① 跑本文件 → ② 部署带本批 cms 改动的代码 → ③ 换版之后
--   DELETE FROM seed_state WHERE name = 'pathways';(加列窗口期旧代码会按旧列算哈希偷记,不清就静默跳过)
--   → ④ 本地跑汇装单表件(etl/mart --only pathways_table)、整套上传 mart、seed → ⑤ 抽查:
--   SELECT key, fits FROM pathways WHERE fits IS NOT NULL ORDER BY seq;

-- fits:{ 身份: { can: yes|after|no, schools?: [{prov: own|other|canada|any, kind?: public|private, min?: y1|y2|y3|master}], quote?, url? } };没登 null
ALTER TABLE pathways ADD COLUMN IF NOT EXISTS fits jsonb;
