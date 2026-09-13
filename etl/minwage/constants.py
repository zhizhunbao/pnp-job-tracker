"""
minwage 域常量 —— 域词汇表(五件全溶,照样张 etl/dli/;2026-09-13 立域)。

判据照 dli 样张:常量只装 JSON 装得下的(标量/字符串表)+ IN/OUT 路径;
唯一特批 import = `paths`(件套以 minwage.constants 包名被引,门先把 etl/ 摆上路径)。
注释方言:每个常量用赋值后的裸字符串 docstring,行内 # 退役。
"""
import paths

IN_URL = "https://minwage-salairemin.service.canada.ca/en/data/minimum_wage.json"
"""输入:ESDC Minimum Wage Database 页面表的取数端点(官方 JSON,页面 general.html /
since1965.html 的表都由它填;2026-09-13 浏览器网络面板实核,httpx 直取 200)。"""

LANDING = "https://minwage-salairemin.service.canada.ca/en/general.html"
"""出处用「人能读的着陆页」(现行与即将生效的一般档;E4-04 惯例),不是数据文件 URL。"""

CRAWL_SLUG = "minwage"
"""crawl 层站点 slug:JSON 原文落 data/crawl/minwage/(2026-09-02 数据链拍板:原文先进 crawl 再抽)。"""

CACHE_TITLE = "ESDC Minimum Wage Database (minimum_wage.json)"
"""crawl 页行的标题(JSON 端点没有 <title>,自报)。"""

OUT_FILE = paths.MINWAGE / "minimum_wage.json"
"""输出:一般成人档逐次调整(省 × 生效日 × 时薪),1965 起;mart 从这挂现行档与省 × 年序列。"""

K_DATA = "data"
"""源顶层键:三张表都在它下面。"""

K_PROVINCES = "provinces"
"""源:辖区表(prov_id → 两位码)。"""

K_WAGES = "wages"
"""源:逐次调整表(一般档 + 学生/特定职业等变体档混在一起,按两个标志格挑)。"""

K_PROV_ID = "prov_id"
"""辖区表:内部编号(wages 行用它指辖区)。"""

K_PROV_CODE = "province_code"
"""辖区表:两位码(FE = 联邦;NF = 2002 年改名前的纽芬兰)。"""

K_WAGE_PROV = "prov_prov_id"
"""调整表:辖区内部编号。"""

K_EFFECTIVE = "effective_date"
"""调整表:生效日(形如 2026/10/01 00:00:00)。"""

K_EXPIRY = "expiry_date"
"""调整表:失效日(现行档没有此键)。"""

K_AMOUNT = "minimum_wage_amount"
"""调整表:时薪(加元)。"""

K_RATE_TYPE = "rt_rate_type_id"
"""调整表:档型编号(1 = 一般档;2/3/4/6 = 学生/特定职业等变体)。"""

K_GENERAL_IND = "minimum_wage_ind"
"""调整表:一般档标志(1 = 官方「一般最低工资」表收录的行;0 = 变体/注释行)。
2026-09-13 实核:`minimum_wage_ind == 1 且 rt_rate_type_id == 1` 与官方 general.html 的 19 行零差。"""

RATE_TYPE_GENERAL = 1
"""一般档的档型编号。"""

GENERAL_IND = 1
"""一般档标志的真值。"""

PROV_CODE_MAP = {"FE": "CA", "NF": "NL"}
"""源辖区码 → 本站地区码:联邦记 CA(联邦管辖行业的底线,不是「全国」);
NF 是 2002 年改名前的纽芬兰,并入 NL 让 1965 起的序列连续。其余两位码同形直用。"""

SRC_DATE_LEN = 10
"""源日期串前十位是日(YYYY/MM/DD)。"""

SRC_DATE_SEP = "/"
"""源日期分隔符。"""

ISO_DATE_SEP = "-"
"""落盘日期分隔符(ISO)。"""

K_OUT_PROVINCE = "province"
"""落盘行:地区码。"""

K_OUT_EFFECTIVE = "effectiveDate"
"""落盘行:生效日(YYYY-MM-DD)。"""

K_OUT_EXPIRY = "expiryDate"
"""落盘行:失效日(YYYY-MM-DD;现行档空串)。"""

K_OUT_RATE = "rate"
"""落盘行:时薪。"""

FETCH_TIMEOUT_S = 60
"""源 JSON 抓取超时(约 430 KB,一次拿完)。"""

MIN_ROWS = 400
"""防线:一般档行数低于此宁可整轮失败(实测 597 行),别灌半截。"""

OUT_INDENT = 1
"""落盘缩进。"""

IN_TPL = "IN : {url}"
"""输入路径报行。"""

OUT_TPL = "OUT: {path}"
"""输出路径报行。"""

SOURCE_ROWS_TPL = "source rows: {n} (general {general})"
"""源行数报行(过滤前 / 过滤后)。"""

TOO_FEW_TPL = "suspiciously few general minimum wage rows ({n}) — source schema changed?"
"""行数防线失败行(整轮失败,不写半截表)。"""

WROTE_TPL = "wrote {n} rows · {provs} jurisdictions · latest effective {latest} fetched={fetched}"
"""收口报行。"""
