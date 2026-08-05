-- G9 · 联邦 Express Entry 官方计分表(CRS 排名分 + FSW 67 分选择因素)
-- 2026-08-05。数据来源:etl/build_ee_rules.py(只读 data/crawl/fed-ee 缓存,不猜 URL)
--   → data/raw/ee/crs-grid.json + fed-eligibility.json
--   → etl/09_build_mart.py: build_ee_points_grid() → data/mart/ee_points_grid.json → seed。
--
-- ⚠️ 顺序:**先在生产跑本文件,再 push 带 collection 的代码,最后灌 seed**。
-- 惯例见 db-push-minefield:dev 默认不推 schema,加列/删列一律手写 SQL,别让 DB_PUSH 猜。
--
-- 与既有各表的分工(各答一个问题,别混):
--   pnp_occupations    这个职业**在不在**省提名的公开清单
--   pnp_score_factors  在省提名里**能打几分**(BC SIRS / SK / ON,省级打分制)
--   pnp_requirements   打分之前**先要满足什么**(含 province='FED' 的 PGWP / PR-fees /
--                      本轮并入的 CEC·FSW·FST 资格门槛 —— 那 23 条**不建新表**,走 pnp_requirements)
--   ee_points_grid     联邦段**这一格官方给几分**(本表)
--
-- 🔴 两套分共表,靠 grid 列分:
--   grid='CRS'   Comprehensive Ranking System —— 进池之后**排队**用的分(A/B/C/D 四段)
--   grid='FSW67' Federal Skilled Worker 选择因素 —— **够不够格进池**用的 67/100 分制
--   官方明确写明这是两套分。消费端**必须先按 grid 过滤再查表**,不过滤就会把两套分加在一起。
--   合表的理由:两者的官方表格形状完全一样(段 / 小标题 / 因素 / 档位 / 列表头 / 分值),
--   拆两张表只会逼消费端把同一套查表逻辑写两遍。
--
-- 🔴 points 必须可空:官方非数字格(「n/a」「Not eligible to apply」)一律 points=NULL +
--   原文进 points_text,**绝不折成 0**。折了就等于替官方说「这档 0 分」,而官方说的是
--   「这档根本不能申」—— 报告里这两句话意思相反。(本轮实测 229 行里 22 行是 NULL、26 行真是 0 分。)
--
-- 列名避坑:官方那两个字段本来叫 table / column,**两个都是 SQL 保留字** → 落成 table_no / column_label。

CREATE TABLE IF NOT EXISTS ee_points_grid (
  id            serial PRIMARY KEY,
  grid          varchar,        -- 🔴 'CRS' | 'FSW67' —— 两套分的唯一区分键,查表必先按它过滤
  section       varchar,        -- CRS: A/B/C/D;FSW67 恒 'FSW'
  section_label varchar,        -- 官方段名(Core/human capital factors …;FSW67='Selection factors')
  kind          varchar,        -- summary=各段封顶速览表 / detail=逐档明细表。⚠️ 两者不能相加(明细是速览的展开)
  table_no      integer,        -- 官方页内第几张表(0 起)—— 同一 factor 在多张表里出现时用它还原上下文
  heading       varchar,        -- 该表最近的官方小标题(「First official language (maximum 24 points)」)
  factor        varchar,        -- 该表第一列的表头(Age / Level of education / …)
  criterion     varchar,        -- 档位:该行第一格(「CLB level 9 or higher」「20 to 29 years of age」)
  column_label  varchar,        -- 列表头(「Points with a spouse or common-law partner」/「Speaking」)
  points        integer,        -- 🔴 可空:官方非数字格一律 NULL,原文进 points_text,绝不写 0
  points_text   varchar,        -- 官方原格文本(「n/a」「Not eligible to apply」「100」)
  seq           integer,        -- 官方页内原序(重跑稳定)—— 报告要按官方顺序摆
  url           varchar,        -- 官方页面(逐行带,报告挂出处供核对)
  fetched       varchar,        -- 该页**真正被取回**那天(crawl 轮次日期,不是今天)
  updated_at    timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

-- 查询形态:先 grid,再 section/factor 挑段挑因素
CREATE INDEX IF NOT EXISTS ee_points_grid_grid_idx    ON ee_points_grid (grid);
CREATE INDEX IF NOT EXISTS ee_points_grid_section_idx ON ee_points_grid (grid, section);
CREATE INDEX IF NOT EXISTS ee_points_grid_factor_idx  ON ee_points_grid (factor);

-- ⚠️ 手写建表还差这一步(2026-07-27 实撞):Payload 的 payload_locked_documents_rels 表**每个 collection 一列**,
-- 少了它,seed 里的 `DELETE FROM payload_locked_documents_rels WHERE <table>_id IS NOT NULL` 直接 42703 报错,
-- 整个 seed 事务回滚(表现为 /seed 返回 500、**且 body 为空**)。新增 ETL 维度表时这段必须跟着跑。
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS ee_points_grid_id integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_ee_points_grid_fk') THEN
    ALTER TABLE payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_ee_points_grid_fk
      FOREIGN KEY (ee_points_grid_id) REFERENCES ee_points_grid(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_ee_points_grid_id_idx
  ON payload_locked_documents_rels (ee_points_grid_id);

-- ── pnp_requirements:本轮**不加列**,只多了取值 ────────────────────────────────
-- 并入 23 条联邦 EE 门槛:province='FED',program='CEC' | 'FSW' | 'FST'(与既有 'PGWP'、'PR-fees' 同族)。
-- 已有的 factor 之外新增:workTeer / workHours / workLocation / workSelfEmployed / workRecency /
--   workNocGroups / passMark / proofOfFunds / jobOfferOrCertificate / residence / language / education。
-- ⚠️ value 是 integer:EE 那 13 条非数值门槛(TEER 名单、'outside-QC'、'eca-required' …)
--   在 mart 就折进了 basis 的 `valueCode=…`(k=v 包,同 pgwp 的 rule 行),value 留 NULL —— 直灌字符串
--   会 22P02 把整个 seed 事务掀掉。改 ETL 时别把这段还原回去。
