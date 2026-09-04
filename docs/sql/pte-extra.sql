-- pte_questions 加型专属载荷列 extra  2026-09-04(批五:阅读填空 / 读写填空 / 段落排序 / 阅读单选接入)
-- additive、幂等;不动既有数据。惯例见 db-push-minefield:加列一律手写 SQL,不走 DB_PUSH。
--
-- 为什么:四型老题只有题面一段文字;阅读四型各有自己的形状(空与选项 / 段落与正确序 / 题干选项与正确项),
-- 装成 JSON 一列进库,前端按 kind 挑答题件;题面列仍放可读文字(空显成 ____),题单与高亮照旧。
--
-- 跑法(生产):① 跑本文件 → ② 部署带答题件 + seed 登记的代码 → ③ 上传 mart pte_questions + seed → ④ 抽查:
--   SELECT type, count(*) FROM pte_questions WHERE extra IS NOT NULL GROUP BY 1;

ALTER TABLE pte_questions ADD COLUMN IF NOT EXISTS extra text;   -- 型专属载荷 JSON 串;四型老题 NULL
