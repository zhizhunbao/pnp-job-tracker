-- 抽选页排名表 draw_rank(抽选页三段式,2026-10-12;设计 docs/design/资讯/抽选-三段式-20261012.md)
-- 惯例(db-push-minefield):建表一律手写 SQL 先行,别让 DB_PUSH 猜;**只写文件不执行,人工审后手动跑生产**,
-- 之后再部署带 DrawRank collection 与 lib/mart 装载规格的代码(新维度表六步:忘给 payload_locked_documents_rels
-- 补列 = seed 500 无 body)。只新建、不改任何旧表的数据。
--
-- 为什么建:抽选页的配额卡与抽选节奏卡各有一套综合排名(邀请人数 / 配额 / 抽选次数 / 频率 / 还在不在抽),
-- 排名是评分,评分在数据层算 —— etl/mart/rank 子域读 pnp_draws / pnp_ops_stats / pathways / macro_series 四张 mart 表算好
-- 名次与节奏状态,前端只读。一行 = 一张卡:kind = quota(联邦 + 各省)/ cadence(一条通道一张)。
--
-- 列型照 Payload 建列惯例(text → varchar、number → numeric、json → jsonb),DB_PUSH 时不会提示改列。
-- 非空只设在 key / kind 上:本表每轮随 seed 整表重灌,一行缺格让整轮 seed 回滚 = 职位停更。
--
-- 跑法(生产):① 跑本文件 → ② 部署带本批改动的代码 → ③ 下一轮汇装出 data/mart/draw_rank.json 并上传,seed 按表哈希增量灌
--   (或本机 python etl/mart/main.py --only draw_rank_table + load --only upload + seed)
--   → ④ 抽查:SELECT kind, count(*) FROM draw_rank GROUP BY kind;   -- 期望 quota ~11 / cadence ~40

CREATE TABLE IF NOT EXISTS draw_rank (
  id               serial PRIMARY KEY,
  key              varchar NOT NULL,     -- 卡片稳定键
  kind             varchar NOT NULL,     -- quota / cadence
  rank             numeric,              -- 名次(两种卡各排各的)
  score            numeric,              -- 综合分
  province         varchar,              -- 省码(联邦 = FED)
  label            varchar,              -- 联邦 EE 类别键
  name_en          varchar,
  name_zh          varchar,
  name_ko          varchar,
  covers           jsonb,                -- 合卡覆盖的通道 [{en, zh, ko}]
  streams          jsonb,                -- 这张卡统计的抽选流名
  scale            varchar,
  last_date        varchar,
  avg_gap_days     numeric,
  status           varchar,              -- ok / late / idle
  draws_ytd        numeric,
  invitations_ytd  numeric,
  invite_unit      varchar,
  nominations_ytd  numeric,
  allocation       numeric,
  allocation_kind  varchar,              -- quota / prTarget
  as_of            varchar,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS draw_rank_key_idx ON draw_rank (key);

-- 新维度表六步之关键一步:Payload 的 payload_locked_documents_rels 表每个 collection 一列,
-- 少了它,seed 里的 `DELETE FROM payload_locked_documents_rels WHERE draw_rank_id IS NOT NULL` 直接 42703,
-- 整个 seed 事务回滚(表现为 /seed 返回 500、无 body;2026-07-27 实撞)。
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS draw_rank_id integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_draw_rank_fk') THEN
    ALTER TABLE payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_draw_rank_fk
      FOREIGN KEY (draw_rank_id) REFERENCES draw_rank(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_draw_rank_id_idx
  ON payload_locked_documents_rels (draw_rank_id);
