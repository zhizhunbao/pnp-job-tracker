-- users.answers 问卷答案档  2026-08-15(Frank 拍板「问卷答案入库绑账号」)
-- additive:只加一列,不动既有数据。惯例见 db-push-minefield:加列一律手写 SQL,
-- 不走 DB_PUSH(它会威胁删掉这类手写列,提示一律答 N)。**人工审后手动跑生产。**
--
-- 为什么加:注册闸文案 dp.authGate 写着「注册后答案自动存档」,但答案一直只活在浏览器
-- localStorage(o2p_answers_v1 / o2p_score_answers_v1)—— 清缓存/换设备就全丢,承诺是空的。
-- 这列存整档 JSON:{ basic: Answers(基础 8 题), score: ScoreAnswers(估分段), updatedAt: ISO }。
-- 写入只走 /api/account/answers(cookie 鉴权取本人 id,服务端补 updatedAt);
-- 客户端登录态防抖同步 + 登录/挂载时拉档合并(新者胜),逻辑收在 cms/src/lib/answers.ts。
--
-- 这是 users 表不是 ETL 维度表:不涉及 seed / payload_locked_documents_rels,跑完即可部署代码。
--
-- 跑法(生产):① 跑本文件 → ② 部署带 Users.ts / api/account/answers / lib/answers 改动的代码
--   → ③ 抽查(登录态改一题答案后):
--   SELECT email, answers->>'updatedAt', jsonb_typeof(answers->'basic')
--     FROM users WHERE answers IS NOT NULL ORDER BY updated_at DESC LIMIT 5;

ALTER TABLE users ADD COLUMN IF NOT EXISTS answers jsonb;
