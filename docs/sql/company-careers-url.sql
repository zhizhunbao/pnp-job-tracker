-- 公司官方招聘页(2026-09-16 Frank「公司的 ATS 链接要不要列出来」→ 效果图点头「可以,就这样做」)
-- 来源 = ats 域招聘页发现清单 data/raw/ats/national-careers.json:只收探测回 200、且不与官网同址的,
-- 首批 5,960 家(全部按 slug 对上库内公司,约占 companies 一成)。公司页 / 公司弹框「基本信息」官网下出「招聘页」一行,没有就不出。
-- 幂等、可空、只加不改:老代码不读这一列,先跑它再换版(新代码 companyDetail 会 SELECT 它,列不存在公司页与公司弹框 500;
-- seed 的 COLS_COMPANIES 也会写它)。
ALTER TABLE companies ADD COLUMN IF NOT EXISTS careers_url varchar;
