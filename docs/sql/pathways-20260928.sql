-- 全国通道对照表 pathways(通道表批一,2026-09-28;立项稿 docs/design/通道表-20260928.md)
-- 惯例(db-push-minefield):建表一律手写 SQL 先行,别让 DB_PUSH 猜;**只写文件不执行,人工审后手动跑生产**,
-- 之后再部署带 Pathways collection 与 lib/mart 装载规格的代码(新维度表六步:忘给 payload_locked_documents_rels
-- 补列 = seed 500 无 body)。只新建、不改任何旧表的数据。
--
-- 为什么建:站上没有「通道」这张表 —— 同一条通道在抽选 / 门槛 / 配额 / 清单四张全国大表里各有写法,
-- 对照散在前端五六张常量表里,改一处漏一处(09-28 盘点 17 次漏改里 7 次是这个)。本表一行 = 一条本站认的通道,
-- 两套名字:plain_*(我们的直白名,三语界面主文案)与 official_name / draw_streams / req_streams / quota_scope / occ_labels
-- (官方各页写法原样照抄,程序拿它们去对官方数据)。数据来源:etl/pathways(人工核定对照 + 每轮对 raw/pnp 自校)
-- → processed/pathways/pathways.json → mart 直通(只多算 quota_key)→ data/mart/pathways.json → seed。
-- 批一只建表灌数,前端一行不动;批二弹框与职位板改读本表(先出效果图)。
--
-- 列型照 Payload 建列惯例(text/textarea → varchar、number → numeric、checkbox → boolean、json → jsonb),DB_PUSH 时不会提示改列。
-- 非空只设在编号上:本表每轮随 seed 整表重灌,一行缺格让整轮 seed 回滚 = 职位停更;必填格由 etl/pathways 自校在源头挡。
--
-- 跑法(生产):① 跑本文件 → ② 部署带本批 cms 改动的代码(collection + lib/mart 装载规格)→ ③ 等 build 下一轮汇装
--   (或 docker compose exec -T ops_build python etl/load/main.py)出 data/mart/pathways.json 并上传,seed 按表哈希增量灌
--   → ④ 抽查:SELECT key, province, plain_zh, official_name, status FROM pathways ORDER BY seq;   -- 期望 29 行
--            SELECT key, quota_scope, quota_key FROM pathways WHERE quota_key IS NOT NULL;      -- 期望阿省 6 行

CREATE TABLE IF NOT EXISTS pathways (
  id              serial PRIMARY KEY,
  key             varchar NOT NULL UNIQUE,      -- 我们的编号(直白、稳定、不随官网改名):bc-skilled-worker
  seq             numeric,                      -- 表内顺序(一组抽选覆盖几条通道时按它拼名字)
  province        varchar,                      -- 省码;联邦项目写 FED
  program         varchar,                      -- PNP / AIP
  plain_zh        varchar,                      -- 我们的中文名(= 职位板 PNP 格那个)
  plain_en        varchar,                      -- 我们的英文名(09-28「界面显示直白名,官方原名放灰字」)
  plain_ko        varchar,                      -- 我们的韩文名
  official_name   varchar,                      -- 官方英文原名(照抄这条通道自己那一页)
  board_label     varchar,                      -- 岗位上挂的通道名(= jobs.pnp_stream 取值);省默认通道为 NULL
  is_default      boolean DEFAULT false,        -- 省默认通道:本省可提名但没挂具名通道的岗落它
  draw_streams    jsonb,                        -- ["Innovate: High Economic Impact"](pnp_draws.stream 原值)
  req_streams     jsonb,                        -- pnp_requirements.stream 原值;门槛卡没接的省为 []
  quota_scope     varchar,                      -- pnp_ops_stats.scope 原值;没有通道级配额为 NULL
  quota_key       varchar,                      -- 配额行 join 键(= pnp_ops_stats.stream_key 同一个归一;不展示)
  occ_labels      jsonb,                        -- pnp_occupations.label 原值;具名清单通道才有
  status          varchar DEFAULT 'open',       -- open / paused / closed
  url             varchar,                      -- 出处页
  quote           varchar,                      -- 出处页官方原句(英文,照抄)
  checked         varchar,                      -- 人工核对日(ISO)
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pathways_province_idx ON pathways (province);

-- 新维度表六步之关键一步:Payload 的 payload_locked_documents_rels 表每个 collection 一列,
-- 少了它,seed 里的 `DELETE FROM payload_locked_documents_rels WHERE pathways_id IS NOT NULL` 直接 42703,
-- 整个 seed 事务回滚(表现为 /seed 返回 500、无 body;2026-07-27 实撞)。
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pathways_id integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_pathways_fk') THEN
    ALTER TABLE payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_pathways_fk
      FOREIGN KEY (pathways_id) REFERENCES pathways(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pathways_id_idx
  ON payload_locked_documents_rels (pathways_id);
