-- AI 功能试用账(2026-10-07 收费改判:免费档用自己的简历和信手动投;AI 按 JD 写求职信每人一辈子试用 3 个职位,
-- 第 4 个起弹升级框;同一岗重写不另算)。lib/quota 是这张表唯一的读写方(loadTrial / markTrial)。
-- feature 是功能名(本批只有 'letter' = 按 JD 写求职信;以后按岗改简历记同表),ref_id 是用在哪一个(职位 id)。
-- 不挂 jobs 外键:职位下架删行不该退回试用。
-- additive、幂等(IF NOT EXISTS);不动既有数据。原生表,不进 seed;DB_PUSH 提议删表一律答 N。

CREATE TABLE IF NOT EXISTS ai_trials (
  user_id     integer     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature     varchar(40) NOT NULL,
  ref_id      integer     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature, ref_id)
);
