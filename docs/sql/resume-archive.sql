-- E11-08 简历存档与多岗复用(2026-08-04):users.profile 加三个字段。
-- 出处 docs/implementation/E11-用户身份与分型引导/08_简历存档与多岗复用.md §2。
-- 为什么要手写 DDL:`users.profile` 是 Payload `type:'group'`,在 postgres 里**展平成 profile_* 列**、不是 jsonb,
-- 未声明的键被 drizzle 静默丢弃(profile_match_uses 缺列 → 免费日限闸门在生产上一直失效,见文档 §3 ①)。
-- additive 幂等;先跑本文件、再部署代码;dev 的 DB_PUSH y/N 一律答 N(见 [[db-push-minefield]])。
-- 用法:psql "$DATABASE_URI" -f docs/sql/resume-archive.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_resume_text varchar;                        -- 简历文本(PII),服务端截断 20,000 字符
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_resume_saved_at timestamp(3) with time zone; -- 存档时刻(账户页显示新旧)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_match_uses varchar;                          -- 日限计数 "YYYY-MM-DD:N"
