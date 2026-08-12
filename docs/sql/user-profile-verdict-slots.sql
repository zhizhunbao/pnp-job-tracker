-- users.profile 补判定核要的五个槽  2026-08-12
-- additive:只加列,不动既有数据。惯例见 db-push-minefield:dev 默认不推 schema,
-- 加列一律手写 SQL,别让 DB_PUSH 猜(它会威胁删掉这类手写列)。**人工审后手动跑生产。**
--
-- 为什么加(Frank 2026-08-12「先把功能做完善,再考虑在哪部分收费」):
--   职位详情页的「身份判定 → 个人条件」那几行,对**任何人(含 Pro)**都只能输出「判不了」。
--   查下来不是付费闸的问题,是**答案根本没存下来**:
--     · 答题时明明问了「做这个职业一共多久 / 其中在加拿大多久 / 手上有 offer 吗 /
--       有没有加拿大学历」,但 quizToProfile 只落了 currentStatus / nocCodes / targetProvinces / clb;
--     · /api/triple-verdict 组 TripleProfile 时,expCanadaMonths / expForeignMonths /
--       familySize / hasOffer / inCanada 一律硬写 null。
--   于是 tripleVerdict 的 experience / income 行恒 unknown,「最快通道」也跟着判不出来。
--   补完这五列 + 落档 + 读取,那几行才第一次有真结论(收费位置另议,先把功能做完整)。
--
-- 跑法(生产):① 跑本文件 → ② 部署带 Users.ts / EntryQuiz.quizToProfile / triple-verdict 改动的代码
--   → ③ 抽查(拿自己的号答一遍题后):
--   SELECT email, profile_exp_canada_months, profile_exp_foreign_months,
--          profile_has_offer, profile_canada_study, profile_family_size
--     FROM users WHERE email = 'wangsansi9527@gmail.com';

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_exp_canada_months  numeric;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_exp_foreign_months numeric;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_has_offer          boolean;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_canada_study       boolean;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_family_size        numeric;
