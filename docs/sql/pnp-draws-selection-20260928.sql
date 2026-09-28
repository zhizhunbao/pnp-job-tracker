-- pnp_draws 加 selection(同一组同一天的几行各是哪一项选取)  2026-09-28
-- additive:只加一列,不动既有数据。惯例见 db-push-minefield:加列一律手写 SQL,别让 DB_PUSH 猜。
-- 2026-09-27 Frank 看省提名弹框抽选卡「这个数据怎么回事」「BC 也有这个问题」「这他妈弄的乱七八糟的」,
-- 看过效果图后选「照改,加这一列」(同意本文件在生产执行)。
--
-- 为什么加:同一组同一天有好几行,行上看不出是哪一项 —— MB 一期(Draw #N)下有定向职业 / 高分者(某大类)/ 法语 / 曼省毕业
-- 几项选取;BC Innovate 同一天工资档与分数档;NB 按路径(NB Experience / Graduates / Priorities / 两条法语路径)分。
-- 原先每行写流名、悬停看官方原句;09-27「去重复」撤了行上流名,悬停没处挂,几行就分不开了。
--
-- 取值:etl/pnp 解析抽选时按官方原句判的结构化短码(occ / top:N / franco / grad / wage:H:Y / points / path:a+b),
-- 认不出给空串(不猜);mart 原样带进 pnp_draws.selection → seed 灌这列;前端按码翻三语(i18n pnpsel.*)。
--
-- 跑法(生产):① 跑本文件 → ② 部署带 collection / seed 列清单 / 前端改动的代码
--   → ③ DELETE FROM seed_state WHERE name = 'pnp_draws';(加列窗口期旧代码可能偷记新哈希,换版之后再清)
--   → ④ pnp 各省单元按新代码重建 draws-*.json → mart 汇装 pnp_draws → 上传 → 跑 seed(带 token)→ ⑤ 抽查:
--   SELECT province, stream, draw_date, selection FROM pnp_draws WHERE selection <> '' ORDER BY draw_date DESC LIMIT 20;

ALTER TABLE pnp_draws ADD COLUMN IF NOT EXISTS selection varchar;
