-- 雇主省提名门槛判定 B3 · companies 加雇主事实五列(2026-08-08)
-- 设计:docs/design/雇主省提名门槛判定-20260808.md §2/§3 B3。
-- 只加列,additive,不动任何既有列/数据。**跑序:① 先在生产跑本文件(DDL)→ ② push 代码(若有)→
-- ③ 换版确认后,再跑 _apply_employer_facts.py 生成的回写 SQL 灌数据**。惯例见 db-push-minefield:
-- dev 默认不推 schema,加列/删列一律手写 SQL,别让 DB_PUSH 猜。
--
-- ── 五列语义(设计 §2 表)──────────────────────────────────────────────
--   founded_year     成立年份。**2026-08-09 更正**:两条注册库路都不是成立日 ——
--                     联邦 CSV「Anniversary date」= 年检周年日、OrgBook BC `registration_date` = 该条
--                     登记记录生效日(amalgamation/续存都会刷新;实测 Englobe Corp 落 2026,荒谬值),
--                     均已从写入逻辑里删除。**现阶段唯一来源 = AI 懒查([FOUNDED] 节,src=ai,估算)**。
--                     真硬数据源在 Corporations Canada 官方 API(activities[].activity="Incorporation"),
--                     但该接口需注册账号拿 `user-key`(已实测无 key 403),开账号超出 ETL agent 权限,
--                     待 Frank 亲自开通后再接——接通前 registry 路永远不写 founded_year,查不到就是查不到。
--   registry_status   在册状态(active 等),仅 registry 路有(federal CSV / OrgBook BC 严格名匹配命中)。
--   founded_src        'ai'(现阶段唯一取值)—— 成立年份的证据等级标注,留列位给将来接上官方 API 后的 'registry'。
--   staff_est          雇员数估算(整数,区间/约数记法统一取「区间起点或约数」)。**恒为估算**,
--                       现阶段无免费官方雇员数源(联邦注册库不含雇员数),AI 懒查 [SIZE] 节是唯一来源。
--   staff_est_src       AI 原文短句(≤120 字符),UI 层挂在「估算」标签的 tooltip/展开,不是让前端裸display当事实。
--   sector              'public' = 公共部门(卫生局/市政/学区…PUB 正则命中)。省雇主侧门槛(经营年限/雇员数/
--                       营业额)主要针对私企 —— sector='public' 的行不参与 B4 三态判定,UI 直显「公共部门」。
--
-- ── 白名单归属:白名单外 + SQL 回写(照 alias_zh 同款,见 docs/sql/employer-d.sql)──────────
-- cms/src/app/seed/route.ts 的 companyCols/companyPlain 是 seed upsert 的固定列白名单(硬编码列表,
-- 逐条列名);founded_year/registry_status/founded_src/staff_est/staff_est_src/sector 都不在这张表里,
-- 所以 seed 的 INSERT ... ON CONFLICT DO UPDATE 天然碰不到这五列 —— 不需要额外把它们摘出白名单,
-- 增量对账（重跑 seed/换版）不会覆盖或清空这几列,与 alias_zh/alias_ko/wiki_url/industry(employer-d.sql
-- 同款白名单外列)完全同一惯例。回写走独立 UPDATE(只填空 WHERE 列 IS NULL,不覆盖已有值),
-- 靠 etl/clean/_apply_employer_facts.py 从 data/processed/employer_facts.json 生成,人工核对后手跑。

ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year integer;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS registry_status varchar;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_src varchar;      -- 'registry' | 'ai'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS staff_est integer;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS staff_est_src varchar;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sector varchar;           -- 'public'(私企不打标,NULL=默认私企)
