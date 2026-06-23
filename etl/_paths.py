"""Single source of truth for the data/ layout.

When reorganizing data/, edit ONLY this file — every ETL script imports paths from
here, so directory moves never require touching the scripts.

Layout (按 ETL 阶段分层;raw 与 processed 都按「省/市/区」一一对应,省份用全称):
  data/
    raw/                                    # extract: 原始抓取
      <province>/                           #   省(全称,如 ontario)
        <city>/                             #     城市(如 ottawa)
          jobbank/                          #       职位板原始(城市级,覆盖全市)
          <district>/                       #       园区/地区(如 kanata-north)
            companies/                      #         公司名录原始 (+ careers 聚合)
      reference/                            #   跨省共享参考(非某地专属)
        policy/<prov>-immigration/          #     各省移民政策原文
        designated-employers/               #     AIP 指定雇主名单
    processed/                              # transform: 清洗/组织后
      <province>/<city>/<district>/         #   与 raw 的省/市/区对应
        companies/<slug>/                   #     按公司组织 (profile/careers/jobs + 详情.md)
    output/                                 # load: 评分产出 (seed 入库用)
    registry/                               # meta: 源登记 (valuable-urls.md)
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # etl/_paths.py → project root
DATA = ROOT / "data"

PROVINCE = "ontario"                                    # 省(全称)
CITY = "ottawa"                                         # 城市
DISTRICT = "kanata-north"                               # 园区/地区

RAW = DATA / "raw"                                      # extract
# 按来源分顶层:raw/ats/(ATS 公司目录) · raw/jobbank/(Job Bank 全国)
RAW_ATS = RAW / "ats"                                   # ATS 来源根
RAW_CITY = RAW_ATS / PROVINCE / CITY                    # raw/ats/ontario/ottawa
JOBBANK = RAW / "jobbank"                               # 全国(各省分目录 + 扁平 postings.json 工作文件)
RAW_DISTRICT = RAW_CITY / DISTRICT                      # raw/ats/ontario/ottawa/kanata-north
RAW_COMPANIES = RAW_DISTRICT / "companies"              # 公司名录原始(与 processed 的 companies 对应)
REFERENCE = RAW / "reference"                           # 跨省共享(非某地专属)
POLICY = REFERENCE / "policy"
DESIGNATED = REFERENCE / "designated-employers"

PROCESSED = DATA / "processed"                          # transform
PROCESSED_ATS = PROCESSED / "ats"                       # ATS 来源根(与 raw/ats 对称)
COMPANIES = PROCESSED_ATS / PROVINCE / CITY / DISTRICT / "companies"  # processed/ats/ontario/ottawa/kanata-north/companies

OUTPUT = DATA / "output"                                # load
REGISTRY = DATA / "registry"                            # meta
