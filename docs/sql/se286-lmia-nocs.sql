-- #286 公司弹框获批职业拆分(05_286 文档 4.4):companies 加 LMIA 雇主×NOC 拆分列
-- 来源=raw lmia-employers.json 每雇主 nocs 字典(近两年窗口,与 lmia_positions 同口径),09_build_mart 下沉。
-- 幂等;旧代码不 SELECT 此列,先跑 DDL 再部署零风险(#280 顺序铁律)。
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lmia_nocs jsonb;
COMMENT ON COLUMN companies.lmia_nocs IS 'LMIA 获批职业拆分 {NOC五位码: 岗位数}(近两年,ESDC 季度开放数据聚合;#286)';
