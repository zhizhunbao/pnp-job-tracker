-- E13-06(政策动态 · 新闻标题中文灰注)—— news 表补「title_zh」一列。
-- 口径:标题一行直译(非逐段协议,与既有 body_zh/summary_zh 独立);专有名词(项目名如 OINP/AAIP、
-- 部门名如 IRCC/IRPA)保留英文缩写不译。产于 etl/news/scrape_immigration_news.py::translate_titles_missing
-- (本地 Ollama qwen3.6,NEWS_LLM_BASE 未设=跳过,不落 Anthropic 兜底);增量:已有非空 title_zh 的行跳过,
-- 连不上/超时/校验不过一律留空,下轮重试,绝不拿英文标题顶包。
--
-- 与 body_zh/summary_zh 不同:那两列是线上懒翻缓存(seed 不许碰,见 cms/src/app/seed/route.ts news 段注释);
-- title_zh 是 ETL 批量产物,随 mart 走常规 upsert 覆盖,不进 staleClear 保护名单。
--
-- 惯例见 db-push-minefield:dev 默认不推 schema,加列一律 docs/sql 手写。纯 ADD COLUMN。
-- 执行顺序:本 DDL 先行 → 部署代码(seed news 列清单已含新列)→ 本地跑翻译步骤回填 news.json →
-- 09_build_mart.py → seed(带 token,不带 reset)。

ALTER TABLE news ADD COLUMN IF NOT EXISTS title_zh varchar;
