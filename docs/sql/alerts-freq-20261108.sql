-- 提醒列表(2026-11-08「我的」清单第 5、6 条:按档案推荐与按筛选条件的提醒并成一张表):saved_searches 加频率列。
-- freq:off(停用)/ daily / weekly;默认 daily。additive、幂等,不动既有数据。
-- 惯例:只写文件不执行,Frank 审后在生产跑。🔴 DB_PUSH=1 的删列提示一律答 N。
--
-- 顺序:① 跑本文件 → ② 部署本批代码(代码先上而列没加,saved-searches 接口和退订都会报错)→ ③ 抽查:
--   SELECT freq, count(*) FROM saved_searches GROUP BY freq;

ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS freq text NOT NULL DEFAULT 'daily';
