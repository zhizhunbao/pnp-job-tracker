-- 雇主池:在招地点存全量 + 加「在招省码」列,省 / 市筛选按在招地点匹配(2026-09-20 Frank「那你如果隐藏了 如果用户按城市搜索,
-- 你不就收不到了吗」「在招城市,必须显示才能 搜索吧。那么就加个收起展开不就行了吗」「做」)。
-- 原先 locations 只存在招岗最多的前三处、筛选只比主省 / 主市(在招岗最多的那一处):Sienna 在 Ottawa / Kingston 有岗,筛这两个市搜不到它;
-- Home Depot 主省 ON,筛 Alberta 搜不到它。现在:
--   locations  = 全部在招地点「市, 省码」(jsonb 字符串数组,岗多的在前;列早已在,只是值变全) → 市筛选 p.locations ? ('市, 省码')
--   loc_provs  = 全部在招省码(jsonb 字符串数组,岗多的在前;无在招雇主取主省)                 → 省筛选 p.loc_provs ? '省码'
-- 两个都是热筛选列,各建 GIN 索引(规矩:上新筛选参数必查索引,缺索引打爆连接池 = 生产 500)。尺子 = etl/employers locations_of / loc_provs_of。
-- 纯加列加索引,幂等,不动既有数据。顺序:① 跑本文件 ② 推 cms 代码并确认换版 ③ 删 seed_state 的 employer_pool 表哈希
--   ④ 重建雇主池 → --only upload → curl seed。换版到重灌之间 loc_provs 为空,筛选式里留着「或主省 / 主市相等」兜底,不会筛空。
ALTER TABLE employer_pool ADD COLUMN IF NOT EXISTS loc_provs jsonb;
CREATE INDEX IF NOT EXISTS employer_pool_loc_provs_idx
  ON employer_pool USING gin (loc_provs);
CREATE INDEX IF NOT EXISTS employer_pool_locations_idx
  ON employer_pool USING gin (locations);
