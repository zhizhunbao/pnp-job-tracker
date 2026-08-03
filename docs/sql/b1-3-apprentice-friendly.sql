-- B1-3 学徒岗标记(2026-08-03,木匠案例逼出的「谁肯要 0 经验」)。
--
-- jobs 加一列 apprentice_friendly:官方 Experience 短语「Will train / No experience (will train) /
-- Experience an asset」或标题含 apprentice/apprenti(05e_flag_apprentice 算,ETL 下沉,前端只读)。
-- False 的语义=「没被官方标为不要经验」,不是「要经验」(聚合帖没有结构化区,漏标只会少数不会错数)。
--
-- additive:只加列,不动既有数据。跑法(生产)——先跑这份 DDL,再部署代码,
-- 最后 DELETE FROM seed_state WHERE name = 'jobs' 再灌(顺序错了会因表级哈希一致而静默跳过)。

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS apprentice_friendly boolean DEFAULT false;
