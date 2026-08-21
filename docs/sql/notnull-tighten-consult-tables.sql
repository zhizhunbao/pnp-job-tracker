-- 六张 consult 消费表:审计确认「从不空」的列上 NOT NULL  2026-08-21
-- 设计:docs/implementation/默认值架构-20260821.md(Frank 拍板「这些都应该在上层处理好」)。
-- 只加约束,不动数据,不动类型 —— 2026-08-21 生产库逐列审计,以下每一列现有行 0 空值,
-- SET NOT NULL 全部当场可过。**人工审后手动跑生产。**
--
-- 为什么:TS 侧 ~122 处 `String(x ?? '')` 全是在替 schema 还债 —— ETL 早把这些列写实了,
-- 只是库没承诺,下游不敢信。约束上去之后:
--   ① 行形状(XxxDbRow)这些列改非空声明,成批 text() 包装删除(默认值架构批②);
--   ② 将来哪轮抓取真产出 null,seed 当场报错 —— 「出错不静默」,不再悄悄流到用户面前。
--
-- 🔴 故意**不动**的列(空即语义,官方没公布,折成默认值 = 替官方编数):
--   pnp_draws:        score(53 空)/ scale(40)/ invitations(3)/ stream_zh(59,翻译补齐前为空)
--   pnp_ops_stats:    value(12 —— 隐私抑制值「Less than 10」与纯文本游标)
--   pnp_requirements: value(41 —— rule 行没有阈值)/ applies_family_size(286 —— 只有收入表用)
--   ee_categories:    draw_crs / draw_date / draw_size(各 2 —— 该类别本站无抽选记录)
--   ee_points_grid:   points(22 —— 官方写 n/a / Not eligible)
--
-- 跑法(生产):psql 整个文件一次跑;全部秒级(最大表 630 行)。回退:对应列 DROP NOT NULL。

BEGIN;

-- pnp_draws(145 行)
ALTER TABLE pnp_draws
  ALTER COLUMN province  SET NOT NULL,
  ALTER COLUMN kind      SET NOT NULL,
  ALTER COLUMN draw_date SET NOT NULL,
  ALTER COLUMN stream    SET NOT NULL,
  ALTER COLUMN note      SET NOT NULL,
  ALTER COLUMN label     SET NOT NULL,
  ALTER COLUMN url       SET NOT NULL,
  ALTER COLUMN fetched   SET NOT NULL;

-- pnp_ops_stats(131 行)
ALTER TABLE pnp_ops_stats
  ALTER COLUMN province   SET NOT NULL,
  ALTER COLUMN program    SET NOT NULL,
  ALTER COLUMN metric     SET NOT NULL,
  ALTER COLUMN scope      SET NOT NULL,
  ALTER COLUMN scope_kind SET NOT NULL,
  ALTER COLUMN label      SET NOT NULL,
  ALTER COLUMN value_text SET NOT NULL,
  ALTER COLUMN unit       SET NOT NULL,
  ALTER COLUMN as_of      SET NOT NULL,
  ALTER COLUMN period     SET NOT NULL,
  ALTER COLUMN url        SET NOT NULL,
  ALTER COLUMN fetched    SET NOT NULL,
  ALTER COLUMN section    SET NOT NULL,
  ALTER COLUMN seq        SET NOT NULL,
  ALTER COLUMN stream_key SET NOT NULL;

-- pnp_requirements(307 行)
ALTER TABLE pnp_requirements
  ALTER COLUMN province          SET NOT NULL,
  ALTER COLUMN program           SET NOT NULL,
  ALTER COLUMN stream            SET NOT NULL,
  ALTER COLUMN subject           SET NOT NULL,
  ALTER COLUMN factor            SET NOT NULL,
  ALTER COLUMN op                SET NOT NULL,
  ALTER COLUMN value_text        SET NOT NULL,
  ALTER COLUMN unit              SET NOT NULL,
  ALTER COLUMN applies_teer      SET NOT NULL,
  ALTER COLUMN applies_area      SET NOT NULL,
  ALTER COLUMN applies_noc       SET NOT NULL,
  ALTER COLUMN excludes_noc      SET NOT NULL,
  ALTER COLUMN applies_condition SET NOT NULL,
  ALTER COLUMN basis             SET NOT NULL,
  ALTER COLUMN label             SET NOT NULL,
  ALTER COLUMN section           SET NOT NULL,
  ALTER COLUMN seq               SET NOT NULL,
  ALTER COLUMN effective         SET NOT NULL,
  ALTER COLUMN url               SET NOT NULL,
  ALTER COLUMN page_url          SET NOT NULL,
  ALTER COLUMN fetched           SET NOT NULL;

-- ee_categories(94 行)
ALTER TABLE ee_categories
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN label    SET NOT NULL,
  ALTER COLUMN noc      SET NOT NULL,
  ALTER COLUMN teer     SET NOT NULL,
  ALTER COLUMN title    SET NOT NULL,
  ALTER COLUMN url      SET NOT NULL,
  ALTER COLUMN fetched  SET NOT NULL;

-- ee_points_grid(380 行)
ALTER TABLE ee_points_grid
  ALTER COLUMN grid          SET NOT NULL,
  ALTER COLUMN section       SET NOT NULL,
  ALTER COLUMN section_label SET NOT NULL,
  ALTER COLUMN kind          SET NOT NULL,
  ALTER COLUMN table_no      SET NOT NULL,
  ALTER COLUMN heading       SET NOT NULL,
  ALTER COLUMN factor        SET NOT NULL,
  ALTER COLUMN criterion     SET NOT NULL,
  ALTER COLUMN column_label  SET NOT NULL,
  ALTER COLUMN points_text   SET NOT NULL,
  ALTER COLUMN seq           SET NOT NULL,
  ALTER COLUMN url           SET NOT NULL,
  ALTER COLUMN fetched       SET NOT NULL;

-- pnp_occupations(630 行,唯一一张一列空值都没有的表)
ALTER TABLE pnp_occupations
  ALTER COLUMN province       SET NOT NULL,
  ALTER COLUMN stream         SET NOT NULL,
  ALTER COLUMN label          SET NOT NULL,
  ALTER COLUMN type           SET NOT NULL,
  ALTER COLUMN noc            SET NOT NULL,
  ALTER COLUMN name           SET NOT NULL,
  ALTER COLUMN gta_restricted SET NOT NULL,
  ALTER COLUMN url            SET NOT NULL,
  ALTER COLUMN fetched        SET NOT NULL,
  ALTER COLUMN program        SET NOT NULL,
  ALTER COLUMN applies_to     SET NOT NULL;

COMMIT;

-- 验收:每张表随便挑两列 \d 看约束;或
--   SELECT table_name, column_name, is_nullable FROM information_schema.columns
--    WHERE table_name IN ('pnp_draws','pnp_ops_stats','pnp_requirements',
--                         'ee_categories','ee_points_grid','pnp_occupations')
--      AND is_nullable = 'YES' ORDER BY table_name, column_name;
-- 期望:只剩上面「故意不动」名单里的列。