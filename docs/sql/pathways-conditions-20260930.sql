-- 通道对照表 pathways 加五列(通道补全批一,2026-09-30;立项稿 docs/design/通道补全-20260930.md 第八节)
-- 惯例(db-push-minefield):加列一律手写 SQL 先行,别让 DB_PUSH 猜;**只写文件不执行,人工审后手动跑生产**,
-- 之后再部署带 Pathways collection 新字段与 lib/mart 装载规格的代码。只加列、不改任何旧数据;五列都可空,
-- 旧代码读不到新列也不报错(Payload 查询只取它认得的列)。
--
-- 为什么加:通道补全要在省提名弹框的「本岗能走的通道」卡里一岗列多条通道(Frank 09-30「不看工作的也收」
-- 「列进来,标需先有 EE 档案」),每条要知道:跟这个岗有没有关系(上段按岗位筛 / 下段不要 offer 的通道按省列)、
-- 条件标签、按岗位筛的三种条件(TEER、职业码、雇主名)。这些是官方事实的判读,归数据层算(etl/pathways 人工核定 +
-- 每轮自校),前端只读列。
--
-- 跑法(生产):① 跑本文件 → ② 部署带本批 cms 改动的代码(collection 新字段 + lib/mart 装载规格)→ ③ 换版之后
--   DELETE FROM seed_state WHERE name = 'pathways';(加列窗口期旧代码会按旧列算哈希偷记,不清就静默跳过)
--   → ④ 本地跑 etl/pathways 与汇装、上传 mart、seed → ⑤ 抽查:
--   SELECT key, job_linked, tags, teers, nocs, employers FROM pathways ORDER BY seq;

ALTER TABLE pathways ADD COLUMN IF NOT EXISTS job_linked boolean DEFAULT true;  -- 要本省 offer 或本省工作经验 = true(通道卡上段);不看工作 = false(下段)
ALTER TABLE pathways ADD COLUMN IF NOT EXISTS tags jsonb;                       -- 条件标签键 string[]:["ee"]、["localGrad"]、["pgwp"]、["noPgwp"]…(三语文案在 cms i18n)
ALTER TABLE pathways ADD COLUMN IF NOT EXISTS teers jsonb;                      -- 本岗 TEER 在内才列上段 number[];空 = 不限
ALTER TABLE pathways ADD COLUMN IF NOT EXISTS nocs jsonb;                       -- 本岗职业码在内才列上段 string[];空 = 不限(有职业清单的照旧用 occ_labels)
ALTER TABLE pathways ADD COLUMN IF NOT EXISTS employers jsonb;                  -- 雇主名(归一后)命中才列上段 string[];空 = 不限
