-- 探索队列第二工种:点开过的公司优先抓官网 / 整理总部 / 找官网(2026-09-20 Frank「下一个 session 做『按用户点开过的公司优先抓取和纠错』的队列」
-- 「就是 AI 探索的时候,显示 抓取官网,然后才是生成内容 和 翻译。如果没有官网先 探索官网和 wiki」「开工」)。
-- 设计稿 docs/design/点开优先抓取与纠错-20260920.md。原 status 列仍只管翻译名那条工种,两个工种各看各的列:
--   opened_at  = 最近一次真人点开公司页 / 公司弹框(只认带 x-human 标记的请求;雇主板列出不记这格)
--   open_count = 被真人点开过几次
--   stage      = 官网那条工种办到哪一步:queued 排队中 / find 查找官网 / fetch 抓取官网 / facts 整理内容 / done 办完 / none 找不到官网;
--                NULL = 从没被点开过(不在这条工种里)
--   stage_at   = stage 最后一次变化的时刻(24 小时内走过一轮的再点不重走)
--   stage_note = 这一步的由头(失败原因 / 官网来路)
--   site_host  = 这一轮抓的官网主机名(同主机名 24 小时只抓一次的尺子)
-- 取活索引:工人按 stage 取、最近点开的在前。只加列加索引,幂等,不动既有列与数据。
ALTER TABLE employer_explore ADD COLUMN IF NOT EXISTS opened_at timestamptz;
ALTER TABLE employer_explore ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0;
ALTER TABLE employer_explore ADD COLUMN IF NOT EXISTS stage varchar;
ALTER TABLE employer_explore ADD COLUMN IF NOT EXISTS stage_at timestamptz;
ALTER TABLE employer_explore ADD COLUMN IF NOT EXISTS stage_note varchar;
ALTER TABLE employer_explore ADD COLUMN IF NOT EXISTS site_host varchar;
CREATE INDEX IF NOT EXISTS employer_explore_stage_idx
  ON employer_explore (stage, opened_at DESC);
