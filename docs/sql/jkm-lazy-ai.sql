-- J/K 懒生成批(2026-07-19 Frank 批「先做 J K M」):AI 整理与公司调查的缓存列
-- 幂等;Supabase 生产直跑(node+pg 或 SQL editor)。M 对比表纯前端,无 DDL。
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS jd_formatted text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS jd_formatted_at timestamptz;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_brief text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_website text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_sources text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_fetched timestamptz;
