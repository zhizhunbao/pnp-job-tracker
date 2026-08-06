-- E13-05(把脉首页 · 真口径可提名省份)——stats_occupation 补「pnp_provs」一列。
-- 口径:按省序(BC AB SK MB ON NB NS PE NL,QC 由 pnp_eligible 内部按 NON_PNP_PROV 自然排除)
-- 逐省过 etl/08_score.py 的 pnp_eligible(noc, teer, prov)(排除式/inclusion/overlay/QC 全处理),
-- 命中省代码用顿号 `、` join;只在 province='all' 的全国行写值,省级行留空。
-- 单一实现见 etl/11_build_stats.py(importlib 加载 08_score,不复制判定逻辑);
-- 设计与验收标准见 docs/implementation/E13-把脉首页/05_真口径可提名省份.md。
--
-- ⚠️ 这是**粗筛信号,非资格认定**——各省另有语言/工资/雇主条件,前端 tooltip 必带此句(信任边界不砍)。
--
-- 惯例见 db-push-minefield:dev 默认不推 schema,加列一律 docs/sql 手写。纯 ADD COLUMN。
-- 执行顺序:本 DDL 先行 → 部署代码(seed 白名单已含新列)→ 本地跑 11_build_stats.py → seed(带 token,不带 reset)。

ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS pnp_provs varchar;
