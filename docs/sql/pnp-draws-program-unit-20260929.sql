-- pnp_draws 加 program / unit / invitations_below 三列(每轮抽选属于哪个项目、人数数的是什么、官方只写了上限时的上限)  2026-09-29
-- additive:只加三列,不动既有数据。惯例见 db-push-minefield:加列一律手写 SQL,别让 DB_PUSH 猜。
-- 2026-09-29 Frank 看省提名弹框抽选卡「很多省都糊里糊涂的 感觉」「AIP 是不是应该单独的卡」,看过效果图后「按你建议」
-- (设计稿 docs/design/省提名抽选卡重排-20260929.md 第四节「DB pnp_draws 加一列(docs/sql 手写 DDL 先行)」);
-- 同日「如果改一个地方,是不是所有省份都得改一遍」:按省名写死的特判下沉成数据里的两格(program / unit)。
--
-- 为什么加:
--   program —— 本省抽选卡只列省提名,AIP 的轮次分去「AIP 抽选」卡;原先前端 / 汇装按省名判(NB 的 AIP 组、NL 批次里的 AIP 份数)。
--              取值 PNP / AIP / PNP+AIP(NS 省提名与 AIP 同池、只发合计)/ PSTQ(QC)/ EE(联邦);认不出空串。
--   unit    —— 人数数的是什么:invitation(发出的邀请)/ selection(NS 从 EOI 池选中的人)/ application(NB 的 AIP 组:选中进入
--              审理的申请);原先前端按省名(NS)与组名(AIP)判「份邀请 / 人入选 / 份申请入选」。
--   invitations_below —— AB「Less than 10」、BC「<5」这种只写上限的人数格:invitations 照旧 NULL,这里记上限(前端写「少于 N」;
--              全年合计按 0 计、出「至少」)。确数行为 NULL。
--
-- 取值:etl/pnp 落盘门逐行判好(mark_draw_programs / below_of),mart 原样带进 pnp_draws → seed 灌这三列(lib/mart COLS_PNP_DRAWS)。
--
-- 跑法(生产):① 跑本文件 → ② 部署带 collection / seed 列清单 / 前端改动的代码
--   → ③ DELETE FROM seed_state WHERE name = 'pnp_draws';(加列窗口期旧代码可能偷记新哈希,换版之后再清)
--   → ④ mart 汇装 pnp_draws → 上传 → 跑 seed(带 token)→ ⑤ 抽查:
--   SELECT province, program, unit, count(*), sum(invitations), count(invitations_below) FROM pnp_draws
--     WHERE draw_date >= '2026-01-01' GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;

ALTER TABLE pnp_draws ADD COLUMN IF NOT EXISTS program varchar;
ALTER TABLE pnp_draws ADD COLUMN IF NOT EXISTS unit varchar;
ALTER TABLE pnp_draws ADD COLUMN IF NOT EXISTS invitations_below numeric;
