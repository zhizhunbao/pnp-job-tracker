-- 公司 AI 简介的韩文译文(2026-09-05 Frank 韩语界面「没有翻译」;与 ai_brief_zh 同族):
-- 五节标记原样保留只翻正文,company 域 brief 步本地 qwen 翻,mart 汇装进列,把脉页韩文界面取。
-- 幂等;seed 白名单内走 COALESCE(mart 没做到的公司保旧值)。
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_brief_ko text;
