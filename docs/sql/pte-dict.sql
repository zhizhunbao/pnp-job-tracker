-- PTE 题库词典表 pte_dict  2026-09-04
-- additive、幂等(IF NOT EXISTS);不动既有数据。
-- 惯例见 db-push-minefield:建表/加列一律手写 SQL,不走 DB_PUSH。
--
-- 为什么(Frank 2026-09-04「你看人家这个翻译」「现在字典 API 可用吗」「你现在这个字典功能也不好使啊」):
--   批二的选词查词打外网 Free Dictionary API,只给英文释义且反复 522/超时,弹层「查词中」卡死。
--   小枫叶那种「adv. 使人惊奇, 出人意外」正是开源英汉词典 ECDICT(skywind3000/ECDICT,MIT)的 translation 字段。
--   pte-dict 步只把题库里出现的词(~3.6k)出到 mart,seed 进库,/api/pte/dict/[word] 只读库 —— 自托管零外网依赖。
--
-- 跑法(生产):① 跑本文件 → ② 部署带 lib/pte 字典路由 + seed 登记的代码 → ③ 上传 mart pte_dict + seed(带 token)→ ④ 抽查:
--   SELECT count(*) FROM pte_dict;
--   SELECT word, phonetic, left(translation, 40), lemma FROM pte_dict WHERE word IN ('surprisingly','took');

CREATE TABLE IF NOT EXISTS pte_dict (
  id          serial PRIMARY KEY,
  word        varchar NOT NULL,        -- 词(小写;题面切词的原样形,含屈折形如 took / babies)
  phonetic    varchar,                 -- 音标;空 = 词典没给
  translation text,                    -- 中文释义(多义换行分隔;屈折形自己没有就借原形的)
  lemma       varchar,                 -- 原形(took → take);空 = 本身就是原形
  updated_at  timestamp with time zone DEFAULT now(),
  created_at  timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pte_dict_word_idx ON pte_dict (word);

-- 🔴 Payload 锁表跟着长一列(seed 的 DELETE … WHERE <表>_id IS NOT NULL 会撞 42703)
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pte_dict_id integer;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pte_dict_id_idx
  ON payload_locked_documents_rels (pte_dict_id);
