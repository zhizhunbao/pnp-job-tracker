"""
wages 域常量 —— 域词汇表(五件全溶,照样张 etl/company/;2026-08-30 批D)。

三步共处一域,常量按步加前缀分族:WAGE_(ESDC 中位工资)/ JVWS_(StatCan 空缺岗位)/
MART_(JVWS 列对齐表);IN_*/OUT_* 路径常量原样搬来(运行时打印,宪法既有)。
唯一特批 import = `paths`(件套以 wages.constants 包名被引,门先把 etl/ 摆上路径)。
"""
import paths

# =========================================================================
# 1. 共享词汇(≥2 步消费)
# =========================================================================

TEXT_ENCODING = "utf-8"
"""落盘编码。"""

READ_ERRORS = "replace"
"""读外来文本的容错模式(坏字节替换不炸)。"""

JSON_COMPACT = (",", ":")
"""紧凑分隔符:JVWS 两张表 3-6MB 级,缩进白涨体积(沿用原值,未走 paths.write_json ——
它只支持 indent,见交付报告的收口项)。"""

PROV_NAT = "NAT"
"""全国口径的省码位(ESDC 的 prov=NAT / JVWS 的 Canada 都归它)。"""

MONTH_LEN = 7
"""ISO 日期取到月的截长(2026-01-01 → 2026-01)。"""

CSV_BOM_ENCODING = "utf-8-sig"
"""两份源 CSV(ESDC 工资表 / StatCan 全表)都带 BOM。"""

DATE_SEP = "-"
"""ISO 日期的年月分隔。"""

# =========================================================================
# 2. ESDC/Job Bank 中位工资(NOC×地区)
# =========================================================================

WAGE_URL = ("https://open.canada.ca/data/dataset/adad580f-76b0-4502-bd05-20c125de9116/"
            "resource/9da94d63-b178-4a64-aeb3-b6a3bd721ad2/download/"
            "2a71-das-wage2025opendata-esdc-all-19nov2025-vf.csv")
"""源(免费,年度更新,加拿大开放政府许可):NOC 2021 五位码 × 经济区(国/省/区)的
low/median/high 时薪。"""

IN_WAGE_CSV = paths.WAGES / "wage2025.csv"
"""输入:下载缓存(可重下)。"""

OUT_WAGE_TABLE = paths.WAGES / "wages.json"
"""输出:我们维护的「NOC×地区 中位工资」维度表。"""

WAGE_TIMEOUT_S = 120
"""源 CSV 下载超时(~18MB)。"""

WAGE_HOURS_PER_YEAR = 2080
"""时薪↔年薪换算基数(40h × 52 周)。"""

WAGE_ROUND_DIGITS = 2
"""时薪保留两位小数。"""

WAGE_ANNUAL_FLAG_TRUE = "1"
"""Annual_Wage_Flag=1 → 数值是年薪率,否则是时薪。"""

WAGE_ER_PROVINCE_LEN = 4
"""ER_Code 为 4 位 = 整省(ER00 是 NAT);6 位是经济区粒度,本轮不取。"""

WAGE_OUT_INDENT = 1
"""落盘缩进(沿用原值)。"""

WAGE_PROBE_NOCS = ("21311", "31301", "63200", "73300")
"""收口探针 NOC(会计/护士/厨师/电工:高中低薪各一,看换算有没有跑偏)。"""

WAGE_PROBE_PROV = "ON"
"""探针对照省(与 NAT 并排打)。"""

WAGE_NOC_PREFIX = "NOC_"
"""源 CSV 的 NOC_CNP 列带 NOC_ 前缀,去掉只留五位码。"""

WAGE_CACHED_TPL = "用已缓存的 {path}"
"""缓存命中行。"""

WAGE_DOWNLOAD_TPL = "下载 {url}"
"""源下载行。"""

WAGE_DONE_TPL = "建表完成:{n} 个 NOC(省级+国家级 {kept} 条)→ wages/wages.json"
"""收口报行。"""

WAGE_PROBE_TPL = "  NOC {noc}: NAT={nat} ON={on}"
"""探针行(整条 entry 原样打,一眼看全格)。"""

# =========================================================================
# 3. StatCan JVWS 空缺岗位(NOC×省×季度;E14-01 全市场分母)
# =========================================================================

JVWS_PRODUCT_ID = 14100444
"""表 14-10-0444-01(WDS 8 位 productId,不含末位校验位)。"""

JVWS_TABLE_NO = "14-10-0444-01"
"""表号(人读写法;换表号必须手动核实,不许凭旧号跑)。"""

JVWS_CUBE_URL = "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410044401"
"""官方页(出处着陆页)。"""

JVWS_WDS_META = "https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata"
"""WDS 元数据端点(每轮实查:表还在不在、最新 releaseTime)。"""

JVWS_WDS_CSV_LINK = f"https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/{JVWS_PRODUCT_ID}/en"
"""WDS 全表 CSV 下载链接的间接端点(返回真实 zip URL)。"""

