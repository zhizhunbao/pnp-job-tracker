-- 手动「重新生成」的每日计数(2026-11-09 Frank:免费每份文件每天 1 次、会员 5 次,不耗额度;所有判断做在服务端)。
-- 原先记在进程内存里,换版或重启就清零、多实例各记各的;挪进库。读写方只有 lib/apply/credit 的 takeRegen。
-- 一行 = 一个人、一个职位、一份文件(步骤名 resume / cover)、一个 UTC 日;n 是当天第几次。
-- 不挂 jobs 外键:职位下架删行不影响计数。
-- 额度账本身不用新表:沿用 ai_trials(docs/sql/ai-trials-20261007.sql),功能名换成 tailor.free / tailor.pro。
-- additive、幂等(IF NOT EXISTS);不动既有数据。原生表,不进 seed;DB_PUSH 提议删表一律答 N。

CREATE TABLE IF NOT EXISTS ai_regens (
  user_id  integer     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id   integer     NOT NULL,
  step     varchar(16) NOT NULL,
  day      date        NOT NULL,
  n        integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, job_id, step, day)
);
