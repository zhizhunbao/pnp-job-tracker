-- 职业在招量聚合表 noc_openings  2026-08-12
-- additive:新建一张表 + 给 payload_locked_documents_rels 补一列,不动任何既有数据。
-- 惯例见 db-push-minefield:dev 默认不推 schema,建表/加列一律手写 SQL,别让 DB_PUSH 猜。
-- **只写文件不执行,人工审后手动跑生产。**
--
-- 为什么建(Frank 2026-08-12「现在是一点一点刷出来,不能一次性刷出来吗?把这个数据现在数据库里聚合好」):
--   选职业控件的热门榜先前是**每次请求现算**一个 GROUP BY —— 还带 percentile_cont(0.5) 求年薪中位,
--   实测带中位数的 200 行要 3.2s,所以代码里既加了进程内缓存,又把前端拆成两次拉:
--   先同步画内置的 14 个兜底职业,`?counts=` 回来补数字,`?top=24` 回来再换成真榜。
--   三段各刷一次 = 用户看到的「一点一点刷出来」。
--   按 CLAUDE.md 的分层,这本来就该在 ETL 里算完:09_build_mart.py 现在一次聚合好落 mart,
--   seed 灌进这张表,消费端只做一次「ORDER BY open DESC LIMIT N」的索引扫描。
--
-- 口径(与被替掉的那条 SQL 逐项对齐,换实现不换数):
--   open        = status='open' 且 noc 非空的岗位数
--   eligible    = 其中 pnp_eligible 的岗位数
--   median_salary = 年薪中位,偶数取两数均值(= percentile_cont(0.5))
--   broad       = 该职业岗位里出现最多的大类(= mode() WITHIN GROUP)
--   title/title_zh/title_*_short 来自 noc_descriptions,官方英文名一个字不动
--
-- 跑法(生产):① 跑本文件 → ② 部署带 09_build_mart.py / NocOpenings.ts / seed 改动的代码
--   → ③ DELETE FROM seed_state WHERE name = 'noc_openings';(新表本来就没记录,清一次不吃亏)
--   → ④ 跑 seed(带 token)→ ⑤ 抽查:
--   SELECT noc, title_zh, open, eligible, median_salary FROM noc_openings ORDER BY open DESC LIMIT 5;

CREATE TABLE IF NOT EXISTS noc_openings (
  id             serial PRIMARY KEY,
  noc            varchar,
  open           numeric,
  eligible       numeric,
  median_salary  numeric,
  broad          varchar,
  title          varchar,
  title_zh       varchar,
  title_zh_short varchar,
  title_ko_short varchar,
  title_en_short varchar,
  updated_at     timestamp with time zone DEFAULT now(),
  created_at     timestamp with time zone DEFAULT now()
);

-- 取前 N 全靠这个索引(消费端只做一次索引扫描,不再 GROUP BY)
CREATE INDEX IF NOT EXISTS noc_openings_open_idx ON noc_openings (open DESC);
CREATE INDEX IF NOT EXISTS noc_openings_noc_idx  ON noc_openings (noc);
CREATE INDEX IF NOT EXISTS noc_openings_broad_idx ON noc_openings (broad);

-- 🔴 Payload 的锁表要跟着长一列,否则 admin 打开该集合会 500(见记忆 new-etl-dim-table-checklist)
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS noc_openings_id integer;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_noc_openings_id_idx
  ON payload_locked_documents_rels (noc_openings_id);
