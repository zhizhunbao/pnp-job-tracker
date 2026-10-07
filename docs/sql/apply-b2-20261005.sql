-- 站内投递(付费闭环本批):简历原件 user_resumes、投递偏好 apply_prefs、投递 applications、退信邮箱 bounced_emails  2026-10-05
-- additive、幂等(IF NOT EXISTS);不动既有数据。
-- 惯例(db-push-minefield):建表一律手写 SQL 先行;只写文件不执行,上线前在生产跑(Frank 审后跑,或 Frank 授权助手跑)。
-- 设计稿:docs/design/投递页-B2-实施方案-20261005.md §2 与末节「10-05 Frank 拍板与范围收窄」(开工以末节为准)。
-- 四张都是原生表(先例 employer-explore-20260918.sql、m2-funnel.sql),不是 Payload collection,不进 seed:
--   payload_locked_documents_rels 不补列;🔴 DB_PUSH=1 会提议删这四张表,一律答 N。
-- 🔴 本文件是原生表第一次加外键指向 Payload 管的 users / jobs:DB_PUSH 改这两张表的主键或删表时会被外键挡住
--   (挡住是对的 —— 别为了推 schema 去删外键)。jobs 的外键 ON DELETE SET NULL:?reset=1 是 DELETE FROM jobs,
--   RESTRICT 会让重灌失败、CASCADE 会静默抹掉投递史;投递行自带职位名 / 公司名快照,岗没了列表照样有字。
-- 10-05 收窄:不存简历抽出的文字(users.resumeText 照旧归「我的简历」文字存档,本批不读 → YAGNI);
--   中转回信(relay_token / first_reply_at)挪到下一批,另写 apply-relay-<当天>.sql 加列。
--
-- 跑法(生产):① 跑本文件 → ② 部署本批代码 → ③ 抽查:
--   SELECT count(*), pg_size_pretty(sum(length(file_b64))) FROM user_resumes;
--   SELECT status, count(*) FROM applications GROUP BY status;
--   SELECT count(*) FROM bounced_emails;

-- 🔴 2026-10-06 本段作废(只留档):user_resumes 已由「我的简历」会话改成一人多份(最多 5 份、is_default 一份默认,自增 id 主键),
--   生产已按 docs/sql/user-resumes-multi-20261006.sql 迁移;下面这句 IF NOT EXISTS 在生产不会再生效,以那份为准。
CREATE TABLE IF NOT EXISTS user_resumes (
  user_id      integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,  -- 一人一份现行简历;替换 = 覆盖这一行;注销连删
  file_b64     text NOT NULL,              -- 原件 base64(pte_audio.b64 先例;Resend 附件本就要 base64)
  file_name    varchar(200) NOT NULL,      -- 上传时的原文件名(只给本人看;发给雇主的附件名另起)
  mime         varchar NOT NULL CHECK (mime IN (
                 'application/pdf',
                 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes   integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),  -- ≤ 5 MB
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apply_prefs (
  user_id        integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- 英文署名(Frank 10-05 选「第一次投递时填英文名」):只许 WinAnsi 能编码的西文字母、空格与 .'-,由应用层判;
  -- NULL = 还没填,第 1 步必填。
  sender_name    varchar(60) CHECK (sender_name IS NULL OR char_length(btrim(sender_name)) BETWEEN 2 AND 60),
  -- 我的求职信模板(Frank 10-05 选「改过的记成模板」):带 {{title}} {{company}} {{name}} 占位;NULL = 用站上默认模板。
  cover_template text CHECK (cover_template IS NULL OR char_length(cover_template) <= 4000),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id              serial PRIMARY KEY,
  user_id         integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id          integer REFERENCES jobs(id) ON DELETE SET NULL,
  job_title       varchar NOT NULL,        -- 快照(SavedJobs 先例)
  company         varchar NOT NULL,        -- 快照
  -- replied 留给下一批中转回信(先写进约束,下一批不必改约束);本批只走 draft / sending / sent / bounced。
  status          varchar NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'sending', 'sent', 'replied', 'bounced')),
  cover_text      text NOT NULL CHECK (char_length(cover_text) <= 4000),  -- 换好占位的这一封;draft 时就是草稿
  employer_email  varchar,                 -- 只存不下发;认领发送那一刻从 jobs.apply_email 抄来;draft 为 NULL
  reply_to        varchar,                 -- 这一封实际的回复地址:本批 = 用户注册邮箱(雇主回信直达用户)
  subject         varchar,
  body_text       text,                    -- 发出那一封的固定正文原文
  resume_file     varchar,                 -- 附件名快照
  resume_id       integer REFERENCES user_resumes(id) ON DELETE SET NULL,  -- 当次附的那份简历(2026-10-06 一人多份后第 1 步要选用哪份;删了那份置空,附件名快照照留)
  resume_uploaded_at timestamptz,         -- 当次附的那份简历的上传时刻(简历替换即覆盖,不记就查不到当时发的是哪版;AIApply 对标稿 §5.4)
  cover_file      varchar,
  idem_key        varchar(80),             -- Resend Idempotency-Key = apply-<id>-<内容哈希前 16 位>(审查 #2:改信重发不撞 24 小时)
  resend_id       varchar,                 -- Resend 返回的 id;退信回调按它对账
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
-- 一人一岗一行:草稿原地升级成已投递;job_id 置空后不再撞(NULL 互不相等)
CREATE UNIQUE INDEX IF NOT EXISTS applications_user_job_uq ON applications (user_id, job_id);
-- 我的求职列表、每人每日上限、批 C 一辈子 3 封
CREATE INDEX IF NOT EXISTS applications_user_sent_idx ON applications (user_id, sent_at DESC);
-- 同一用户同一雇主邮箱近期已发去重(审查 #4:mart 同组副本留着自己的邮箱、跨来源重发是不同岗位号)
CREATE INDEX IF NOT EXISTS applications_user_email_idx ON applications (user_id, lower(employer_email))
  WHERE employer_email IS NOT NULL;
-- 全站当日发信预算(Resend 免费档每天 100 封,与提醒信、找回密码共用)
CREATE INDEX IF NOT EXISTS applications_sent_at_idx ON applications (sent_at) WHERE sent_at IS NOT NULL;
-- 退信回调对账
CREATE UNIQUE INDEX IF NOT EXISTS applications_resend_id_uq ON applications (resend_id) WHERE resend_id IS NOT NULL;

-- 退信 / 被抑制的雇主邮箱(审查 #3:本批就真发,退信拦截不等中转回信;Resend email.bounced / email.suppressed 回调写入,
-- 发送前命中即拦下不发)。键 = 小写邮箱。数据层回流(mart 扣下这些邮箱的岗,审查 #20)另批做。
CREATE TABLE IF NOT EXISTS bounced_emails (
  email       varchar PRIMARY KEY CHECK (email = lower(email)),
  kind        varchar NOT NULL CHECK (kind IN ('bounced', 'suppressed')),
  first_at    timestamptz NOT NULL DEFAULT now(),
  last_at     timestamptz NOT NULL DEFAULT now(),
  hits        integer NOT NULL DEFAULT 1 CHECK (hits >= 1)
);