IN_JVWS_ZIP = paths.JVWS / f"{JVWS_PRODUCT_ID}-eng.zip"
"""输入:全表源缓存(gitignore,~97MB,可重下)。"""

OUT_JVWS_TABLE = paths.JVWS / "jvws-vacancies.json"
"""输出:维护表(跟踪;近 N 季度过滤后 ~3MB)。"""

ENV_JVWS_QUARTERS = "JVWS_QUARTERS"
"""保留季度数的环境键(JVWS_QUARTERS=8 可扩窗)。"""

JVWS_QUARTERS_DEFAULT = "4"
"""默认最近 4 个季度。"""

JVWS_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) pnp-job-tracker-etl/1.0"
"""自报家门头(curl -A 传)。"""

JVWS_CSV_NAME_TPL = "{product_id}.csv"
"""zip 里的全表 CSV 名。"""

CURL_CMD = ("curl", "-sL")
"""statcan.gc.ca 用 httpx 直连**实测 100% ConnectError/握手超时**(WinError 10054,重试 5 次
仍失败;curl 走 schannel + 强制 http/1.1 能稳定连上,同一台机同一网络)—— 本步对该域名
统一走 curl 子进程,其余抓取脚本仍按 httpx 优先的项目惯例不受影响。"""

CURL_FLAG_MAX_TIME = "--max-time"
"""curl 超时旗标。"""

CURL_FLAG_UA = "-A"
"""curl 自报家门旗标。"""

CURL_FLAG_OUT = "-o"
"""curl 落盘旗标(不落盘则收 stdout)。"""

CURL_FLAG_METHOD = "-X"
"""curl 方法旗标。"""

CURL_METHOD_POST = "POST"
"""WDS 元数据是 POST。"""

CURL_FLAG_HEADER = "-H"
"""curl 头旗标。"""

CURL_HDR_JSON = "Content-Type: application/json"
"""WDS 元数据请求体是 JSON。"""

CURL_FLAG_DATA = "--data-raw"
"""curl 请求体旗标。"""

JVWS_META_TIMEOUT_S = 60
"""元数据实查超时(便宜,不缓存)。"""

JVWS_ZIP_TIMEOUT_S = 300
"""全表 zip 下载超时(~97MB)。"""

JVWS_DIM_GEO = 1
"""维度位:Geography(83 member,Canada/10 省/3 准州/69 经济区)。"""

JVWS_DIM_NOC = 2
"""维度位:National Occupational Classification(824 member,五位叶节点 516 个)。"""

JVWS_DIM_STAT = 3
"""维度位:Statistics(Job vacancies / Average offered hourly wage)。"""

JVWS_STAT_VACANCIES = "Job vacancies"
"""只要空缺岗位这一统计量(平均时薪不在本轮范围)。"""

JVWS_GEO_LEVELS = (0, 2)
"""省级地理的 geoLevel(0=Canada,2=省/准州;经济区更细一档,本轮不取 ——
JVWS 对 76 个抽样经济区中的 7 个做了合并只发布 69 个,城市级职业榜要用需另评抑制率)。"""

JVWS_NOC_CODE_LEN = 5
"""只要五位 NOC 叶节点(与本站 etl/noc.py 同版本 NOC 2021 v1.0,无需映射)。"""

COL_REF_DATE = "REF_DATE"
"""全表 CSV 列名:参考期。"""

COL_COORDINATE = "COORDINATE"
"""全表 CSV 列名:维度坐标(geo.noc.stat)。"""

COL_VALUE = "VALUE"
"""全表 CSV 列名:值(空 = 抑制/未采集,写 null 不折 0)。"""

COL_STATUS = "STATUS"
"""全表 CSV 列名:质量码(A-F 数据质量等级;'..'=当期未采集;'x'=保密抑制)。"""

COORD_SEP = "."
"""坐标分隔符。"""

MONTH_QUARTER = {"01": "Q1", "04": "Q2", "07": "Q3", "10": "Q4"}
"""参考期月份 → 季度记号。"""

JVWS_QUARTER_TPL = "{year}{q}"
"""季度码拼法(2026 + Q1)。"""

JVWS_ARCHIVE_CURRENT = "CURRENT"
"""表还活着的归档状态前缀。"""

JVWS_STATUS_HEAD_LEN = 7
"""归档状态报行只取前 7 字(CURRENT)。"""

JVWS_PROV_CODE = {
    "Canada": "NAT", "Newfoundland and Labrador": "NL", "Prince Edward Island": "PE",
    "Nova Scotia": "NS", "New Brunswick": "NB", "Quebec": "QC", "Ontario": "ON",
    "Manitoba": "MB", "Saskatchewan": "SK", "Alberta": "AB", "British Columbia": "BC",
    "Yukon": "YT", "Northwest Territories": "NT", "Nunavut": "NU",
}
"""地理成员名 → 省码(Canada 归 NAT)。"""

