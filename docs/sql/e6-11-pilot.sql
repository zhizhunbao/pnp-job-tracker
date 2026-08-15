-- E6-11 RCIP/FCIP 偏远试点接入(2026-08-15):jobs 加 pilot 两列 + pilot_communities 维度表
-- 流程(照 noc-openings.sql 惯例):
--   ① 跑本文件(全部 additive,IF NOT EXISTS 可重跑)
--   ② DELETE FROM seed_state WHERE name IN ('jobs','pilot_communities');  -- 换版后清哈希,防静默跳过
--   ③ 部署代码 → ④ seed(带 token) → ⑤ 抽查:SELECT pilot, pilot_community, COUNT(*) FROM jobs GROUP BY 1,2;

-- jobs:pilot = 'RCIP' | 'FCIP' | 'RCIP+FCIP' | ''(不在试点社区);粗筛信号,试点须雇主先被社区指定
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pilot varchar;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pilot_community varchar;
-- fPilot 是热筛选列(prod-pool-wedge 惯例:新筛选参数上线必配索引)
CREATE INDEX IF NOT EXISTS jobs_pilot_idx ON jobs (pilot);

CREATE TABLE IF NOT EXISTS pilot_communities (
  id serial PRIMARY KEY,
  name varchar NOT NULL,
  province varchar,
  type varchar,          -- RCIP | FCIP
  cities varchar,        -- 命中的 Job Bank 城市名(顿号连接);空 = 界线未举证,不参与打标(宁漏勿错)
  url varchar,           -- 社区官方站(IRCC 名单页给出)
  fetched varchar,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pilot_communities_name_idx ON pilot_communities (name);
CREATE INDEX IF NOT EXISTS pilot_communities_province_idx ON pilot_communities (province);

-- 🔴 Payload 锁表补列:不补的话 admin 打开该集合直接 500(new-etl-dim-table 六步之一)
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pilot_communities_id integer;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pilot_communities_id_idx ON payload_locked_documents_rels (pilot_communities_id);
