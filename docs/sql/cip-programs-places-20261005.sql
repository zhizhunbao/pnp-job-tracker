-- cip_programs 加两列(2026-10-05 访客四题第 2 题照掌上高考做:左栏大类 → 可展开的专业类 → 专业;Frank「参考掌上高考啊」「可以,做吧」)。
-- 设计与效果图:docs/design/访客四题-专业题调研-20261004.md「效果图:掌上高考版」一节。
-- 惯例(db-push-minefield):加列一律手写 SQL 先行,别让 DB_PUSH 猜;只新增、不改旧数据;全部 IF NOT EXISTS,重跑无害。
--
-- ① title_en_short:英文显示名。热门 16 条与全部专业类手写短名,其余专业按规则清洗(去 , general、去 /technician 这类
--    角色后缀、去学位括注、斜杠改 and)。官方长标题照旧在 title_en(搜索照旧拿它比)。空串 = 照用 title_en。
-- ② places:这个专业在选择器里挂在哪,jsonb 数组(一个专业可挂两个大类,各自落一个专业类):
--    [{ "cat": "fin", "catOrder": 2, "catEn": "Finance", "catZh": "财会金融", "catKo": "재무금융",
--       "group": "52.03", "groupEn": "Accounting", "groupZh": "会计类", "groupKo": "회계",
--       "groupOrder": 1, "order": 1, "single": false }]
--    排序数(catOrder / groupOrder / order)与「这个专业类只装一个专业」(single)都在数据层 etl/statcan/cip 算好,接口只按序号排。
--    不进选择器的(不计学分课 32–37、住院医师 60 / 61)是 [],搜索里照旧搜得到(沉底)。
--    title_zh 同轮换成清洗过的中文显示名(去「/技术员」这类直译尾巴、「X/Y」改「X与Y」),CIP 原译留在 processed 的 titleZhRaw。
-- 列型照 Payload 建列惯例(text → varchar、json → jsonb)。
--
-- 🔴 跑法(生产,顺序不能倒):
--   ① 跑本文件(只加列;现在就能跑 —— 线上旧代码不 SELECT 这两列,加了没影响)。
--      2026-10-05 ① 已在生产跑过(助手跑,Frank「可以,做吧」之后;information_schema 查过两列都在:places jsonb / title_en_short varchar)。
--   ② 本机 etl 重跑 cip_programs(python etl/statcan/main.py --only cip_programs)→ mart 汇装出新的 data/mart/cip_programs.json。
--   ③ 本机 dev(新代码)直连生产库灌 cip_programs(线上旧代码还不认 cip_programs 这张表、不会碰它)。
--   ④ cms 推上线、换版后:清 seed_state 里 cip_programs 那一行的哈希,再整套重传 mart + seed(加列窗口期防偷记哈希,
--      见 seed-hash-poisoning-on-column-add)。
--   ⑤ 抽查:SELECT count(*) FROM cip_programs WHERE jsonb_array_length(places) > 0;      -- 期望 1718(不计学分 / 住院医师以外)
--          SELECT code, title_en_short, places FROM cip_programs WHERE code = '52.0203';  -- 供应链:两处(商科 / 交通物流)
--          curl 'https://offer2pr.com/api/majors?cat=fin'                                   -- 会计类排第一

ALTER TABLE cip_programs ADD COLUMN IF NOT EXISTS title_en_short varchar;
ALTER TABLE cip_programs ADD COLUMN IF NOT EXISTS places jsonb;
