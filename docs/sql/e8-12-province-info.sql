-- E8-12 地点弹框(省情报面板):provinces 加 info jsonb 列(IRCC 体量数据,mart 挂列 seed 灌)。
-- 幂等;加列级、可空、不动现有数据。生产库=Render Postgres(E7-04 迁移,无网页 SQL 台):
-- 本机 psql 连 cms/.env 外网串跑一次,或授权助手本机执行。
-- ⚠️ 顺序:先跑本文件 → 再 seed(provinces 白名单已含 info)→ 再部署前端。
--    列不存在时新代码的 payload.find(provinces) 会 500,schema 必须先行。
ALTER TABLE provinces ADD COLUMN IF NOT EXISTS info jsonb;
