-- RCIP/FCIP 社区名额状态表(旧账立项 2026-08-15):build_pilot_quota.py 周更 raw → 09 落 mart → seed 灌
-- 流程(照 e6-11-pilot.sql 惯例):
--   ① 跑本文件(全部 additive,IF NOT EXISTS 可重跑)
--   ② DELETE FROM seed_state WHERE name = 'pilot_quota';  -- 防加列窗口期旧哈希静默跳过(首灌无旧哈希,防手滑重跑保险)
--   ③ 部署代码 → ④ seed(带 token)→ ⑤ 抽查:
--      SELECT community, type, noc, status, first_come, per_intake, remaining, as_of FROM pilot_quota ORDER BY community, noc;

-- 一行 = 一社区(noc 空,社区级名额状态)或 社区 × NOC(逐职业满额行,官网明文才产)。
-- 🔴 可空列 = 官网没写,不是 0/false(每个值都锚定官网原句 quote+url);seed/消费端禁 `?? 0` / `?? false`。
CREATE TABLE IF NOT EXISTS pilot_quota (
  id serial PRIMARY KEY,
  community varchar NOT NULL,
  province varchar,
  type varchar,               -- RCIP | FCIP | RCIP+FCIP(pilot_communities 按社区名关联;同 jobs.pilot 口径)
  noc varchar,                -- 空 = 社区级行;5 位码 = 该职业行
  status varchar,             -- 职业行:'full'(官网明文满额/不再收);社区级行为空
  first_come boolean,         -- 先到先得;NULL = 官网没写(数据里只有 true/NULL,没有 false)
  first_come_quote varchar,
  first_come_url varchar,
  per_intake integer,         -- 每轮(intake period)最多发几个推荐
  per_intake_quote varchar,
  per_intake_url varchar,
  remaining integer,          -- 官网自报剩余名额
  remaining_quote varchar,
  remaining_url varchar,
  quote varchar,              -- 职业行的锚定原句(社区级行的原句在各 *_quote 列)
  url varchar,
  as_of varchar,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pilot_quota_community_idx ON pilot_quota (community);
CREATE INDEX IF NOT EXISTS pilot_quota_province_idx ON pilot_quota (province);

-- 🔴 Payload 锁表补列(new-etl-dim-table 六步之一;不补的话 seed/admin 撞列缺失 → 500 无 body)
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pilot_quota_id integer;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pilot_quota_id_idx ON payload_locked_documents_rels (pilot_quota_id);
