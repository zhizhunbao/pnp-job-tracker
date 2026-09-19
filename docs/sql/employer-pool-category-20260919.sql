-- 雇主池加「公司分类」列(2026-09-19 Frank「这两个分类应该是属于职位的分类。应该单独弄一个公司的分类。和雇主类型联动」;
-- 设计稿 docs/design/雇主分类与搜索-20260918.md「公司分类」段)。与 sector 两级联动的第二级:
--   公立机构 → hospital / healthauth / university / college / schoolboard / transit / utility / crown / public-other
--   政府四档(联邦 / 省 / 市镇 / 原住民)→ gov-admin / gov-police / gov-defence / gov-tax / gov-justice / gov-parks /
--     gov-infra / gov-health / gov-edu —— 这两段都按名字判,尺子 = etl/names 域 category_of
--   私营 → 本站公司行业 15 类(tech / health / education / finance / professional / construction / manufacturing / retail /
--     hospitality / transport / energy / agriculture / realestate / media / services):池里这一列是按在招岗大类反推的兜底值
--     (反推不出 = NULL);被用户看过的私营雇主由 explore 域的本地模型直接判,写在 employer_explore.industry,板上读数时模型判的优先。
-- ① 纯加列,幂等(IF NOT EXISTS),不动既有数据;旧代码 seed 不写这一列也不受影响。
-- 顺序(加列窗口期的坑见记忆 seed-hash-poisoning-on-column-add):
--   ① 跑本文件
--   ② 推带 category 的 cms 代码(collection EmployerPool / COLS_EMPLOYER_POOL / toEmployerPool)并确认生产换版
--   ③ 删 seed_state 里 employer_pool 的表哈希(防窗口期旧代码偷记新 mart 哈希 → 新列永远灌不进)
--   ④ docker compose exec -T build python etl/employers/main.py → python etl/load/main.py --only upload
--      → curl -H "x-seed-token: $SEED_TOKEN" https://offer2pr.com/api/seed
--   ⑤ 抽查:SELECT category, count(*) FROM employer_pool GROUP BY category ORDER BY 2 DESC;
ALTER TABLE employer_pool ADD COLUMN IF NOT EXISTS category varchar;
CREATE INDEX IF NOT EXISTS employer_pool_category_idx
  ON employer_pool (category);                      -- 公司分类是筛选列:新筛选参数上线必有索引(08-08 jobs.fine 实撞)
-- ② 探索队列里模型判过的旧值是职位大类那 24 个中文标签(金融 / IT / 餐饮 …),与新的 15 个英文键不是一套:
--    旧值清空、条目退回待办,让工人按新名单补判一遍(译名同时重翻,免费;没判完之前板上先用池里的反推值)。
--    可再跑:只动 industry 还是旧标签的行,已是新键的不碰。
--    ⚠ 这一句要在 explore 容器换上新提示词之后跑(docker compose restart explore;容器 bind-mount 仓库,改码只需重启)——
--    早跑了,旧工人会拿旧名单再判一遍;cms 的交活接口只收新键,旧标签会被丢掉、白判一轮。
UPDATE employer_explore SET status = 'pending', industry = NULL
 WHERE industry IS NOT NULL
   AND industry NOT IN ('tech', 'health', 'education', 'finance', 'professional', 'construction', 'manufacturing', 'retail',
                        'hospitality', 'transport', 'energy', 'agriculture', 'realestate', 'media', 'services');
