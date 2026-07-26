-- E6-09(2026-07-26):pnp_occupations 加 program 列 —— 同一张清单维度里区分「省提名(PNP)」与
-- 「AIP 背书(AIP)」两条路。NB 官方同一页发了两条通告、两套 NOC 清单,管的项目不同:
-- 省提名那套进 08_score 的资格判定,AIP 那套只作展示(前端在 AIP 那一行单独判)。
-- additive 幂等;schema 先行再 push(改 collection 字段必须先给生产补列,B4 教训)。
ALTER TABLE pnp_occupations ADD COLUMN IF NOT EXISTS program text DEFAULT 'PNP';
UPDATE pnp_occupations SET program = 'PNP' WHERE program IS NULL;
