"""Single source of truth for the data/ layout.

When reorganizing data/, edit ONLY this file — every ETL script imports paths from
here, so directory moves never require touching the scripts.

Layout — 统一约定 **raw/<源>/[<日期>/]内容**(抓取「方式」记在 etl/sources.py 的 method=,不进路径):
  data/
    raw/                                    # extract: 原始抓取(只存原始 HTML/文件,不解析)
      jobbank/<日期>/                       #   Job Bank 列表快照 <省>-pNN.html · <日期>/details/<id>.html
      oinp/<日期>/ · aaip/<日期>/           #   各省 PNP 政策页原始 HTML(crawl)
      ats/<slug>/                           #   ATS 公司名录(扁平,单区;roster json 也在此)
      reference/                            #   跨省共享维护表(非快照,不按日期):wages/fsa/aip/pnp/policy
    processed/                              # transform: 清洗/组织后(累积去重的当前态,不按日期)
      jobbank/  postings.json + details/<slug>.md
      ats/<slug>/                           #   按公司组织 (profile/careers/jobs + 详情.md)
    output/                                 # load: 评分产出 (seed 入库用)
    registry/                               # meta: 源登记 (valuable-urls.md)
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # etl/_paths.py → project root
DATA = ROOT / "data"

RAW = DATA / "raw"                                      # extract
RAW_ATS = RAW / "ats"                                   # ATS 公司名录根(扁平:<slug>/ 直接挂;roster json 也在此)
RAW_COMPANIES = RAW_ATS                                 # 01/03 写名录 json、公司文件夹的根(= raw/ats)
RAW_JOBBANK = RAW / "jobbank"                           # Job Bank 原始 HTML 快照:<日期>/ · <日期>/details/
REFERENCE = RAW / "reference"                           # 跨省共享维护表(非快照,不按日期)
POLICY = REFERENCE / "policy"
DESIGNATED = REFERENCE / "designated-employers"

PROCESSED = DATA / "processed"                          # transform
PROCESSED_ATS = PROCESSED / "ats"                       # ATS 清洗后根(扁平:<slug>/ 直接挂)
COMPANIES = PROCESSED_ATS                               # 各公司文件夹的根(= processed/ats)
PROCESSED_JOBBANK = PROCESSED / "jobbank"               # Job Bank 累积/去重/清洗后的 store(当前态,不按日期)

OUTPUT = DATA / "output"                                # load
REGISTRY = DATA / "registry"                            # meta
