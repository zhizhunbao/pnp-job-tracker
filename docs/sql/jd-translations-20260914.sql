-- 2026-09-14 职位对照 / 职位名译名落库(Frank「4 需要更新数据库吧」):
-- 此前 jd-translate 与 jobs/title 两个接口只在进程内缓存,换版即空,同一岗每次换版后重烧一次翻译;
-- 加四列后接口先查列、没有才翻、翻完写回 —— 「处理过的职位直接跳」。
-- 手写 DDL 先行(CLAUDE.md 生产加列惯例;DB_PUSH 会威胁删这四列,提示删列一律答 N)。
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS jd_trans_zh text,
  ADD COLUMN IF NOT EXISTS jd_trans_ko text,
  ADD COLUMN IF NOT EXISTS title_zh text,
  ADD COLUMN IF NOT EXISTS title_ko text;

-- 同日追加:公司官网简介的中文译文也落库(公司弹框 / 公司页「简介抓取自官网」段的对照),与 ai_brief_zh 同形。
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS description_zh text;

-- 同日 Frank「但是如果存进去的是翻译不全或者之前翻译错误呢」→ 版本号:存的是「模型 + 提示词」版本,读时对不上就当没有、重翻覆盖;
-- 换模型 / 改提示词只需把代码里的版本号加一,存量自动作废。老批次写死的机翻别名 trans_v 为 NULL = 版本 0,同样视作过期。
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS trans_v smallint;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trans_v smallint;
