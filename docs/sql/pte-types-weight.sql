-- pte_types 加占分权重列  2026-09-03(批三.5:题型菜单四栏 19 型全列)
-- additive、幂等;Frank「人家这都带个分类」→ 维度表扩到 19 行,菜单按 section 四栏,没题的型灰字「整理中」。
-- weight = 该型占总分百分比(猩际 practice 页「占分权重 总分」;<1% 记 0.5),菜单里灰注。
ALTER TABLE pte_types ADD COLUMN IF NOT EXISTS weight numeric;
