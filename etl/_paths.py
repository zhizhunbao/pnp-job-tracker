"""Single source of truth for the data/ layout.

When reorganizing data/, edit ONLY this file — every ETL script imports paths from
here, so directory moves never require touching the scripts.

Layout:
  data/
    companies/<region>/<slug>/     # 按公司组织 (profile/careers/jobs/linkedin/indeed)
    raw/                           # 原始抓取 (extract) — 大类→种类
      jobbank/                     #   职位板原始
      directories/                 #   公司目录原始 (+ careers 聚合)
      designated-employers/        #   AIP 指定雇主名单
    policy/<prov>-immigration/     # 参考: 移民政策原文
    output/                        # 评分产出 (load-ready): daily/ + latest
    registry/                      # 源登记: valuable-urls.md
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # etl/_paths.py → project root
DATA = ROOT / "data"

COMPANIES = DATA / "companies"                          # 按公司组织
RAW = DATA / "raw"
JOBBANK = RAW / "jobbank"
DIRECTORIES = RAW / "directories"
DESIGNATED = RAW / "designated-employers"
POLICY = DATA / "policy"
OUTPUT = DATA / "output"
REGISTRY = DATA / "registry"
