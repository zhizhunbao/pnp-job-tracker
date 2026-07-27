-- E12-09 ② · 省提名打分表扩到第二个省(SK SINP Points Grid,110 分制)
-- DDL 先行:生产先跑这段,再 push 带新字段的代码(惯例见 db-push-minefield —— dev 默认不推 schema,加列一律手写 SQL)。
-- 表本体已由 docs/sql/e12-09-pnp-score-factors.sql 建好,这里只补 SK 需要而 BC 没有的三列。
--
-- 为什么要这三列(BC 全为 NULL,只有 SK 用):
--   factor_group  官方把因素分了 FACTOR I / II,组内因素相加、组间按子类二选一;
--   group_max     该组的官方上限(I=80、II=30)—— 前端按它封顶,任何勾选组合都不会超过官方分
--   pass_mark     官方硬门槛(SK「至少 60 分才能申请」)。SK 不公布逐次抽选分数线,
--                 这 60 分就是唯一能对照的官方线;BC 有真实抽选线 → pass_mark 留 NULL。

ALTER TABLE pnp_score_factors ADD COLUMN IF NOT EXISTS factor_group varchar;
ALTER TABLE pnp_score_factors ADD COLUMN IF NOT EXISTS group_max    integer;
ALTER TABLE pnp_score_factors ADD COLUMN IF NOT EXISTS pass_mark    integer;
