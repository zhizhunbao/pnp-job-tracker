-- E14-01 · StatCan JVWS 空缺岗位数(全市场数据三角第一块)
-- 目的:给「担保率 = 担保侧(LMIA/AIP/公司雇过外国人事实)÷ 全市场(本表)」当分母。
-- 数据来源:StatCan 表 14-10-0444-01「Job vacancies and average offered hourly wage by occupation
--   (unit group), quarterly, unadjusted for seasonality」(WDS getCubeMetadata 实查 2026-08-08,CURRENT)。
--   https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410044401
--   etl/build_jvws.py → data/raw/jvws/jvws-vacancies.json → etl/build_jvws_mart.py → data/mart/jvws_vacancies.json
--
-- ⚠️ 草稿,未执行。本轮(E14-01)只接数据到 mart,不接 seed —— 待 E14 后续批次(担保率页面/指标)
--   落地时再在生产先跑本文件,然后 seed 白名单加 dims[]、collection 加 JvwsVacancies,顺序照老规矩:
--   **先 DDL 后代码后 seed**(db-push-minefield memory)。
--
-- 🔴 红线(与 pnp_ops_stats 同一条):vacancies 官方抑制(StatCan quality='F'/'..'/'x')时**必须 NULL**,
--   不许折成 0 —— 折 0 = 替官方编了「这职业全国 0 空缺」这种假话,而实情是「样本太小没法发布」。
--   `available` 是消费端的判断结果(quality 是 A-E 且 vacancies 非空),不是官方字段,别当官方数字用。
--
-- 地理粒度:province 目前只到省/准州(NAT=全国口径,与 wages.json 同一约定)。StatCan 该表还有
--   69 个经济区级更细粒度(比省细,不到城市/CMA),E14 城市级职业榜若要接,加 economic_region 列
--   即可(同一张表加列,不需要新表)——本轮不加,YAGNI。
--
-- NOC 口径:noc = 2021 版五位单位群组码,与本项目 etl/noc.py 同版本(WDS footnote #9 quote-anchored:
--   "The occupational data are presented in this table according to the National Occupational
--   Classification (NOC) 2021 version 1.0."),**无需映射**,可直接 = jobs.noc 做 join key。

CREATE TABLE IF NOT EXISTS jvws_vacancies (
  id           serial PRIMARY KEY,
  noc          varchar,        -- NOC 2021 五位码(与 jobs.noc 同版本,直接 join)
  province     varchar,        -- AB/BC/.../NAT(NAT=全国口径,与 wages.json 省级键同约定)
  quarter      varchar,        -- "2026Q1"
  ref_date     varchar,        -- StatCan 原始参考期 "2026-01"(该季度首月,官方原样)
  vacancies    integer,        -- 🔴 可空:官方抑制(quality=F/../x)一律 NULL,绝不写 0(见表头红线)
  quality      varchar,        -- StatCan 数据质量码:A-E 已发布(E 需谨慎)/F 太不可靠不发布/'..' 未采集/x 保密抑制
  available    boolean,        -- 派生:quality 在 A-E 且 vacancies 非空 → true(消费端快速判断可不可信)
  source_url   varchar,        -- https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410044401
  fetched      varchar,        -- ETL 抓取日(ISO)
  updated_at   timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS jvws_vacancies_noc_prov_qtr_idx
  ON jvws_vacancies (noc, province, quarter);   -- 幂等重灌的 upsert 键
CREATE INDEX IF NOT EXISTS jvws_vacancies_noc_idx ON jvws_vacancies (noc);

-- 新维度表必补(2026-07-27 实撞教训,New ETL dim table checklist):少了这段 seed 会 42703 报 500。
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS jvws_vacancies_id integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_jvws_vacancies_fk') THEN
    ALTER TABLE payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_jvws_vacancies_fk
      FOREIGN KEY (jvws_vacancies_id) REFERENCES jvws_vacancies(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_jvws_vacancies_id_idx
  ON payload_locked_documents_rels (jvws_vacancies_id);
