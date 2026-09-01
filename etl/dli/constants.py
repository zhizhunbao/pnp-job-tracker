"""
dli 域常量 —— 域词汇表(五件全溶,照样张 etl/company/;2026-08-30 批D)。

判据照 company 样张:常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径;
唯一特批 import = `paths`(件套以 dli.constants 包名被引,门先把 etl/ 摆上路径)。
注释方言:每个常量用赋值后的裸字符串 docstring,行内 # 退役。
原 build_ircc_dli_pgwp.py 的 IN_URL / LANDING / OUT_FILE / UA / PROV_CODE 原样搬来,
函数体字面量(文案 f-string、"Yes"/"Public" 判词、防线阈值、超时)同批提名。
"""
import paths

IN_URL = "https://www.canada.ca/content/dam/ircc/documents/json/dli/dli-full-list.json"
"""输入:IRCC「Designated learning institutions list」页 DataTables 的 ajaxSource
(官方机器可读 JSON,httpx 直取)。"""

LANDING = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/"
           "study-permit/prepare/designated-learning-institutions-list.html")
"""出处用「人能读的着陆页」(E4-04 惯例),不是数据文件 URL。"""

OUT_FILE = paths.DLI / "dli.json"
"""输出:PGWP 子集(院校级;跟踪,09 直通进 mart/dli.json)。"""

PROV_CODE = {
    "Alberta": "AB", "British Columbia": "BC", "Manitoba": "MB", "New Brunswick": "NB",
    "Newfoundland and Labrador": "NL", "Northwest Territories": "NT", "Nova Scotia": "NS",
    "Nunavut": "NU", "Ontario": "ON", "Prince Edward Island": "PE", "Quebec": "QC",
    "Saskatchewan": "SK", "Yukon": "YT",
}
"""省全名 → 省码;未知省**跳过**(宁可留空不瞎猜)。"""

YES = "Yes"
"""源里布尔格的真值写法(PGWP / Grad Program 两格共用)。"""

PUBLIC_TOKEN = "Public"
"""Public/Private 格里判「公立」的子串(源里有 "Public"/"Private"/组合写法)。"""

FETCH_TIMEOUT_S = 60
"""源 JSON 抓取超时(约 430KB,一次拿完)。"""

TEXT_ENCODING = "utf-8"
"""源默认 charset 声明不可靠,法语校名(Collège)防 mojibake —— 强制按 utf-8 解码。"""

OUT_INDENT = 1
"""落盘缩进(沿用原值,~300 行的表 1 格够读又省体积)。"""

MIN_ROWS = 100
"""防线:官方源结构变了宁可整轮失败,别灌半截(实测约 295 所)。"""

IN_TPL = "IN : {url}"
"""输入路径报行(运行时打印,宪法既有)。"""

OUT_TPL = "OUT: {path}"
"""输出路径报行。"""

SOURCE_ROWS_TPL = "source rows: {n}"
"""源行数报行(过滤前)。"""

SKIPPED_TPL = "skipped unknown provinces: {provs}"
"""未知省名报行(跳过不猜,留痕好追源改版)。"""

TOO_FEW_TPL = "suspiciously few PGWP institutions ({n}) — source schema changed?"
"""行数防线失败行(整轮失败,不写半截表)。"""

WROTE_TPL = "wrote {n} institutions (public {pub}, Atlantic public {atl}) fetched={fetched}"
"""收口报行(总数 + 公立数 + 大西洋四省公立数)。"""

ATLANTIC = ("NS", "NB", "PE", "NL")
"""大西洋四省省码(收口探针:AIP 相关的公立校数)。"""
