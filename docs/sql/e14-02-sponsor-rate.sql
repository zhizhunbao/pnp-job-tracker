-- E14-02 · stats_occupation 补担保率四列 + 出处列(2026-08-08)
-- 口径:sponsor_rate = LMIA 最新可比季获批岗位数(按 NOC 全国,分子/担保侧)
--                      ÷ JVWS 同季全国空缺数(表 14-10-0444-01,province='NAT' 行,分母/全市场)。
--   同季对同季;两侧最新季不一致时退到都覆盖到的最近共同季度(见 etl/11_build_stats.py
--   _comparable_quarter());任一侧没有交集季度 → 四列整列 NULL,不硬凑跨季比值。
--   实现细节 + 5 NOC 验算对照见 docs/implementation/E14-全市场数据三角/02_担保率.md。
--
-- additive:只加列,不动既有数据。惯例见 db-push-minefield:dev 默认不推 schema,加列一律手写 SQL,
-- 别让 DB_PUSH 猜。**只写文件不执行,人工审后手动跑生产。**
--
-- 只在 stats_occupation 的 province='all'(全国行)落值,与 pnp_provs / channel_tier 同款做法——
-- 省级担保率需要省级 LMIA×NOC 拆分(ESDC 源本有省份列,但本轮 JVWS 分母只取到 NAT 口径),YAGNI,留后续批次。
--
-- 🔴 红线(与 e14-01-jvws-vacancies.sql 同一条):jvws_vac_q 是分母,StatCan 官方抑制(quality=F/../x)
--    或该 NOC 当季本就没有 JVWS 行时**必须 NULL**,不许折 0——折 0 会把 sponsor_rate 算成
--    「除以零」或「无穷大」这种假数字,而实情是「StatCan 没发布这个数,分子和分母压根凑不出比值」。
--    sponsor_pos_q(分子)不受此红线约束:ESDC LMIA 是穷举行政记录(不是抽样调查),某 NOC 当季
--    没有获批记录 = 确实 0 件,是真实的 0,可以直接用(与 jvws_vac_q 的 NULL 语义不同,别混）。
--
-- sponsor_pos_skilled_q 口径(副指标,注意与 build_lmia.py 的 positionsSkilled 是**两个不同定义**,
-- 别混用):本列 = 该行自身 NOC 的 TEER 属于 0-3(技能类)时等于 sponsor_pos_q,否则为 0
--   ——是「这个职业算不算技能类」的开关值,不是 LMIA 项目股别(High Wage/Global Talent/PR-only)。
--   build_lmia.py 的 positionsSkilled 字段服务另一个场景(雇主榜排序),两者不通用、不要相互替换。
--
-- sponsor_evidence(jsonb):{"quarter","jvwsQuality","lmiaSource","jvwsSource"} —— 消费端/报告层
--   引用担保率数字时,quarter 与 jvwsQuality(StatCan A-E 质量码)是必须随行的免责语境
--   (例:85100 普通农场工人那行 quality=D,sponsor_rate=140% 是方法论已知偏差,不是错误行,
--   见 01_JVWS官方接入.md §7.4——报告层不带这层语境会把「分母系统性低估」误读成「岗位数算错了」)。

ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS sponsor_pos_q integer;
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS sponsor_pos_skilled_q integer;
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS jvws_vac_q integer;
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS sponsor_rate numeric;
ALTER TABLE stats_occupation ADD COLUMN IF NOT EXISTS sponsor_evidence jsonb;

-- ══════════════════════════════════════════════════════════════════════════
-- ⚠️ 跑序(必须按这个顺序,踩过坑见下):
--   ① 本文件先在生产跑一遍(建列,此时 seed 白名单/collection 代码都还没接,列会先空着)。
--   ② 部署带 StatsOccupation.ts 加五个字段 + seed/route.ts 白名单接入 sponsor_pos_q 等列的代码。
--   ③ **确认②已换版上线**(看 Render 部署状态 / 打一次探针路由确认新代码在跑)之后,
--      再执行:DELETE FROM seed_state WHERE name = 'stats_occupation';
--   ④ 跑 seed(带 x-seed-token)→ ⑤ 抽查:
--      SELECT noc, sponsor_pos_q, jvws_vac_q, sponsor_rate FROM stats_occupation
--      WHERE province='all' AND noc IN ('21231','31301','63200','85100','72310');
--
-- 🕳️ 为什么③必须卡在「确认换版后」而不是紧跟着①做(2026-08-08 stream_zh 那批实撞的坑,
--    #280 pnp-draws-stream-zh.sql 是姊妹案例,原理相同,这里写更细):
--    seed_state 存的是「mart JSON 文件内容的哈希」,不是「代码版本」。如果在②代码还没换版上线时就
--    提前清了 seed_state,接下来触发的那次 seed 是**旧代码**在跑——旧代码的字段白名单里根本没有
--    sponsor_pos_q 这些新列,但它读到的 mart/stats_occupation.json 文件已经是**新 ETL 产出**
--    (含新字段的那份,因为 ETL 通常先于代码部署跑）。旧代码用这份新内容算出的哈希,和 seed_state
--    比对后判定「没变化」，把这份新内容的哈希**偷偷记成「已同步」**存回 seed_state。
--    等②真正部署上线、代码里有了新字段白名单，再触发 seed 时，mart 文件内容其实没再变
--    （ETL 没重跑），哈希和 seed_state 里那份「旧代码偷记的」一致 → 判定为「未变化」直接跳过整表，
--    新列在生产永远是 NULL，而且这次是**静默跳过，不会报错**，很难排查。
--    结论：窗口期（②代码部署完成之前）绝不能清 seed_state；只能在③明确confirm新代码已经在跑之后才清。
