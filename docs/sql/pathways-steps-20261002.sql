-- 通道对照表 pathways 加一列 steps(申请步骤批 1,2026-10-02;立项稿 docs/design/申请步骤-20261002.md 第 3.5 节)
-- 惯例(db-push-minefield):加列一律手写 SQL 先行,别让 DB_PUSH 猜;**只写文件不执行,人工审后手动跑生产**,
-- 之后再部署带 Pathways collection 新字段与 lib/mart 装载规格的代码。只加列、不改任何旧数据;列可空,
-- 旧代码读不到新列也不报错(Payload 查询只取它认得的列)。
--
-- 为什么加:Frank「每个省 每个通道 EE PNP AIP 都要有吧」—— 省提名弹框第 ⑤ 张卡由「抽选」换成「申请步骤」,
-- 每条通道一串步骤(步骤词、谁做、不需要 / 卡点、事实行:引用门槛 / 处理时长 / 收件窗口 / 抽选,或官方原句)。
-- 步骤是官方事实的判读,归数据层算(etl/pathways 人工核定 + 每轮逐句对 crawl 缓存自校),前端只读列。
--
-- 跑法(生产):① 跑本文件 → ② 部署带本批 cms 改动的代码(collection 新字段 + lib/mart 装载规格)→ ③ 换版之后
--   DELETE FROM seed_state WHERE name = 'pathways';(加列窗口期旧代码会按旧列算哈希偷记,不清就静默跳过)
--   → ④ 本地跑 etl/pathways 与汇装单表件、上传 mart、seed → ⑤ 抽查:
--   SELECT key, jsonb_array_length(steps) FROM pathways WHERE steps IS NOT NULL ORDER BY seq;

-- steps:申请步骤 object[];没登步骤的通道写 [](弹框照旧出抽选卡)
ALTER TABLE pathways ADD COLUMN IF NOT EXISTS steps jsonb;
