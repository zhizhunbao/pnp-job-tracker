-- E6-11 批B(2026-08-15):社区职业清单表 + jobs 雇主指定标
-- 流程:① 跑本文件 → ② DELETE FROM seed_state WHERE name IN ('jobs','pilot_occupations','designated_employers');
--       → ③ 部署 → ④ seed → ⑤ 抽查:SELECT community, COUNT(*) FROM pilot_occupations GROUP BY 1;

-- jobs:雇主在其所在试点社区的官方指定雇主名单上(05f 名称归一匹配;比「城市命中」强一级的信号)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pilot_employer boolean DEFAULT false;

-- 社区 × 职业(优先职业/在收职业清单;只给行业名的行 sector_only=true 且 noc 为空,留痕不硬编码)
CREATE TABLE IF NOT EXISTS pilot_occupations (
  id serial PRIMARY KEY,
  community varchar NOT NULL,
  province varchar,
  type varchar,            -- RCIP | FCIP
  noc varchar,             -- 5 位码;官方只给职业名/行业名时为空
  title varchar,           -- 官方原文职业/行业名
  sector_only boolean DEFAULT false,
  url varchar,
  fetched varchar,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pilot_occupations_community_idx ON pilot_occupations (community);
CREATE INDEX IF NOT EXISTS pilot_occupations_noc_idx ON pilot_occupations (noc);

-- 🔴 Payload 锁表补列(不补 admin 打开集合 500)
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pilot_occupations_id integer;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pilot_occupations_id_idx ON payload_locked_documents_rels (pilot_occupations_id);

-- 批C 尾巴(2026-08-15):pilot_occupations 消费端 —— 岗位 NOC × 社区在收清单交叉判定
-- 'yes'|'no'|''(非试点岗/该社区清单无NOC判不了);RCIP 要求 offer 职业在社区清单内,负判定以官方清单为据
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pilot_occ varchar;
