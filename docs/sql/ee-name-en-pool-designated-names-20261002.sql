-- 两列(2026-10-02 Frank「可以」):
-- ① ee_categories.name_en:EE 类别官方英文名(「Healthcare and social services occupations」这类)。职位页移民相关卡按新规矩
--    「英文黑字,中文灰字」(Frank「以后所有都这么弄」)要官方原名做主文案;原先库里只有中文标签,英文是站内短名词条。
--    来源 = canada.ca category-based-selection 页每张职业表上方的标题「Who's eligible for the … category」中间那段(etl/ee 抽)。
-- ② employer_pool.designated_names:这一雇主吃进了哪几个指定雇主名(jsonb 字符串数组,原名逐字)。AIP 弹框指定雇主名单
--    (Frank「这个也要加灰字 和 点击吧」)要按名单行找回雇主池那一行(取译名、开公司弹框);名单行 → 雇主池键的归一挂靠只在
--    etl/employers 算(它在汇装之后跑),所以记在雇主池这边,SQL 用 `?` 按名字接回。GIN 索引:名单一页 20 行逐行查,缺索引每行扫全表。
-- 纯加列加索引,幂等,不动既有数据。顺序:① 跑本文件 ② 推 cms 代码并确认换版 ③ 删 seed_state 两表哈希
--   ④ etl/ee 重抽类别 → 汇装单表 ee_categories;etl/employers 重建雇主池 → --only upload → curl seed。
--   换版到重灌之间两列为空:卡上 EE 退回站内英文名,名单行不出灰字、不可点,不会报错。
ALTER TABLE ee_categories ADD COLUMN IF NOT EXISTS name_en varchar;
ALTER TABLE employer_pool ADD COLUMN IF NOT EXISTS designated_names jsonb;
CREATE INDEX IF NOT EXISTS employer_pool_designated_names_idx
  ON employer_pool USING gin (designated_names);
