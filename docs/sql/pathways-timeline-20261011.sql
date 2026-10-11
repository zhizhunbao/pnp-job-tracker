-- 通道对照表 pathways 加一列 timeline(申请步骤时间线,2026-10-11;效果图 docs/design/资讯/申请步骤-时间线-20261011.md)
-- 惯例(db-push-minefield):加列一律手写 SQL 先行,别让 DB_PUSH 猜;**只写文件不执行,人工审后手动跑生产**,
-- 之后再部署带 Pathways collection 新字段与 lib/mart 装载规格的代码。只加列、不改任何旧数据;列可空。
-- ⚠ 必须先于代码:读库 SQL(PNP_STEPS)会多取 timeline 一列,生产没这一列时整条查询挂、申请步骤卡不出(本地 dev 直连生产,同样)。
--
-- 为什么加:Frank「得有时间线啊,不然用户能看懂吗」「时间线 通道 这个非常重要一定 弄清楚 指着这个卖钱了」——
-- 申请步骤卡顶上出全程区间与逐步时长。时长跨门槛表(干满几个月)、运营统计(省里审理积压)、联邦审理时长(ircc 域段8)汇装,
-- 归数据层算(etl/mart 段25),前端只读列。
--
-- 跑法(生产):① 跑本文件 → ② 部署带本批 cms 改动的代码 → ③ 换版之后
--   DELETE FROM seed_state WHERE name = 'pathways';(加列窗口期旧代码会按旧列算哈希偷记,不清就静默跳过)
--   → ④ 本地跑汇装单表件(etl/mart --only pathways_table)、整套上传 mart、seed → ⑤ 抽查:
--   SELECT key, timeline->>'totalMin', timeline->>'totalMax' FROM pathways WHERE timeline IS NOT NULL ORDER BY seq;

-- timeline:{ steps: [{kind, unit, min, max}](与 steps 同序同长), totalMin, totalMax, fedUpdated };没登步骤的通道 null
ALTER TABLE pathways ADD COLUMN IF NOT EXISTS timeline jsonb;
