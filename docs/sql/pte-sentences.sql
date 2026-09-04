-- PTE 题面整句中文表 pte_sentences  2026-09-04
-- additive、幂等(IF NOT EXISTS);不动既有数据。
-- 惯例见 db-push-minefield:建表/加列一律手写 SQL,不走 DB_PUSH。
--
-- 为什么(Frank 2026-09-04「这个单词下面列一下这个整句的翻译如何」):点词的字典弹框在释义下面给这个词所在整句的中文。
--   翻译由 etl pte-zh 步在局域网 Ollama(qwen3.6)离线预翻,按句缓存;一句一行进库,/api/pte/zh/[qid] 只读。
--
-- 跑法(生产):① 跑本文件 → ② 部署带路由 + seed 登记的代码 → ③ 上传 mart pte_sentences + seed(带 token)→ ④ 抽查:
--   SELECT count(*), count(*) FILTER (WHERE zh <> '') FROM pte_sentences;

CREATE TABLE IF NOT EXISTS pte_sentences (
  id          serial PRIMARY KEY,
  qid         varchar NOT NULL,        -- 题键(pte_questions.qid)
  idx         integer NOT NULL,        -- 句在题面里的序号(0 起;与前端同一套切句规则)
  en          text NOT NULL,           -- 英文原句
  zh          text,                    -- 中文;空 = 这轮没翻到
  updated_at  timestamp with time zone DEFAULT now(),
  created_at  timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pte_sentences_qid_idx ON pte_sentences (qid, idx);

-- 🔴 Payload 锁表跟着长一列(seed 的 DELETE … WHERE <表>_id IS NOT NULL 会撞 42703)
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pte_sentences_id integer;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pte_sentences_id_idx
  ON payload_locked_documents_rels (pte_sentences_id);
