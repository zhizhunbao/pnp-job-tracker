"""
fsa 域常量(2026-08-31 批C 全溶,照 company 样张;单段小域,不设段横幅)。

判据:常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径;
唯一特批 import = `re` 与 `paths`。
"""
import re

import paths

IN_GEONAMES = paths.FSA / "CA.txt"
"""GeoNames 源(https://download.geonames.org/export/zip/CA.zip 手动下载解出;
~1651 个 FSA,偶尔更新)。"""

OUT_TABLE = paths.FSA / "fsa-districts.json"
"""我们维护的维度表(04c 洗区消费)。"""

ENC_UTF8 = "utf-8"
"""源与产出的统一编码。"""

CA_PREFIX = "CA"
"""GeoNames 行首国别码(只收加拿大行)。"""

TAB = "\t"
"""GeoNames 是 TSV。"""

PLACE_RE = re.compile(r"^(.*?)\s*\((.*?)\)\s*$")
"""place_name = "主名 (社区1 / 社区2 …)" 的拆分:main = 括号前(郊区社区名,如
Kanata/Gloucester;大城市则=城市名),hood = 括号内第一个(更细的社区,如 Bridgeland)。"""

HOOD_SEP_RE = re.compile(r"\s*/\s*")
"""括号内多社区的分隔。"""

FSA_LEN = 3
"""FSA 定长三位(不合长度的行跳过)。"""

MIN_FIELDS = 5
"""GeoNames 行至少要有的字段数(国别/邮编/地名/省名/省码)。"""

IN_LINE_TPL = "IN  GeoNames : {path}"
"""输入报行(运行时打印路径,宪法既有)。"""

OUT_LINE_TPL = "OUT 维度表    : {path}"
"""输出报行。"""

DONE_TPL = "建表完成:{n} 个 FSA → fsa/fsa-districts.json"
"""收口报行(带产出行数)。"""
