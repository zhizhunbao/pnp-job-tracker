-- 窄位短名扩到三语(2026-08-02,Frank「还有中文韩语简称,如果名字太长可以用简称」)。
--
-- 现状:只有 title_zh_short 一列。韩文 title_ko 是全称(「등록 간호사 및 등록 정신과 간호사」),
-- 英文官方名同理长(「Registered nurses and registered psychiatric nurses」),
-- 在 375 的报告 H1 上都会折成三行。
--
-- 官方英文 title **一个字都不动**(永远是引用依据);短名是另外两列,只用于窄位显示。
-- 产出:etl/clean/04g_short_noc_titles.py --lang ko,en(本地 Ollama + 撞车检测器 + 人工裁决表)。
--
-- additive:只加列,不动既有数据。跑法(生产)——先跑这份 DDL,再部署代码,
-- 最后 DELETE FROM seed_state WHERE name IN (...) 再灌(顺序错了会因表级哈希一致而静默跳过,
-- 2026-07-28 一天踩两次的坑)。

ALTER TABLE noc_descriptions ADD COLUMN IF NOT EXISTS title_ko_short varchar;
ALTER TABLE noc_descriptions ADD COLUMN IF NOT EXISTS title_en_short varchar;

-- 灌数前清掉表级哈希,否则 seed 会认为「这张表没变」而整表跳过(counts=-2)
-- DELETE FROM seed_state WHERE name = 'noc_descriptions';