JVWS_DEFINITION_QUOTE = (
    "A job is vacant if it meets the following conditions: it is vacant on the reference date "
    "(first day of the month) or will become vacant during the month; there are tasks to be "
    "carried out during the month for the job in question; and the employer is actively seeking "
    "a worker outside the organization to fill the job."
)
"""quote-anchored 证据:空缺岗位定义(WDS getCubeMetadata footnoteId 4,2026-08-08 实查)。"""

JVWS_NOC_VERSION_QUOTE = (
    "The occupational data are presented in this table according to the National Occupational "
    "Classification (NOC) 2021 version 1.0."
)
"""quote-anchored 证据:NOC 版本对齐(footnoteId 9)—— 与本项目 NOC 2021 五位码同版本。"""

CURL_FAIL_TPL = "curl 失败(exit={code}): {url}"
"""curl 失败行。"""

JVWS_META_FAIL_TPL = "WDS getCubeMetadata 失败(exit={code}): {detail}"
"""元数据实查失败行。"""

JVWS_NOT_CURRENT_TPL = ("表 {table} 不再是 CURRENT(archiveStatusEn={status!r})—— "
                        "StatCan 可能已换表号,禁止继续凭旧号跑,先手动核实新表。")
"""表号防线失败行(整轮失败,不凭旧号灌数)。"""

JVWS_DIM_MISSING_TPL = "元数据里没有维度位 {position}(源改版?先手动核实再跑)"
"""维度缺失失败行(原 next() 的 StopIteration 换成说人话的失败)。"""

JVWS_STAT_MISSING_TPL = "统计量「{name}」不在元数据里(源改版?先手动核实再跑)"
"""统计量缺失失败行(同上)。"""

JVWS_IN_TPL = "IN:  {path}"
"""输入路径报行。"""

JVWS_OUT_TPL = "OUT: {path}"
"""输出路径报行。"""

JVWS_TITLE_TPL = "表 {table}:{title}"
"""表名报行。"""

JVWS_META_TPL = "  archiveStatus={status}  releaseTime={release}  范围={start}..{end}"
"""元数据报行。"""

JVWS_CACHED_TPL = "用已缓存的 {path}(删除后重跑可强制刷新)"
"""zip 缓存命中行。"""

JVWS_DOWNLOAD_TPL = "下载 {url}"
"""zip 下载行。"""

JVWS_SAVED_TPL = "  → {path}({mb:.1f} MB)"
"""zip 落盘行。"""

JVWS_FILTER_TPL = "过滤维度:地理 {geo} 个(Canada+10省+3准州) × NOC 五位叶节点 {noc} 个"
"""维度过滤报行。"""

JVWS_DONE_TPL = ("建表完成:{n} 行({first}..{last},{published} 行有值/"
                 "{suppressed} 行抑制或未采集)→ {name}({mb:.1f} MB)")
"""收口报行。"""

JVWS_PROBE_HEAD_TPL = "探针(NAT,{quarter}):"
"""探针段头。"""

JVWS_PROBE_TPL = "  {noc} {label}: {vacancies}(quality={quality})"
"""探针行。"""

JVWS_PROBE_DASH = "—"
"""探针未命中的占位。"""

JVWS_PROBE_LABELS = {"21231": "软件工程师/设计师", "21232": "软件开发/程序员",
                     "31301": "注册护士", "85100": "普通农场工人", "63200": "厨师"}
"""收口探针:全国口径几个代表性 NOC 最新季度空缺数。"""

# =========================================================================
# 4. JVWS 列对齐表(E14-01;不进 09 主链,自成一张维度表)
# =========================================================================

IN_MART_TABLE = paths.JVWS / "jvws-vacancies.json"
"""输入:StatCan 原始过滤表(build_statcan_jvws 产)。"""

OUT_MART = paths.MART / "jvws_vacancies.json"
"""输出:列对齐 docs/sql/e14-01-jvws-vacancies.sql 的 jvws_vacancies 表(草案,未执行):
noc / province / quarter / ref_date / vacancies / quality / available / source_url / fetched。"""

MART_UNAVAILABLE_QUALITY = (None, "F", "..", "x")
"""StatCan 质量码含义(WDS getCubeMetadata footnote #1,quote-anchored 见 JVWS_DEFINITION_QUOTE
同源):A-E = 已发布(A 最优,E 谨慎使用);F = 太不可靠不发布;'..' = 当期未采集;
'x' = 保密抑制。后三者 vacancies 本就是 None(上一步已处理),这里只派生 available
供消费端一眼判断可不可信。"""

MART_IN_TPL = "IN:  {path}"
"""输入路径报行。"""

MART_OUT_TPL = "OUT: {path}"
"""输出路径报行。"""

MART_DONE_TPL = ("建表完成:{n} 行({first}..{last}),{avail} 行可用/"
                 "{suppressed} 行抑制或未采集 → {name}({mb:.2f} MB)")
"""收口报行。"""

