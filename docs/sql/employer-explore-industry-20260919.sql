-- 两处加列(2026-09-19 Frank「授权加列,指定雇主格写明所在地,然后推」)。纯加列,幂等,不动既有数据。
-- ① 探索队列加「公司大类」:后台工人翻译名时顺带让本地模型判「这是一家什么公司」(本站大类键之一,判不出留空)。
--    雇主板「大分类」列与「全部大类」筛选优先用它,没有才退回「在招岗最多的大类」—— 后者对大公司常不准
--    (BMO / Deloitte / KPMG 落「管理层」、Manulife 落「IT」:大公司招得最多的是经理岗和 IT 岗)。
ALTER TABLE employer_explore ADD COLUMN IF NOT EXISTS industry varchar;
-- ② 雇主池加「指定资格所在地」:jsonb 数组 [{program, place}],place = AIP 的省码 / RCIP·FCIP 的社区(「Sudbury, ON」)。
--    雇主板「指定雇主」格据此写明资格在哪 —— 只写「AIP、RCIP」旁边又是 Toronto,会让人以为多伦多的岗也能走(Englobe 实拍)。
ALTER TABLE employer_pool ADD COLUMN IF NOT EXISTS designated_places jsonb;
-- 已翻过、但还没判过大类的存量条目退回待办,让工人补判一遍(译名同时重翻,免费):
UPDATE employer_explore SET status = 'pending' WHERE status = 'done' AND industry IS NULL;
