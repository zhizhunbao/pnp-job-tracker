-- C5 补漏 · designated_employers 加 url/fetched(evidence 随行)  2026-08-06
-- 病根(C5b 实测发现):判定层要引「NL 官方名录 639 家里 3 家申报过 72310」当 supporting fact,
-- 而本表行不带出处 —— 铁律「拿不到出处的数字宁可不返回」逼得这条事实只能闭嘴。
-- raw(nl-employers.json)里逐家页 url 一直都在,是 09 没带出来。additive 两列,NB/NS 旧源行空串。
ALTER TABLE designated_employers ADD COLUMN IF NOT EXISTS url varchar;
ALTER TABLE designated_employers ADD COLUMN IF NOT EXISTS fetched varchar;
-- 顺序照惯例:① 本文件 → ② DELETE FROM seed_state WHERE name='designated_employers' → ③ seed → ④ 抽查:
--   SELECT name, url FROM designated_employers WHERE nocs LIKE '%72310%';  -- 3 行,url 各指其雇主页
