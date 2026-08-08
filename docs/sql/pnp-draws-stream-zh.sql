-- #280 · pnp_draws 加 stream_zh(抽选流名中文灰注)  2026-08-08
-- additive:只加一列,不动既有数据。惯例见 db-push-minefield:dev 默认不推 schema,
-- 加列一律手写 SQL,别让 DB_PUSH 猜。**只写文件不执行,人工审后手动跑生产。**
--
-- 为什么加(病根):zh 界面下抽选流名(BC「Care: Childcare」/ AB「Alberta Opportunity Stream」等)
-- 满屏英文裸奔——官方专有名保留主文案没问题,但按站规「人话名主文案+代码灰字小注」缺中文灰注。
-- 联邦(FED)轮次已有另一套解法(label=封闭枚举 cat_key,i18n.ts EE_KEY_L10N 全量三语映射),
-- 这列只管省提名(BC/AB/SK/MB/ON/NB/NS/PE/NL)那 41 个 distinct stream 原文。
--
-- 来源:etl/pnp/translate_draw_streams.py 本地 Ollama qwen3.6 批译 → data/processed/draw_stream_zh.json
-- (增量缓存,断点可续)→ 09_build_mart.py 读缓存拼进 pnp_draws.streamZh → seed 灌这列。
-- 缓存里没有的 stream(还没翻 / 翻译校验没过)= streamZh 留空,前端优雅回退纯英文,不是报错。
--
-- 跑法(生产):① 跑本文件 → ② 部署带 09_build_mart.py + seed/route.ts 改动的代码
--   → ③ DELETE FROM seed_state WHERE name = 'pnp_draws';(mart 内容本轮确实变了,哈希理应自然失配
--     不被跳过;但凡「只改列白名单」这类改动都栽过静默跳过的跟头,习惯性清一次不吃亏)
--   → ④ 跑 seed(带 token)→ ⑤ 抽查:
--   SELECT stream, stream_zh FROM pnp_draws WHERE kind='draw' AND province<>'FED' AND stream_zh IS NOT NULL LIMIT 20;

ALTER TABLE pnp_draws ADD COLUMN IF NOT EXISTS stream_zh varchar;
