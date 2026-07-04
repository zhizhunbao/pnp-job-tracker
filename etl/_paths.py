"""Single source of truth for the data/ layout.

When reorganizing data/, edit ONLY this file — every ETL script imports paths from
here, so directory moves never require touching the scripts.

Layout — 统一约定 **raw/<源>/[<日期>/]内容**(抓取「方式」记在 etl/sources.py 的 method=,不进路径):
  data/
    raw/                                    # extract: 原始抓取(只存原始 HTML/文件,不解析)
      jobbank/<日期>/                       #   Job Bank 列表快照 <省>-pNN.html · <日期>/details/<id>.html
      oinp/<日期>/ · aaip/<日期>/           #   各省 PNP 政策页原始 HTML(crawl)
      ats/<slug>/                           #   ATS 公司名录(扁平,单区;roster json 也在此)
      pnp/ · aip/ · wages/ · fsa/ · policy/ #   各维护表/源自成顶层源(维护表跟踪 + 源文件 gitignore)
    processed/                              # transform: 清洗/组织后(累积去重的当前态,不按日期)
      jobbank/  postings.json + details/<slug>.md
      ats/<slug>/                           #   按公司组织 (profile/careers/jobs + 详情.md)
      all-scored.json                       #   08→09 评分中间产物(跨两源,keyed by externalId)
    mart/                                   # load: 列对齐 DB 的最终表(09 产出,seed 灌库)
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # etl/_paths.py → project root
DATA = ROOT / "data"

RAW = DATA / "raw"                                      # extract
RAW_ATS = RAW / "ats"                                   # ATS 公司名录根(扁平:<slug>/ 直接挂;roster json 也在此)
RAW_COMPANIES = RAW_ATS                                 # 01/03 写名录 json、公司文件夹的根(= raw/ats)
RAW_JOBBANK = RAW / "jobbank"                           # Job Bank 原始 HTML 快照:<日期>/ · <日期>/details/
# 维护表/源各自成顶层源(删掉 reference 桶):pnp/aip/wages/fsa/policy 直接挂 raw 下,各自维护表+源同处
PNP = RAW / "pnp"                                       # 各省 PNP 维护表(oinp-in-demand/aaip-ineligible.json)
EE = RAW / "ee"                                         # 联邦 Express Entry 类别抽选清单(federal-categories.json,全国单一源)
NOC = RAW / "noc"                                      # NOC 2021 官方职业名+主要职责(StatCan Elements 开放 CSV)
AIP = RAW / "aip"                                       # AIP 指定雇主名单(aip-designated-employers.json/.md)
WAGES = RAW / "wages"                                   # ESDC 工资:wages.json(维护表)+ wage*.csv(源)
FSA = RAW / "fsa"                                       # GeoNames 邮编→区:fsa-districts.json(维护表)+ CA.txt(源)
POLICY = RAW / "policy"                                 # 各省移民政策原文(.md)

PROCESSED = DATA / "processed"                          # transform
PROCESSED_ATS = PROCESSED / "ats"                       # ATS 清洗后根(扁平:<slug>/ 直接挂)
COMPANIES = PROCESSED_ATS                               # 各公司文件夹的根(= processed/ats)
PROCESSED_JOBBANK = PROCESSED / "jobbank"               # Job Bank 累积/去重/清洗后的 store(当前态,不按日期)

MART = DATA / "mart"                                    # load: 09 产出的最终表(seed 灌库;R3 下 upload_mart 上传)

