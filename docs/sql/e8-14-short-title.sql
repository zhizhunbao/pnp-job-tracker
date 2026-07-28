-- E8-14 ③ · 中文短名列 title_zh_short(窄位显示用,≤7 字)
-- DDL 先行。生成脚本 = etl/clean/04g_short_noc_titles.py(本地 Ollama)。
--
-- 三个名字各司其职,别互相覆盖:
--   title           NOC 2021 官方名(**英文;官方只有英/法两版**)—— 引用依据,永不改
--   title_zh        完整中文译名(本站 04f 译的,非官方)—— 弹框讲语义时用
--   title_zh_short  中文短名(本站 04g 压的)—— 图表横轴、chip 这类窄位用;空则回退 title_zh
ALTER TABLE noc_descriptions  ADD COLUMN IF NOT EXISTS title_zh_short varchar;
ALTER TABLE stats_occupation  ADD COLUMN IF NOT EXISTS title_zh_short varchar;
