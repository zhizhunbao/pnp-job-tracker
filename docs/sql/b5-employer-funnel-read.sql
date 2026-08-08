-- B5 埋点接线读数(docs/design/在招担保雇主计划-20260808.md §B5)
-- 验收线:modal-pnp → pnp-employer-click ≥5%,2026-08-22 读数。只读查询,不建表不写库。
--
-- 三个事件(站内既有名,原样收进 funnel_events 白名单,见 cms/src/lib/funnel.ts ALIAS):
--   ① modal-pnp           PNP 弹框打开(分母)—— JobsTable AdvisorModal group==='pnp'
--   ② pnp-employer-click  弹框内点了「该公司在招职位 ↗」(分子)—— SponsorLeadCard
--   ③ se-view-jobs        把脉页三分表点雇主名(SponsorEmployersView/StartView)—— 只作橱窗侧参照,
--                          来源不同的另一条路,不进 ①→② 这条转化率的分子分母。
--
-- 本机开发流量不用在这里剔除:funnel_events 是按天聚合计数表(day, event, prop, n),
-- 没有 host 这一列 —— localhost 判断在写入时就做掉了(cms/src/app/api/track/route.ts 用
-- lib/funnel.ts 的 isLocalHost 挡在 INSERT 之前),表里本来就不会出现开发流量的行。

-- 1) 按天:modal-pnp → pnp-employer-click 转化率,se-view-jobs 并列参照
SELECT
  day,
  COALESCE(SUM(n) FILTER (WHERE event = 'modal-pnp'), 0)::int          AS modal_pnp_open,
  COALESCE(SUM(n) FILTER (WHERE event = 'pnp-employer-click'), 0)::int AS employer_click,
  ROUND(
    100.0 * COALESCE(SUM(n) FILTER (WHERE event = 'pnp-employer-click'), 0)
    / NULLIF(SUM(n) FILTER (WHERE event = 'modal-pnp'), 0)
  , 1)                                                                 AS click_rate_pct,
  COALESCE(SUM(n) FILTER (WHERE event = 'se-view-jobs'), 0)::int       AS se_view_jobs_ref
FROM funnel_events
WHERE event IN ('modal-pnp', 'pnp-employer-click', 'se-view-jobs')
GROUP BY day
ORDER BY day DESC;

-- 2) 汇总:从接线上线那天(2026-08-08)到今天的合计转化率 —— 读数当天直接跑这条对验收线
SELECT
  COALESCE(SUM(n) FILTER (WHERE event = 'modal-pnp'), 0)::int          AS modal_pnp_open,
  COALESCE(SUM(n) FILTER (WHERE event = 'pnp-employer-click'), 0)::int AS employer_click,
  ROUND(
    100.0 * COALESCE(SUM(n) FILTER (WHERE event = 'pnp-employer-click'), 0)
    / NULLIF(SUM(n) FILTER (WHERE event = 'modal-pnp'), 0)
  , 1)                                                                 AS click_rate_pct
FROM funnel_events
WHERE event IN ('modal-pnp', 'pnp-employer-click')
  AND day >= DATE '2026-08-08';
