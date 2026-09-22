-- 总部是母公司的标记(2026-09-22 Frank「总部是美国不需要显示吗」→「显,但注明是母公司」)
-- 来源 = company 域维基总部兜底:备选名(去国名 / 去 The)命中的实体总部在加拿大以外时置真
-- (The Home Depot Canada 命中美国母公司 Q864407 → Cobb County, Georgia;KPMG Canada → 荷兰同理)。
-- 公司卡「总部」行与雇主板「总部」列照显总部值,带此标记的加灰注「母公司」—— 信息不丢,也不把母公司总部当这家自己的误导。
-- 幂等、只加不改:老代码不读这列,先跑它再换版;类型照 Payload checkbox(boolean DEFAULT false),DB_PUSH 时不会提示改列。
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hq_parent boolean DEFAULT false;
