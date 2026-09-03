-- PTE 题目音频表 pte_audio + users.pte_done 练过档  2026-09-03(批三)
-- additive、幂等(IF NOT EXISTS);不动既有数据。
-- 惯例见 db-push-minefield:建表/加列一律手写 SQL,不走 DB_PUSH。
--
-- 为什么(设计稿 docs/design/PTE刷题-20260903.md 批三):
--   ① 音频:批二用浏览器朗读顶着,批三换自合成(piper,离线免费)。生产是 standalone 镜像、构建上下文只有 cms/,
--      仓库里的 data/ 进不了镜像,mart 上传 → /tmp 也不是静态目录 —— 音频跟 mart 其余表一样走 seed 进库,
--      由 /api/pte/audio/[qid] 带 immutable 缓存头吐出去(一题 ~15–80 KB mp3,四型合计 ~25 MB)。
--   ② 练过:批二落 localStorage(按浏览器记);登录用户要跨设备接着刷 —— users 表加一列 JSON 存题键清单,
--      客户端与库取并集(与 answers 档同一套路:cookie 鉴权取本人 id,PUT 整档)。
--
-- 跑法(生产):① 跑本文件 → ② 部署带 lib/pte 路由 + seed 登记的代码 → ③ 上传 mart + seed(带 token)→ ④ 抽查:
--   SELECT count(*), pg_size_pretty(sum(length(b64))) FROM pte_audio;
--   SELECT qid, mime, length(b64) FROM pte_audio LIMIT 5;

CREATE TABLE IF NOT EXISTS pte_audio (
  id         serial PRIMARY KEY,
  qid        varchar NOT NULL,        -- 题键(pte_questions.qid;跨源合并后的正本)
  mime       varchar NOT NULL,        -- audio/mpeg(ffmpeg 在)/ audio/wav(不在)
  b64        text NOT NULL,           -- 音频 base64(seed 走 JSON 只装得下文本;路由端 Buffer.from 解回)
  voice      varchar,                 -- 合成用的声音名(piper en_US-ryan-high),换声音全量重合成时对账
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pte_audio_qid_idx ON pte_audio (qid);

-- 🔴 Payload 锁表跟着长一列(seed 的 DELETE … WHERE <表>_id IS NOT NULL 会撞 42703)
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pte_audio_id integer;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pte_audio_id_idx
  ON payload_locked_documents_rels (pte_audio_id);

-- 练过档:{ done: string[] (qid), updatedAt: ISO }
ALTER TABLE users ADD COLUMN IF NOT EXISTS pte_done jsonb;
