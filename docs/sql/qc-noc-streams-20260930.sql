-- 魁省职业 → 通道对照表 qc_noc_streams(魁省门槛弹框批 B,2026-09-30;设计 docs/design/魁省门槛弹框-20260929.md)
-- 惯例(db-push-minefield):建表一律手写 SQL 先行,别让 DB_PUSH 猜;**只写文件不执行,人工审后手动跑生产**,
-- 之后再部署带 QcNocStreams collection 与 lib/mart 装载规格的代码(新维度表六步:忘给 payload_locked_documents_rels
-- 补列 = seed 500 无 body)。只新建、不改任何旧表的数据。
--
-- 为什么建:魁省岗能走哪几条通道不能按 TEER 推 —— 受监管职业、部分受监管职业(焊工只有建筑业那份工作受监管)、
-- 要公民身份才能做的职业,只有魁省官方「按 NOC 查通道」工具的数据表说得清。本表一行 = 一个 NOC(516 行,NOC 2021 全集),
-- channels 按卡片顺序列出它能走的通道(PSTQ 1 → 2 → 3 → PEQ 临时工分支),职位板格子取第一个,弹框每个通道一张门槛卡。
-- 数据来源:etl/pnp/qc(官方 xlsx + 受监管职业清单 PDF,两份交叉核对)→ raw/pnp/qc-noc-streams.json → mart 汇装
-- (配上 qc-req.json 的门槛流名、按 qc-peq-req.json 的 TEER 档挂 PEQ)→ data/mart/qc_noc_streams.json → seed。
--
-- 列型照 Payload 建列惯例(text → varchar、json → jsonb),DB_PUSH 时不会提示改列。
-- 非空只设在 noc 上:本表每轮随 seed 整表重灌,一行缺格让整轮 seed 回滚 = 职位停更;必填格由 etl/pnp/qc 自校在源头挡。
--
-- channels 每项:{program: 'PSTQ' | 'PEQ', stream: 门槛流名(= pnp_requirements.stream 原值), code: 官方细分码('3-PNER16'),
--   kind: all / citizenOnly / residentOnly / regulated / regulatedQcDiploma / partlyRegulated,
--   label: 官方说明(英文原文,如 '(in the construction sector only, welders …)'),
--   regulated: [{jobs: 受监管工作[], authorities: 监管机构[]}](法文原文;非受监管通道为 null)}
--
-- 跑法(生产):① 跑本文件 → ② 部署带批 C 改动的代码(collection + lib/mart 装载规格 + 前端)→ ③ 等 build 下一轮汇装
--   (或 docker compose exec -T ops_build python etl/load/main.py)出 data/mart/qc_noc_streams.json 并上传,seed 按表哈希增量灌
--   → ④ 抽查:SELECT count(*) FROM qc_noc_streams;                                        -- 期望 516
--            SELECT noc, jsonb_array_length(channels) FROM qc_noc_streams WHERE noc = '72106'; -- 期望 3

CREATE TABLE IF NOT EXISTS qc_noc_streams (
  id              serial PRIMARY KEY,
  noc             varchar NOT NULL UNIQUE,      -- NOC 2021 五位码
  name            varchar,                      -- 职业名(官方对照表英文原名)
  channels        jsonb,                        -- 能走的通道(见文件头)
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 新维度表六步之关键一步:Payload 的 payload_locked_documents_rels 表每个 collection 一列,
-- 少了它,seed 里的 `DELETE FROM payload_locked_documents_rels WHERE qc_noc_streams_id IS NOT NULL` 直接 42703,
-- 整个 seed 事务回滚(表现为 /seed 返回 500、无 body;2026-07-27 实撞)。
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS qc_noc_streams_id integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_qc_noc_streams_fk') THEN
    ALTER TABLE payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_qc_noc_streams_fk
      FOREIGN KEY (qc_noc_streams_id) REFERENCES qc_noc_streams(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_qc_noc_streams_id_idx
  ON payload_locked_documents_rels (qc_noc_streams_id);
