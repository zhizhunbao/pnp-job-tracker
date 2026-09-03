-- PTE Core 刷题两表 pte_types / pte_questions  2026-09-03
-- additive:新建两张表 + 给 payload_locked_documents_rels 各补一列,不动任何既有数据。
-- 惯例见 db-push-minefield:dev 默认不推 schema,建表/加列一律手写 SQL,别让 DB_PUSH 猜。
-- **只写文件不执行,人工审后手动跑生产。**
--
-- 为什么建(Frank 2026-09-03 05:00「上」,设计稿 docs/design/PTE刷题-20260903.md):
--   一年来的功能全是「有事才来」,留存要靠「没事也打开」的日用功能;首个 = 备考期每天刷机经。
--   pte 域由研究域升产品域:etl/pte 的 pte-mart 步把四型题面(ynwac 公开 bundle + duoink 题页正文)
--   与「最近考了」四格一起出表,seed 照 mart 惯例灌;页面只 SELECT。
--
-- 口径:
--   一题一行按源不合并(qid = 源:题型:源内 id;跨源对题留批三);猩际只有信号无题面,不出行。
--   seen / seen_n / votes / freq 来自 processed/pte/recent.json(考生回忆,非官方);
--   🔴 votes / freq / seen / answer / audio_* 可空 = 该源没有,不是 0/空串(seed 端 cellOf 保 null)。
--
-- 跑法(生产):① 跑本文件 → ② 部署带 PteTypes/PteQuestions collection + seed 登记的代码
--   → ③ DELETE FROM seed_state WHERE name IN ('pte_types','pte_questions');(新表无旧哈希,防手滑保险)
--   → ④ 上传 mart + 跑 seed(带 token)→ ⑤ 抽查:
--   SELECT type, source, count(*) FROM pte_questions GROUP BY 1,2 ORDER BY 1,2;
--   SELECT qid, num, left(text,60), seen, seen_n, votes FROM pte_questions WHERE type='WFD' ORDER BY seen DESC NULLS LAST LIMIT 10;

CREATE TABLE IF NOT EXISTS pte_types (
  id         serial PRIMARY KEY,
  code       varchar NOT NULL,        -- 标准题型码(RA / RS / ASQ / WFD …;与 etl/pte CORE_TYPES 同码)
  section    varchar,                 -- Speaking / Writing / Reading / Listening
  seq        numeric,                 -- 考试序(页面胶囊按它排)
  name_zh    varchar,
  name_en    varchar,                 -- 官方英文题型名(Pearson)
  name_ko    varchar,
  audio      boolean,                 -- 题面以音频呈现(RS / ASQ / WFD 先听后答)
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pte_types_code_idx ON pte_types (code);

CREATE TABLE IF NOT EXISTS pte_questions (
  id         serial PRIMARY KEY,
  qid        varchar NOT NULL,        -- 源:题型:源内 id(duoink:RS:682703ac… / ynwac:WFD:137;09-03 加题型段,ynwac id 按型各起)
  source     varchar NOT NULL,        -- ynwac | duoink
  type       varchar NOT NULL,        -- 标准题型码
  num        varchar,                 -- 站内题号(duoink sn / ynwac id),页面显示 #N
  title      varchar,                 -- 索引标题(题面首句截断)
  text       text,                    -- 题面全文
  answer     text,                    -- ASQ 答案;其余 NULL
  audio_url  varchar,                 -- 公开音频直链;NULL = 无(RS/ASQ/WFD 的 TTS 批三合成)
  audio_file varchar,                 -- 本地文件(data/raw/pte 相对路径);NULL = 未落盘
  image_url  varchar,                 -- 题图;四型基本 NULL,留给 DI
  predicted  boolean,                 -- 押题(源方 hot / frequent / important 任一)
  seen       varchar,                 -- 最近考过日 YYYY-MM-DD;NULL = 该源无记录
  seen_n     numeric,                 -- 持有的带日期回忆条数
  votes      numeric,                 -- ynwac 考过票数;NULL = 非 ynwac
  freq       numeric,                 -- duoink Core 热度 0-3;NULL = 非 duoink
  fetched    varchar,                 -- 出表日期
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);
-- 题单页 = 按型筛 + 最近考过倒序 + 押题/来源筛,全靠这三个索引(热筛选列缺索引 = 连接池事故,CLAUDE.md)
CREATE INDEX IF NOT EXISTS pte_questions_type_seen_idx ON pte_questions (type, seen DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS pte_questions_qid_idx ON pte_questions (qid);
CREATE INDEX IF NOT EXISTS pte_questions_type_predicted_idx ON pte_questions (type, predicted);

-- 🔴 Payload 的锁表要跟着各长一列,否则 seed 的 DELETE … WHERE <表>_id IS NOT NULL 撞 42703 → 整个事务回滚
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pte_types_id integer;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pte_types_id_idx
  ON payload_locked_documents_rels (pte_types_id);
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pte_questions_id integer;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pte_questions_id_idx
  ON payload_locked_documents_rels (pte_questions_id);
