-- pnp_draws 加 rule_streams(抽选类别 → 门槛通道对照)  2026-09-13
-- additive:只加一列,不动既有数据。惯例见 db-push-minefield:加列一律手写 SQL,**只写文件不执行,人工审后手动跑生产。**
--
-- 为什么加:把脉页抽选表「门槛」弹框此前弹整省全部门槛(曼省 163 条,其中 155 条是紧缺职业清单的逐 NOC 语言分),
-- Frank 2026-09-13「你这个门槛 不是所有的门槛吧。只是这一个类别的门槛吧」。抽选公告的类别名
-- (「Completed post-secondary study in Manitoba」)与资格页的通道名(「MPNP Skilled Worker Stream — SWM Pathway」)
-- 没有共同键,人工核定一张对照表(data/processed/draw_rule_streams.json),mart 拼进 pnp_draws.ruleStreams(JSON 串)。
-- NULL = 该类别没对过(前端退回全省门槛);"[]" = 对过但条文没抓(ON 的 EJO 三流,前端出「本站未收录」)。
--
-- 跑法(生产):① 跑本文件 → ② 部署带本批 etl/mart + lib/mart + collections 改动的代码
--   → ③ DELETE FROM seed_state WHERE name = 'pnp_draws';(加列窗口期旧代码 seed 会偷记新哈希,清一次不吃亏)
--   → ④ docker compose exec -T build python etl/load/main.py --only upload 后 curl seed(带 token)→ ⑤ 抽查:
--   SELECT province, stream, rule_streams FROM pnp_draws WHERE kind='draw' AND province='MB' LIMIT 10;

ALTER TABLE pnp_draws ADD COLUMN IF NOT EXISTS rule_streams varchar;
