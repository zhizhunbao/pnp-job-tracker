-- E8-14 ① · 每日快照表 stats_daily(趋势图的唯一数据来源)
-- DDL 先行:生产先跑这段,再 push 带 collection 的代码(惯例见 db-push-minefield)。
--
-- 为什么先于主图建:**历史补不回来**。库里只存「当下在招」,今天不落表,今天这个点就永远没有了。
-- 粒度 = 日 × 省 × 大类(broad='all' 为该省汇总行),由 etl/11_build_stats.py 从 stats 大类层直接投影,
-- 口径与统计主表天生一致,不重算。

CREATE TABLE IF NOT EXISTS stats_daily (
  id                    serial PRIMARY KEY,
  date                  varchar NOT NULL,      -- YYYY-MM-DD(ETL 跑的那天)
  province              varchar NOT NULL,
  broad                 varchar NOT NULL,      -- 职业大类;'all' = 该省汇总
  open_jobs             integer,
  new7d                 integer,
  median_salary_annual  integer,
  named_jobs            integer,
  updated_at            timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now()
);

-- ⚠️ 这张表**不走 dims 的「清空 + 重灌」**(那会把历史抹掉)。seed 按下面这个唯一键 UPSERT:
-- 同一天多跑几轮 ETL 只更新今天这批行,不会灌出重复点;往前的日期一律不动。
CREATE UNIQUE INDEX IF NOT EXISTS stats_daily_key_idx ON stats_daily (date, province, broad);
CREATE INDEX IF NOT EXISTS stats_daily_date_idx ON stats_daily (date);

-- 新增 ETL 维度表必跟这一步(2026-07-27 实撞):Payload 的 payload_locked_documents_rels
-- 每个 collection 一列,少了它 seed 里的 DELETE 直接 42703 报错、整事务回滚(表现为 /seed 500 无 body)。
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS stats_daily_id integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_stats_daily_fk') THEN
    ALTER TABLE payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_stats_daily_fk
      FOREIGN KEY (stats_daily_id) REFERENCES stats_daily(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_stats_daily_id_idx
  ON payload_locked_documents_rels (stats_daily_id);
