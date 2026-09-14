-- pnp_draws 加 checklist(抽选类别门槛清单)  2026-09-13
-- additive:只加一列,不动既有数据。惯例见 db-push-minefield:加列一律手写 SQL,**只写文件不执行,人工审后手动跑生产。**
--
-- 为什么加:把脉页抽选表「门槛」弹框 —— Frank「用户只想知道门槛是什么。比如 1 2 3 这种」「先简化」「先出一版」。
-- 每期抽选按类别名对到人工核定清单 data/processed/draw_checklists.json(61 类别,每类别 3~5 条人话,中英,
-- 一类别一官方出处),mart 拼成 {url, items:[{zh,en,ko}]} JSON 串进本列;NULL = 该类别没写清单(弹框出「本站未收录」)。
-- (前身 pnp-draws-rule-streams-20260913.sql 未跑即撤:按通道筛官方条文那套同日 Frank「需要这么复杂吗」撤。)
--
-- 跑法(生产):① 跑本文件 → ② 部署带本批 etl/mart + lib/mart + collections 改动的代码
--   → ③ DELETE FROM seed_state WHERE name = 'pnp_draws';(加列窗口期旧代码 seed 会偷记新哈希,清一次不吃亏)
--   → ④ docker compose exec -T build python etl/load/main.py --only upload 后 curl seed(带 token)→ ⑤ 抽查:
--   SELECT province, stream, left(checklist, 80) FROM pnp_draws WHERE kind='draw' AND province='MB' LIMIT 10;

ALTER TABLE pnp_draws ADD COLUMN IF NOT EXISTS checklist varchar;
