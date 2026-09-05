-- 公司 AI 简介的中文译文(2026-09-05 Frank「主营业务是不是也应该中文翻译」,雇主部分本 session 接管):
-- 五节标记([WHAT][BASE][SIZE][FOUNDED][NOTE])原样保留、只翻正文;懒翻译路由翻完落库,把脉页雇主表按界面语言取。
-- 幂等;seed 白名单外(懒生成列,与 ai_brief 同族,增量对账不影响)。
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_brief_zh text;
