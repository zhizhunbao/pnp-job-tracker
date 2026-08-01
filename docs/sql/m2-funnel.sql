-- 主线 M2「漏斗五个数」(E7-05):第一方漏斗计数表。
-- 为什么不从 umami 拉:免费档不开放 API(share token 调 metrics 一律 401),
-- 且 umami 脚本会被广告拦截器挡掉 —— 「锁区曝光」这一步的数不能带着未知拦截率去做 M3 的分叉判断。
-- 只存**按天聚合的计数**:没有 IP、没有 UA、没有 user id、没有 session —— 天然匿名。
-- additive 幂等;schema 先行再 push(B4 教训,见 [[db-push-minefield]])。
CREATE TABLE IF NOT EXISTS funnel_events (
  day   date    NOT NULL,
  event text    NOT NULL,
  prop  text    NOT NULL DEFAULT '',   -- 低基数分组(卡名 pr/job/prov、锁区类别…),不放自由文本
  n     integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event, prop)
);
