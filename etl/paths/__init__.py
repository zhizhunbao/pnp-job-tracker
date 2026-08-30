"""
paths 域:data/ 布局唯一真相 + 原子写盘(基础设施叶,2026-08-30 由 _paths.py 目录化)。

本 __init__ 是桶(cms 惯例:外部一律从桶 import):消费者 `import paths` 后
`paths.MART`/`paths.write_json(...)` 照旧;重组 data/ 只改 paths/constants.py。
写盘惯例(2026-08-30 立,样张 pnp/build_ab.py):一律 paths.write_json —— 原子 +
Errno 22 有界重试(Windows 绑定卷间歇抖动,48h 实测 12 次的病根药)。
"""
from paths.constants import (AIP, COMPANIES, CRAWL, DATA, DLI, EE, FSA, IRCC, JVWS, LMIA, MART,
                             NEWS, NOC, PILOT, PNP, POLICY, PROCESSED, PROCESSED_ATS,
                             PROCESSED_JOBBANK, RAW, RAW_ATS, RAW_COMPANIES, RAW_JOBBANK, ROOT,
                             WAGES)
from paths.functions import write_json
from paths.scheme import WriteJsonIn

BUCKET = (AIP, COMPANIES, CRAWL, DATA, DLI, EE, FSA, IRCC, JVWS, LMIA, MART, NEWS, NOC, PILOT,
          PNP, POLICY, PROCESSED, PROCESSED_ATS, PROCESSED_JOBBANK, RAW, RAW_ATS, RAW_COMPANIES,
          RAW_JOBBANK, ROOT, WAGES, WriteJsonIn, write_json)
"""桶的全部出口(再导出名单;F401 的显式消费声明 —— 加常量记得同步两处)。"""
