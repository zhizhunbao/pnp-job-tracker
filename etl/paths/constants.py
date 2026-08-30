"""paths.constants — data/ 布局唯一真相(2026-08-30 目录化;同日注释就范方言律①)。

重组 data/ 只改本文件 —— 全站脚本经桶取路径,目录搬家不碰脚本。
布局 — 统一约定 raw/<源>/[<日期>/]内容(抓取「方式」记在役册 method=,不进路径):
  data/
    raw/         extract: 原始抓取(只存原始 HTML/文件,不解析)
    processed/   transform: 清洗/组织后(累积去重的当前态,不按日期)
    mart/        load: 列对齐 DB 的最终表(09 产出,seed 灌库)
    crawl/       crawl 役产物(manifest + html_cache,政策雷达语料)
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
"""仓库根(etl/paths/constants.py 上三层)。"""

DATA = ROOT / "data"
"""数据根。"""

RAW = DATA / "raw"
"""extract 层根。"""

RAW_ATS = RAW / "ats"
"""ATS 公司名录根(扁平:<slug>/ 直接挂;roster json 也在此)。"""

RAW_COMPANIES = RAW_ATS
"""公司名录/文件夹根的别名(= raw/ats;kanata 系写这)。"""

RAW_JOBBANK = RAW / "jobbank"
"""Job Bank 原始 HTML 快照:<日期>/ · <日期>/details/。"""

PNP = RAW / "pnp"
"""各省 PNP 维护表(aaip-ineligible/sk-*.json 等)。"""

EE = RAW / "ee"
"""联邦 Express Entry 类别抽选清单(federal-categories.json,全国单一源)。"""

IRCC = RAW / "ircc"
"""IRCC 开放数据(E12-07:学签/工签存量、PNP 登陆数)+ pnp_allocations.json 配额维护表。"""

NOC = RAW / "noc"
"""NOC 2021 官方职业名+主要职责(StatCan Elements 开放 CSV)。"""

AIP = RAW / "aip"
"""AIP 指定雇主名单(aip-designated-employers.json/.md)。"""

PILOT = RAW / "pilot"
"""RCIP/FCIP 试点社区名单(pilot-communities.json,E6-11)。"""

WAGES = RAW / "wages"
"""ESDC 工资:wages.json(维护表)+ wage*.csv(源)。"""

LMIA = RAW / "lmia"
"""ESDC 正面 LMIA 雇主清单:lmia-employers.json(维护表)+ tfwp_*.xlsx(季度源,gitignore)。"""

FSA = RAW / "fsa"
"""GeoNames 邮编→区:fsa-districts.json(维护表)+ CA.txt(源)。"""

POLICY = RAW / "policy"
"""各省移民政策原文(.md)。"""

DLI = RAW / "dli"
"""PGWP 可申 DLI 子集(dli.json,build_dli.py 产,E12-03)。"""

NEWS = RAW / "news"
"""官方移民新闻累积表(news.json,news 域产,E12-06)。"""

JVWS = RAW / "jvws"
"""StatCan JVWS 空缺岗位数(NOC×省×季度,build_jvws.py 产,E14-01)。"""

CRAWL = DATA / "crawl"
"""crawl 役产物(每小时):<slug>/manifest.json + html_cache/<md5>.html;
定向抽取先查这里再考虑发请求(2026-08-03 Frank 拍板;读取正门 crawl.functions.get_cached_page)。"""

PROCESSED = DATA / "processed"
"""transform 层根。"""

PROCESSED_ATS = PROCESSED / "ats"
"""ATS 清洗后根(扁平:<slug>/ 直接挂)。"""

COMPANIES = PROCESSED_ATS
"""各公司文件夹根的别名(= processed/ats)。"""

PROCESSED_JOBBANK = PROCESSED / "jobbank"
"""Job Bank 累积/去重/清洗后的 store(当前态,不按日期)。"""

MART = DATA / "mart"
"""load 层:09 产出的最终表(seed 灌库;R3 下 load 域 upload 上传)。"""

TMP_SUFFIX = ".tmp"
"""原子写盘的临时文件后缀(写完 os.replace 换正身)。"""

ENC_UTF8 = "utf-8"
"""落盘编码。"""

RETRY_MAX = 5
"""写盘 OSError 重试上限(卷抖动;第 N 次仍失败照抛)。"""

RETRY_DELAY_S = 0.5
"""首次重试等待秒数(逐次翻倍)。"""

RETRY_BACKOFF = 2
"""重试退避倍率。"""
