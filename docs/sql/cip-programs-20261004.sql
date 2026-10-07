-- CIP 2021 专业表 cip_programs(2026-10-04 访客四题第 2 题「读的什么专业」:十几个热门专业胶囊 + 搜索全部 CIP 2021 专业,
-- 单选存 class 码;第 3 题按专业对应的本站职业大类列在招最多的职业;注册后职位板按答案筛)。
-- 惯例(db-push-minefield):建表一律手写 SQL 先行,别让 DB_PUSH 猜;**只写文件不执行,Frank 审后手动跑生产**。
-- 只新建、不改任何旧表的数据;全部 IF NOT EXISTS,重跑无害。
--
-- 数据来源:StatCan CIP Canada 2021 v1.0 结构表(https://www.statcan.gc.ca/en/media/4226,primary groupings 变体 CSV)
--   → etl/statcan/cip 子域:cip2021 步抽 2,119 个 class → raw/statcan/cip2021.json
--   → cip_i18n 步本地 qwen 译中韩名 → processed/statcan/cip_i18n.json
--   → cip_programs 步配上 noc 的专业 → 大类对照(MAJOR_SERIES_BROADS)与热门名次(CIP_POPULAR)→ processed/statcan/cip_programs.json
-- 一行 = 一个 class:code / title_en / title_zh / title_ko / series / grouping / broads / popular。
-- 列型照 Payload 建列惯例(text → varchar、json → jsonb、number → numeric),DB_PUSH 时不会提示改列。
-- 非空只设在 code 上:本表每轮随 seed 整表重灌,一行缺格让整轮 seed 回滚 = 职位停更;必填格由 etl 自校在源头挡。
--
-- 🔴 跑法(生产,顺序不能倒):
--   ① 跑本文件(建表 + payload_locked_documents_rels 补列;全是 IF NOT EXISTS、只新增,现在就能跑)。
--   ② 再在 cms/src/payload.config.ts 注册 CipPrograms(import 一行 + collections 数组 QcNocStreams 之后加一项),随后部署。
--      本批故意没注册(2026-10-04 收口):注册了的代码先于 ① 上线(并行会话连带提交推送,或本机 dev 直连生产),
--      Payload 查锁文档表时多认一列 cip_programs_id,库里没有 → 42703,所有 collection 的 update / delete 都炸。
--      ①② 之间别跑 DB_PUSH:库里有表、配置里没有,drizzle 会提议删 cip_programs 表与 cip_programs_id 列(必答 N)。
--      seed 端无所谓先后(表没建 → 按 tableExists 跳过,mart 没这个文件 → 按「未上传」跳过;lib/mart 装载规格已在)。
--      2026-10-04 收口:① 已在生产跑过,② 已注册(payload.config.ts collections 数组 QcNocStreams 之后)——
--      上面「本批故意没注册」是注册前的状态。
--   ③ 接汇装(本批故意没接:data/mart/*.json 每小时被 build 役整目录上传 + seed,DDL 没跑之前不许进生产):
--      etl/mart 加一件 build_cip_programs()(原样读 processed/statcan/cip_programs.json 的行清单 —— 路径经 paths.PROCESSED_STATCAN;
--      文件不在给 [] 并留痕,seed 侧 -1 跳过保留旧行),to_mart_tables() 返回的 dict 加一项 "cip_programs": build_cip_programs()
--      → build 下一轮汇装出 data/mart/cip_programs.json 并上传,seed 按表哈希灌进来。
--      cip_programs.json 本身是手动件(python etl/statcan/main.py --only cip_programs):改了 noc 的 MAJOR_SERIES_BROADS、
--      CIP_POPULAR / CIP_NAME_FIX 或重译之后要重跑这一步,汇装才看得到。
--      2026-10-04 收口:③ 已接(data/mart/cip_programs.json 每轮产出)。更正上面两处:
--      (a)「文件不在给 [] 并留痕,seed 侧 -1 跳过保留旧行」不成立 —— [] 照样落盘上传,seed 把上传的 [] 当「真清空」
--         抹掉生产表;现改为源文件不在时这张表整张不进汇装字典(data/mart 里上一轮的文件原样留着照旧上传,
--         seed 见哈希没变跳过),留痕带 ✗ 升 ERROR;不 raise(那会停掉整轮 mart)。
--      (b)路径不经 paths 桶:mart 改 `from paths.constants import PROCESSED_STATCAN` 直取(进桶让常驻容器重扫 META 时
--         ImportError,同日 14:23 实撞)。build_cip_programs 现在收汇装字典、源文件在才放进 "cip_programs" 一项。
--   ④ 抽查:SELECT count(*) FROM cip_programs;                                                -- 期望 2119
--          SELECT code, title_en, broads FROM cip_programs WHERE code = '52.0203';            -- Logistics, materials, and supply chain management
--          SELECT count(*) FROM cip_programs WHERE popular IS NOT NULL;                        -- 期望 16
--          curl 'https://offer2pr.com/api/majors?top=1'                                        -- 16 条,按名次

CREATE TABLE IF NOT EXISTS cip_programs (
  id          serial PRIMARY KEY,
  code        varchar NOT NULL UNIQUE,      -- CIP 2021 class 码(52.0203)
  title_en    varchar,                      -- 官方英文类名
  title_zh    varchar,                      -- 中文名(本地模型译;NULL = 没译成)
  title_ko    varchar,                      -- 韩文名(同上)
  series      varchar,                      -- 两位 series 码(52)
  grouping    varchar,                      -- 两位 primary grouping 码(05);GROUPING 是 col_name_keyword,作列名合法(2026-10-04 生产只读实测)
  broads      jsonb,                        -- 本站职业大类清单(["商务","财会金融",…])
  popular     numeric,                      -- 热门名次(1 起);NULL = 不在热门清单
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cip_programs_series_idx ON cip_programs (series);
CREATE INDEX IF NOT EXISTS cip_programs_updated_at_idx ON cip_programs (updated_at);
CREATE INDEX IF NOT EXISTS cip_programs_created_at_idx ON cip_programs (created_at);

-- 新维度表六步之关键一步:Payload 的 payload_locked_documents_rels 表每个 collection 一列,
-- 少了它,seed 里的 `DELETE FROM payload_locked_documents_rels WHERE cip_programs_id IS NOT NULL` 直接 42703,
-- 整个 seed 事务回滚(表现为 /seed 返回 500、无 body;2026-07-27 实撞)。
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS cip_programs_id integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_cip_programs_fk') THEN
    ALTER TABLE payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_cip_programs_fk
      FOREIGN KEY (cip_programs_id) REFERENCES cip_programs(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_cip_programs_id_idx
  ON payload_locked_documents_rels (cip_programs_id);
