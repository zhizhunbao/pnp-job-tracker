"""
rcip 域常量 —— 域词汇表(乡村社区移民试点:社区名单、指定雇主/优先职业清单、名额状态;
照 company/noc 三件套样张,段横幅三行框 + N. 编号,与 functions.py 同名同序镜像)。

沿革:2026-08-31 批E 从 pilot 域拆出(Frank「拆成三个 很少有人有法语」)。
原 pilot/constants.py 的 details / quota / communities 三段整段搬来,常量名、正则、模板、
每条 docstring 逐字随段走;**批E 拆分改动逐处如下,每处在所属常量的 docstring 里另记一段**:
  · IN_COMMUNITIES / OUT_EMP / OUT_OCC / OUT_QUOTA / OUT_COMMUNITIES 五个路径改指 paths.RCIP
    下的 rcip-* 四件(pilot-* 四件随 pilot 域退役);
  · BASELINE_EMP 去掉纯 FCIP 四社区(Kelowna 52 / Acadian Peninsula 32 /
    St. Pierre Jolys 6 / Superior East Region 15 移去 fcip),其余 14 条原值;
  · SLUG_TO_COMMUNITY 只留 rcip-* 14 条(fcip-* 四条移去 fcip);
  · CITY_MAP 只留 RCIP 14 社区条目(含双身份的 Sudbury/Timmins,fcip 侧镜像同名两条);
  · PROV_HINT 只留 RCIP 五条(Acadian / Superior East 两条移去 fcip);
  · 塌方哨兵单侧化:MIN_FCIP 移去 fcip,COMM_COLLAPSE_TPL / COMM_DONE_TPL 两条文案
    收成只报 RCIP 一侧;TYPE_FCIP 随 Francophone 节的解析移去 fcip。
  · 新增 DUAL_COMMUNITIES(双身份社区名单,拍板点 8-② 落地,举证见其 docstring)。
常量**值**除上述拆分项外一字未改;extractors/ 私件群随本域(RCIP 14 社区抽取器)。

批L 溶解改动(2026-08-31):extractors/ 私件群溶进本域五件 —— 本文件新增第 5~9 段
(登记 + ON/BC/草原/大西洋四地区的常量),四个原文件头逐字存档在
EXTRACTORS_DOC / ON_DOC / BC_DOC / PRAIRIE_DOC / ATL_DOC;抽取器里数出的同值抄本
(UA×5、超时×5、Claresholm 首页 URL×2、去标签正则×5、两个社区名×2)按「有重复才收」
并进第 1 段共享词汇,逐条在所属常量的 docstring 里记了原名与并因。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则/配置 dict)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役。
零字符串令:functions 里除空串/数值/to_* 体内字典键外,一切字面量住这;
文案模板一律 *_TPL,JSON/wire 键一律 K_ 词族,官方原句一律 *_QUOTE(quote-anchored,禁转述)。
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(≥2 段消费:编码 / JSON 键词表 K_* / 跨步共用路径)
# =========================================================================

ENC_UTF8 = "utf-8"
"""文本读写的统一编码(五个步骤全用)。"""

ERRORS_IGNORE = "ignore"
"""读外来文本的容错模式:坏字节直接丢(employers 读 NL 语料 md、quota 读 crawl 缓存 html
两处原样沿用 —— 与 communities 的 replace 不是一档,别并)。
批E 拆分改动:employers 步随 aip 域走了,本域只剩 quota 读 crawl 缓存 html 这一个消费者。"""

IN_COMMUNITIES = paths.RCIP / "rcip-communities.json"
"""社区名单表 —— communities 步产出、details/quota 两步读入(同一个文件;
本步自己的落盘口见第 4 段 OUT_COMMUNITIES)。
批E 拆分改动:原 paths.PILOT / "pilot-communities.json" 一分为二,本域读写 RCIP 那一半。"""

K_PROVINCE = "province"
"""行键:省码(employers/details/quota/communities 四步共用)。"""

K_NAME = "name"
"""行键:社区官方名 / 雇主名(details 的社区索引、quota 的社区对表、communities 的产出行)。"""

K_TYPE = "type"
"""行键:试点类型(RCIP / FCIP / RCIP+FCIP)。"""

K_LOCATION = "location"
"""雇主行键:地点(官方没给就空串 —— 宁缺勿猜,不拿社区名顶)。
批L 溶解改动:抽取器群溶进本域后,18 处 `{"name": …, "location": …}` 的键词汇归此。"""

K_NOC = "noc"
"""职业行键:五位 NOC 码(官方只给行业名时是空串,配 sectorOnly=True)。"""

K_TITLE = "title"
"""职业行键:职业名(官方原文,附注从句已剪)。"""

K_SECTOR_ONLY = "sectorOnly"
"""职业行键:True = 官方只给了行业名,没给 NOC 码。"""

K_ROWS = "rows"
"""产出 JSON 顶层键:行清单(details/quota/communities 三步的读写口)。"""

K_COMMUNITY = "community"
"""行键:所属社区官方名(details 的保旧索引、quota 的社区级行)。"""

K_URL = "url"
"""行键 / manifest 页键:出处 URL。"""

K_PAGES = "pages"
"""crawl manifest 顶层键:页清单(quota/communities 两步读)。"""

K_HTML = "html"
"""crawl manifest 页键:缓存文件名(html_cache 下的相对名)。"""

HTML_CACHE_DIR = "html_cache"
"""crawl 缓存实体目录名(manifest 同级)。"""

TIMEOUT_S = 60
"""直连官方源的超时秒数(五段共用)。
批L 溶解改动:原 LIVE_TIMEOUT_S(quota)与四个抽取器文件各自的 TIMEOUT 同值 60,收成一处。"""

CL_URL = "https://claresholm-rcip.ca/"
"""Claresholm 官网首页 —— **两段共用**:quota 的直连补抓(月度名额写在首页)与
details 的 Claresholm 抽取器(单页站,雇主与职业都在这一页)。
批L 溶解改动:原 quota 段 CL_URL 与 extractors/prairie 的 _CL_URL 同值,收成一处。"""

TAG_RE = re.compile(r"(?s)<[^>]+>")
"""HTML 标签(去 tag 取纯文本)。
批L 溶解改动:原住 quota 段(text_of_html 一个消费者),抽取器群溶进来后
ON/BC/草原三段的去标签也用它(四个抽取器文件里的 `<[^>]+>` 抄本随之退役),移进共享段。"""

PDF_HREF_RE = re.compile(r'href="([^"]+\.pdf)"')
"""页内 .pdf 链接(Thunder Bay 与 North Okanagan Shuswap 两处共用同一条,值一字未改)。"""

NOC5_RE = re.compile(r"\d{5}")
"""五位 NOC 码(**整格**比对用:fullmatch 判一格是不是纯 NOC 码)。
与 quota 段的 RE_NOC(句内 `NOC 12345` 带词锚)不是一回事,别并。"""

PRIORITY_OCC_ANCHOR = "Priority Occupations"
"""官方页里「优先职业」段的标题锚(Sudbury/Thunder Bay/Moose Jaw/Steinbach 四处共用)。"""

TABLE_CLOSE = "</table>"
"""表格结束标签(North Bay / Moose Jaw 两处截段用)。"""

FILETYPE_PDF = "pdf"
"""fitz.open 的 filetype 档位名(六处 PDF 解析共用)。"""

GET_TEXT_DICT = "dict"
"""pymupdf page.get_text() 的档位名:要带坐标的结构化输出(版式解析全靠它)。"""

K_BLOCKS = "blocks"
"""pymupdf 结构化输出顶层键:文本块清单。"""

K_LINES = "lines"
"""pymupdf 文本块键:行清单。"""

K_SPANS = "spans"
"""pymupdf 行键:同格式片段清单。"""

K_TEXT = "text"
"""pymupdf 片段键:文字。"""

K_BBOX = "bbox"
"""pymupdf 片段/行键:包围盒 (x0, y0, x1, y1) —— 列判定靠 x0,行聚簇靠 y0。"""

# =========================================================================
# 2. details 步(社区指定雇主/职业清单自动刷新)
# =========================================================================

DET_DOC = """build_pilot_details — 社区指定雇主/职业清单**自动刷新**(E6-11 批C,2026-08-15)。

批B 用 agent 一次性抽了 18 社区;本步把它变成周更:pilot/extractors 里每社区一个抽取函数,
总控逐社区跑,**塌方保旧**:行数掉到基线一半以下、或抽取抛异常 → 该社区沿用上一版行并打「!」
(auto_update 记 ERROR 级);其余社区正常刷新。整步永远 exit 0,不拦役。

  IN : 各社区官方源(pilot.extractors 直连) + raw/pilot/pilot-{employers,occupations}.json(保旧底本)
       raw/pilot/pilot-communities.json(社区 → 省/类型)
  OUT: raw/pilot/pilot-employers.json + pilot-occupations.json(原地刷新)

批E 拆分改动(2026-08-31):18 社区一分为二 —— 本域跑 RCIP 14 个,抽取器住 rcip.extractors,
IN/OUT 全部改指 raw/rcip/rcip-{communities,employers,occupations}.json;
纯法语四社区归 fcip 域同名步。上面那段 IN/OUT 是原文件头逐字存档,路径以本段常量为准。"""
"""本步的沿革与 IN→OUT(原 build_pilot_details.py 文件头,逐字折进)。"""

OUT_EMP = paths.RCIP / "rcip-employers.json"
"""各社区官方公示的指定雇主行(原地刷新,塌方保旧)。
批E 拆分改动:原 paths.PILOT / "pilot-employers.json",本域只写 RCIP 14 社区的行。"""

OUT_OCC = paths.RCIP / "rcip-occupations.json"
"""各社区官方优先/在收职业行(原地刷新,塌方保旧)。
批E 拆分改动:原 paths.PILOT / "pilot-occupations.json",本域只写 RCIP 14 社区的行。"""

BASELINE_EMP = {
    "North Bay and Area": 228, "Sudbury, ON": 426, "Timmins, ON": 153, "Sault Ste. Marie, ON": 151,
    "Thunder Bay, ON": 406, "West Kootenay, BC": 263,
    "North Okanagan Shuswap, BC": 450, "Peace Liard, BC": 0, "Moose Jaw, SK": 147,
    "Claresholm, AB": 23, "Steinbach, MB": 42, "Altona/Rhineland, MB": 23, "Brandon, MB": 39,
    "Pictou County, NS": 60,
}
"""批B 基线(2026-08-15 实抽行数);哨兵 = 新抽 < 基线一半 → 疑似改版塌方,保旧。
Peace Liard 雇主基线 0(官方待公示):>0 即收,不设下限。
批E 拆分改动:纯 FCIP 四社区的基线(Kelowna 52 / Acadian Peninsula 32 /
St. Pierre Jolys 6 / Superior East Region 15)整条搬去 fcip 域,余下 14 条数值一字未改。"""

MIN_OCC = 10
"""职业清单的行数下限(各社区都是 ~25 条量级,低于它即疑改版塌方)。
批E 拆分改动:两域各留一份原值(标量镜像,改一边记得改另一边)。"""

CTYPE_BOTH = "RCIP+FCIP"
"""同名社区双类型(Sudbury/Timmins 各有 RCIP+FCIP 两行)时的类型说法。"""

DUAL_COMMUNITIES = ("Sudbury, ON", "Timmins, ON")
"""**双身份社区**:IRCC 官方名单页的 Rural communities 与 Francophone communities 两节
都列了它俩(2026-08-31 名单页实核:两节各一条,链接同一个社区官网)——
所以它们既是 RCIP 也是 FCIP,抽取器住本域、只抽一次,fcip 域不重复抽取(拍板点 8-②)。

沿革(批E 修活一个已记档的死分支):原 pilot 的 community_type_of 靠「同名计数 > 1」判双身份,
但 comms 是「名 → 行」的索引(同名在读入时已折叠),同名计数恒为 1 → CTYPE_BOTH 永假
(批C 交付报告已记档为死分支,当时判定「是否该改判是口径问题,不在搬运批内」)。
批E 拆域后 rcip-communities.json 里每个社区只剩一行,那条计数分支彻底没了立足点,
拍板点 8 明文背书按名单点名 —— 故改为查本常量。
⚠ 实际影响很小:行级 type 大多由抽取器直接给(to_emp_row / to_occ_row 里
`str(x.raw.get("type") or x.ctype)`,抽取器给了就用抽取器的),兜底只在抽取器没给 type 时触发;
Sudbury/Timmins 的抽取器逐行都给 type(RCIP / FCIP / RCIP+FCIP 三种都出现过),所以产出不变。"""

K_EMPLOYERS = "employers"
"""抽取器出参键:雇主清单。"""

K_OCCUPATIONS = "occupations"
"""抽取器出参键:职业清单。"""

K_EMPLOYERS_URL = "employersUrl"
"""抽取器出参键:雇主清单的官方出处。"""

K_OCCUPATIONS_URL = "occupationsUrl"
"""抽取器出参键:职业清单的官方出处。"""

DET_IO_TPL = "IN_COMMUNITIES={comm}\nOUT_EMP={emp}\nOUT_OCC={occ}"
"""本步开跑时打印的 IN/OUT 路径(宪法既有:运行时打印)。"""

DET_CRASH_EXTRACT_TPL = "! {name} 抽取异常({kind}: {detail})—— 保旧"
"""单社区抽取抛异常时的留痕行(auto_update 按「!」升 ERROR 级)。"""

DET_EMP_SHORT_TPL = "! {name} 雇主 {n} 行(基线 {base})—— 疑似改版塌方,保旧"
"""单社区雇主行数塌方的留痕行。"""

DET_OCC_SHORT_TPL = "! {name} 职业 {n} 行(< {floor})—— 疑似改版塌方,保旧"
"""单社区职业行数塌方的留痕行。"""

DET_ERR_DETAIL_LEN = 80
"""抽取异常详情在留痕行里的截断长度。"""

DET_EMP_NOTE = ("各社区官方公示的指定雇主名单(批C 自动刷新,pilot_extractors 逐社区抽取;塌方保旧)。"
                "『指定』≠『在招』;excluded/de-designated 已在抽取层剔除;Peace Liard 官方待公示。")
"""pilot-employers.json 的口径说明(产物字段,逐字不改)。"""

DET_OCC_NOTE = "各社区官方优先/在收职业清单(批C 自动刷新;当前有效版)。sectorOnly=官方只给行业名。"
"""pilot-occupations.json 的口径说明(产物字段,逐字不改)。"""

DET_DONE_TPL = "  ✓ 雇主 {emp} 行 · 职业 {occ} 行 · 刷新 {n} 社区{tail}"
"""收尾报数行。"""

DET_KEPT_TPL = " · 保旧 {names}"
"""收尾报数行的保旧尾巴。"""

DET_KEPT_SEP = "、"
"""保旧社区名的拼接符。"""

DET_CRASH_TPL = "✗ build_pilot_details 异常退出({kind}: {detail})—— raw 保持原样,不拦役"
"""总控自身失败的留痕行 —— **本步永远 exit 0 不拦役**,所以这道 catch 住在入口函数体内,
异常不许漏到门里变 return 1(原脚本 `__main__` 外层那道 try/except 的逐字对应物)。"""

# =========================================================================
# 3. quota 步(RCIP 社区名额状态)
# =========================================================================

QUOTA_DOC = """build_pilot_quota — RCIP 社区**名额状态**抽取(2026-08-15,Frank「如果没有竞争,我怎么知道要不要选 RCIP」)。

为什么要有这一步:省提名那套「存量 ÷ 名额 = 34.7:1」在 RCIP 上不成立 —— 没有 EOI 池、不排队、不打分,
它是**先到先得 + 逐职业限额**。所以「该不该押这条路」的判据不是比值,是四件事:
职业在不在清单、**该职业额度用完没有**、**现在收不收**、每雇主能报几个。
联邦不按社区公布名额(fed-rcip 30 页命中 0 条),得逐个社区去它自己的官网上找 —— 就抓这个。
2026-08-16 全 20 社区实测:10 个官网写了(本步产出 10 行),其余 10 个**全站不提名额**(逐社区举证见
交付报告),那是「官方没写」,不是「我们没抓」—— 两者在用户那里意思相反,别混。

  IN : data/crawl/{rcip,fcip}-*/{manifest.json,html_cache}  (crawl 役周更;URL→数据→SQL 的第一站)
       raw/pilot/pilot-communities.json                     (社区官方名 → 省/类型,与既有表对齐)
       两个社区的官网(缓存够不着,直连补抓 —— 见 LIVE_DOC 的举证)
  OUT: raw/pilot/pilot-quota.json                    ({communities: [...], occupations: [...]})

红线(同 pilot.extractors):**宁缺勿猜**。每一行必须锚定一句官网原文(quote)与它的 URL;
正则拿不准的句子一律不产出行 —— 名额状态直接决定用户押不押这条路,编一个比不给更糟。

批E 拆分改动(2026-08-31):本域只扫 rcip-* 14 个 slug,IN/OUT 改指 raw/rcip/ 两件;
fcip-* 四个 slug 归 fcip 域同名步(2026-08-16 实测四站全文都不提名额,那边产 0 行,
挂的是**覆盖**不是结论)。上面那段 IN/OUT 是原文件头逐字存档,路径以本段常量为准。"""
"""本步的判据与 IN→OUT(原 build_pilot_quota.py 文件头,逐字折进)。"""

IN_CRAWL = paths.DATA / "crawl"
"""crawl 役的缓存根(逐 slug 一目录:manifest.json + html_cache/)。"""

OUT_QUOTA = paths.RCIP / "rcip-quota.json"
"""社区级名额状态 + 职业满额行(每行锚定官网原句)。
批E 拆分改动:原 paths.PILOT / "pilot-quota.json",本域只写 RCIP 14 社区的行。"""

MANIFEST_FILE = "manifest.json"
"""每个 crawl slug 目录下的清单文件名。"""

K_CRAWLED_AT = "crawled_at"
"""manifest 顶层键:该轮 crawl 的时间(取前 10 位作 asOf)。"""

ASOF_LEN = 10
"""从 crawled_at 里截出 ISO 日期的长度(YYYY-MM-DD)。"""

SLUG_TO_COMMUNITY = {
    "rcip-altona": "Altona/Rhineland, MB",
    "rcip-brandon": "Brandon, MB",
    "rcip-claresholm": "Claresholm, AB",
    "rcip-moose-jaw": "Moose Jaw, SK",
    "rcip-north-bay": "North Bay and Area",
    "rcip-okanagan-shuswap": "North Okanagan Shuswap, BC",
    "rcip-peace-liard": "Peace Liard, BC",
    "rcip-pictou": "Pictou County, NS",
    "rcip-ssm": "Sault Ste. Marie, ON",
    "rcip-steinbach": "Steinbach, MB",
    "rcip-sudbury": "Sudbury, ON",
    "rcip-thunder-bay": "Thunder Bay, ON",
    "rcip-timmins": "Timmins, ON",
    "rcip-west-kootenay": "West Kootenay, BC",
}
"""crawl slug → 社区官方名(与 rcip-communities.json 的 name 逐字一致,不然接不上既有表)。
批E 拆分改动:原表末四行是 FCIP 四社区(fcip-acadian / fcip-kelowna / fcip-st-pierre /
fcip-superior-east),整条搬去 fcip 域;原注「首版漏挂 → 它们的缓存从没被扫过;
2026-08-16 实测四站全文都不提名额,所以挂上去也不产行 —— 挂的是**覆盖**,不是结论」
随那四行一起走,在 fcip.constants 同名常量下存档。余下 14 行一字未改。"""

RE_OCC_FULL = re.compile(
    r"(reached the maximum allowable recommendations|"
    r"reached the cap imposed by|"
    r"have been successfully met|"
    r"(?:can |will )?no longer accept\w*)",
    re.I,
)
"""职业满额的明文说法(一条规则 = 一个可证伪的正则 + 它证出来的字段)。
句子里必须同时有「满/不再收」的明文和五位 NOC 码,两者缺一不产出行。
🔴 首版这里写宽了(`maximum .{0,20}recommendations`),把 Timmins 的
   「**Added to** the RCIP Priority Occupation List: NOC 74200…」抓成了满额 —— 那是**新增**职业,
   意思正好相反。收窄成官方实际用过的三种说法,再加一道否定闸(RE_OCC_NOT_FULL)挡住
   「新增/加入清单」的句子。
   2026-08-16 加第四种:Peace Liard 写「reached the cap imposed by IRCC … (NOC 62010)」——
   同句自带 NOC 码,与前三种一样是「这个职业不再发了」的明文,不是「新增」。"""

RE_OCC_NOT_FULL = re.compile(r"(added to the|adding to the|newly added|now (?:open|accepting))", re.I)
"""否定闸:命中即这句在说「新增/开收」,与满额意思相反,不产行。"""

RE_NOC = re.compile(r"\bNOC\s*(\d{5})\b")
"""句内的五位 NOC 码(分句抓正是为了不跨句乱配)。"""

RE_REMAINING = re.compile(r"remaining allocation[s]?\s*[\(\:]?\s*(\d{1,4})\b", re.I)
"""剩余名额:官方写成 remaining allocations (153) 这种;只认带括号或紧跟的数字。"""

RE_FIRST_COME = re.compile(r"first[-\s]come,?\s*first[-\s]serve", re.I)
"""先到先得的明文。"""

RE_PER_INTAKE = re.compile(
    r"issue up to\s*(\d{1,4})\s*(?:community |candidate )?recommendations", re.I)
"""每轮名额上限:核原句时从 Moose Jaw/Steinbach 的引语里发现的,比「先到先得」这个布尔具体得多
(「Per intake period, … will issue up to 12 recommendations」)。
2026-08-16 放宽定语:Peace Liard 写的是「authorized to issue up to 60 **candidate** recommendations
… in the 2026 intake year」(该社区一年就一轮 intake,官网自己也叫「this intake cycle」)。"""

PER_EMPLOYER_CAP_DOC = """⚠️「每雇主上限」本版**不抽**:实测各社区写的根本不是同一件事 —— Peace Liard 是
「capped at 5% of allocations」(百分比,不是人数)、Moose Jaw 只限「10 人以下的餐饮企业」、
Steinbach 是「某个 NOC 下 may be limited to 1」。塞成一个数字会把条件全丢了,比不给更误导。
要做得连同它的适用条件一起建模,那是另一件事。"""
"""不抽「每雇主上限」的理由(原行内注释,逐字折进 —— 这是判定留痕不是待办)。"""

SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")
"""分句(句末标点 + 空白)。"""

SCRIPT_STYLE_RE = re.compile(r"(?is)<(script|style).*?</\1>")
"""取正文前先拆掉的脚本/样式块。"""

QUOTE_BEFORE = 130
"""原句窗口:匹配点**之前**留多少字。"""

QUOTE_AFTER = 200
"""原句窗口:匹配点**之后**留多少字。
原句取**匹配点周围的窗口**,不取句首。有些社区页整页没标点,一「句」上千字,
从句首截 400 字会截出一段看不见匹配短语的话 —— 那种 quote 没法复核,等于没举证。"""

STATUS_FULL = "full"
"""职业满额行的状态值。"""

K_REMAINING = "remaining"
"""社区级键:剩余名额数。"""

K_REMAINING_QUOTE = "remainingQuote"
"""社区级键:剩余名额的官网原句。"""

K_REMAINING_URL = "remainingUrl"
"""社区级键:剩余名额的出处 URL。"""

K_FIRST_COME = "firstCome"
"""社区级键:是否先到先得。"""

K_FIRST_COME_QUOTE = "firstComeQuote"
"""社区级键:先到先得的官网原句。"""

K_FIRST_COME_URL = "firstComeUrl"
"""社区级键:先到先得的出处 URL。"""

K_PER_INTAKE = "perIntake"
"""社区级键:每轮名额上限。"""

K_PER_INTAKE_QUOTE = "perIntakeQuote"
"""社区级键:每轮名额上限的官网原句。"""

K_PER_INTAKE_URL = "perIntakeUrl"
"""社区级键:每轮名额上限的出处 URL。"""

K_ASOF = "asOf"
"""行键:该行证据的日期(crawl 轮次日期 / 直连当天)。"""

LIVE_DOC = """直连补抓:缓存够不着的两个社区。为什么破例走网络(其余社区一律吃 crawl 缓存):
  Claresholm, AB —— 缓存里那一页是 **403 Forbidden**(爬役 UA 被站点挡),正文一个字没落地。
    「爬完零命中」在这里根本不是证据,而官网首页白纸黑字写着月度名额 → 换浏览器 UA 直连即可。
  West Kootenay, BC —— 官网**换域**(wk-rnip.ca → westkootenayimmigration.ca),爬役停在旧域首页,
    名额写在换域后的公告贴里。贴子 URL 每年变,所以从 /updates/ 索引现取,不写死某一篇。
形态照 pilot.extractors:一社区一个函数,httpx + 浏览器 UA,句子对不上就返回空(宁缺勿猜)。

批E 拆分改动(2026-08-31):两个直连社区都是 RCIP,整套(LIVE_UA / LIVE_TIMEOUT_S /
CL_* / WK_* 与它们的函数)留在本域;fcip 域无直连件。

批L 溶解改动(2026-08-31):抽取器群溶进本域后,上面点名的四个常量各自并了同值抄本 ——
LIVE_UA → UA_CHROME126、LIVE_TIMEOUT_S → TIMEOUT_S、CL_URL 三者进第 1 段共享词汇,
CL_COMMUNITY / WK_COMMUNITY 两个社区名进第 5 段的 14 个官方名一族;函数仍住本段,值一字未改。"""
"""两个直连破例的举证(原行内注释,逐字折进)。"""

WK_UPDATES_URL = "https://westkootenayimmigration.ca/updates/"
"""West Kootenay 换域后的公告索引页。"""

RE_CL_PER_INTAKE = re.compile(r"We will issue \w+ \((\d{1,3})\) allocations per month[^.]*\.", re.I)
"""Claresholm 的「三(3)个 allocation/月」——「per month」正是本社区的 intake 周期(官网:intake 逐月开)。
quote 从「We will issue…」起头,不带前面那串导航/标题 —— 这两站整段没有句号,
从「句」首截会截出一大坨看不见匹配短语的话,那种举证没法复核。"""

RE_WK_PER_INTAKE = re.compile(
    r"Approximately (\d{1,4}) Community Recommendations may be issued per intake[^.]*\.", re.I)
"""West Kootenay 2026-05 改制后的现行口径(改制前的「~18/月、先到先得」已作废,故只认这一句)。"""

WK_HREF_RE = re.compile(r'href="([^"#?]+)"')
"""公告索引页里的站内链接。"""

WK_POST_RE = re.compile(r"intake|allocation", re.I)
"""公告贴 URL 的判据词(命中才值得点进去看)。"""

WK_HOST_INDEX = 2
"""URL 按 / 切开后主机名所在的下标(https://host/... → 第 2 段)。"""

WK_POST_LIMIT = 8
"""最多点开几篇公告(索引按时间倒序 → 先命中的就是最新一篇)。"""

URL_SEP = "/"
"""URL 的路径分隔符(切主机名用)。"""

QUOTA_IO_TPL = "IN_CRAWL={crawl}\nIN_COMMUNITIES={comm}\nOUT={out}"
"""本步开跑时打印的 IN/OUT 路径。"""

QUOTA_SKIP_TPL = "  ! {slug}: 社区名对不上 rcip-communities.json({name})—— 跳过,不猜省份"
"""slug 对不上社区表时的留痕行。
批E 拆分改动:文案里的文件名随 IN_COMMUNITIES 从 pilot-communities.json 改成 rcip-communities.json。"""

QUOTA_LIVE_SKIP_TPL = "  ! live {name}: 对不上 rcip-communities.json —— 跳过"
"""直连社区对不上社区表时的留痕行。
批E 拆分改动:同上,文案里的文件名跟着 IN_COMMUNITIES 走。"""

QUOTA_LIVE_FAIL_TPL = "  ! live {name}: 抓取/解析失败({kind}: {detail})—— 本轮不产行"
"""直连抓取/解析失败的留痕行(官网抖动不该炸掉整步,保其余社区)。"""

QUOTA_ROW_TPL = "  {name:<28} {flags}"
"""逐社区的缓存扫描结果行。"""

QUOTA_LIVE_ROW_TPL = "  {name:<28} [直连] {flag}"
"""逐社区的直连补抓结果行。"""

QUOTA_FLAG_NONE = "—"
"""该社区什么都没抓到时的占位。"""

QUOTA_FLAG_SEP = "、"
"""多个 flag 的拼接符。"""

QUOTA_FLAG_OCC_TPL = "满额职业 {n}"
"""flag:满额职业条数。"""

QUOTA_FLAG_KV_TPL = "{label}={value}"
"""flag:带值的社区级字段(剩余名额=153)。"""

QUOTA_FLAG_LABELS = ((K_REMAINING, "剩余名额"), (K_FIRST_COME, "先到先得"))
"""要报进 flag 的社区级字段与它们的人话名(firstCome 是布尔,只报名字不报值)。"""

QUOTA_LIVE_FLAG_TPL = "每期名额=%s"
"""直连结果行里的每期名额说法(原脚本用 % 取模拼,原样保留)。"""

QUOTA_NOTE = "RCIP 社区名额状态;每行锚定官网原句(quote+url)。空 = 官网没写,不是没有限额。"
"""pilot-quota.json 的口径说明(产物字段,逐字不改)。"""

QUOTA_DONE_TPL = "\nOUT {path}  社区级 {comm} 行 / 职业满额 {occ} 行"
"""收尾报数行。"""

# =========================================================================
# 4. communities 步(RCIP 试点社区名单)
# =========================================================================

COMM_DOC = """build_pilots — RCIP/FCIP 试点社区名单(E6-11 3.1/3.2,2026-08-15)。

社区名单从 fed-rcip 周更 crawl 的 IRCC 官方名单页缓存解析(URL→数据铁律,不发新请求);
社区 → Job Bank 城市映射是**人工核对表**(CITY_MAP,3.2 红线:宁漏勿错):
  · 单城社区:社区名即城市名(IRCC 官方表原文),对照 jobs.city 实测存在才映射
  · 区域型社区(West Kootenay/Peace Liard 等 6 个):界线未逐社区举证 → cities=[] 不参与打标,
    种子已进 crawl(crawl.constants SEEDS),界线页举证后补
口径:试点=社区推荐制且雇主须先被社区指定;本表只回答「岗在不在试点社区」这一层。

  IN : data/crawl/fed-rcip/manifest.json + html_cache(rural-franco-pilots.html 官方名单)
  OUT: raw/pilot/pilot-communities.json

批E 拆分改动(2026-08-31):同一页两节各解析各的 —— 本域只解析
**h3「Rural communities」到 h3「Francophone communities」之间**那一节(RCIP 14 个),
OUT 改指 raw/rcip/rcip-communities.json;Francophone 那一节归 fcip 域同名步。
两节都要用 h3 锚定位,所以 RE_FRANCO_H3 在本域仍是**段终点**,缺锚照旧保旧不拦役。"""
"""本步的口径与 IN→OUT(原 build_pilot_communities.py 文件头,逐字折进)。"""

IN_MANIFEST = paths.CRAWL / "fed-rcip" / "manifest.json"
"""fed-rcip crawl 役的页清单(官方名单页的缓存入口)。"""

OUT_COMMUNITIES = IN_COMMUNITIES
"""本步的落盘口 —— 与第 1 段 IN_COMMUNITIES 是同一个文件,两个名字说的是本步的角色
(communities 写、details/quota 读)。"""

ERRORS_REPLACE = "replace"
"""读 IRCC 缓存 html 的容错模式:坏字节替换不炸(与 employers/quota 那两处的 ignore
不是一档 —— 原脚本各写各的,收拢时不并,免得悄悄改了正文)。"""

COMM_PAGE_SUFFIX = "rural-franco-pilots.html"
"""官方名单页在 manifest 里的 URL 尾巴。"""

RE_RURAL_H3 = re.compile(r"<h3[^>]*>\s*Rural communities\s*</h3>")
"""「Participating communities」节里 RCIP 的 h3 标题锚
(页顶导语也含 Francophone 字样,只认 h3 标题锚)。"""

RE_FRANCO_H3 = re.compile(r"<h3[^>]*>\s*Francophone communities\s*</h3>")
"""同上,FCIP 的 h3 标题锚。
批E 拆分改动:本域不解析 Francophone 那一节,但仍要用这个锚当 **RCIP 节的终点**,
所以常量留下、正则一字未改;两个锚缺任何一个都照旧保旧不拦役。"""

RE_COMM_LINK = re.compile(r'<a[^>]+href="(https?://[^"]+)"[^>]*>\s*([^<]{3,60})\s*</a>')
"""名单区里的社区链接(URL + 显示名)。"""

TYPE_RCIP = "RCIP"
"""乡村试点类型码。"""

OFFICIAL_HOSTS = ("canada.ca", "gc.ca")
"""联邦域名 —— 名单区里指向它们的链接是导航不是社区,剔除。"""

CITY_MAP_DOC = """社区 → Job Bank 城市(2026-08-15 生产库实测城市名;Sudbury 库里双写名并存都收)。
区域型社区界线 2026-08-15 批B 举证补齐(各社区官方站原句,agent 抽取归档 raw/pilot 备查):
  Pictou=五镇+县;WK=官方首页 Discover our Region(正向名单,非穷尽);NOS=官方首页原句 20 社区;
  Peace=PRRD+NRRM 八城镇;Acadian=官方首页八市镇(取库内实拼,Tracadie 双写名并存都收,
  Bas-Caraquet 因官方只点名上级市政区 Rivière-du-Nord 不单列 → 不映射);Superior East=官方六镇;
  Claresholm 官方注明 25km 含 Granum/Stavely(Stavely 库内暂无岗,留名);Rhineland 辖内官方未列名 → 只保 Altona"""
"""CITY_MAP 的逐社区界线举证(原行内注释,逐字折进 —— 举证全文两域各存一份,
Acadian / Superior East 两条讲的是 fcip 域的社区,留在这里是为了「一条不丢」)。"""

CITY_MAP: dict[str, list[str]] = {
    "North Bay and Area": ["North Bay"],
    "Sudbury, ON": ["Sudbury", "Greater Sudbury"],
    "Timmins, ON": ["Timmins"],
    "Sault Ste. Marie, ON": ["Sault Ste. Marie"],
    "Thunder Bay, ON": ["Thunder Bay"],
    "Steinbach, MB": ["Steinbach"],
    "Altona/Rhineland, MB": ["Altona"],
    "Brandon, MB": ["Brandon"],
    "Moose Jaw, SK": ["Moose Jaw"],
    "Claresholm, AB": ["Claresholm", "Granum", "Stavely"],
    "Pictou County, NS": ["New Glasgow", "Pictou", "Stellarton", "Trenton", "Westville"],
    "West Kootenay, BC": ["Nelson", "Castlegar", "Trail", "Rossland", "Kaslo", "Nakusp", "Creston", "Grand Forks"],
    "North Okanagan Shuswap, BC": ["Vernon", "Salmon Arm", "Armstrong", "Enderby", "Lumby", "Coldstream", "Lavington",
                                    "Sicamous", "Falkland", "Sorrento", "Blind Bay", "Spallumcheen", "Grindrod",
                                    "Cherryville", "Malakwa", "Celista", "Scotch Creek", "Anglemont", "Ashton Creek", "Deep Creek"],
    "Peace Liard, BC": ["Fort St. John", "Dawson Creek", "Fort Nelson", "Chetwynd", "Tumbler Ridge", "Taylor",
                         "Pouce Coupe", "Hudson's Hope"],
}
"""社区 → Job Bank 城市的人工核对表(界线举证见 CITY_MAP_DOC;空 = 不参与打标)。
批E 拆分改动:纯 FCIP 四社区的条目(Superior East Region, ON / St. Pierre Jolys, MB /
Kelowna, BC / Acadian Peninsula, NB)搬去 fcip 域;**双身份的 Sudbury/Timmins 两条
在 fcip.constants.CITY_MAP 有镜像**(它俩的 FCIP 行也要带 cities),改一边记得改另一边。
余下 14 条城市清单一字未改。"""

PROV_RE = re.compile(r",\s*(ON|MB|SK|AB|BC|NS|NB)\s*$")
"""社区名尾巴自带的省码(「Sudbury, ON」)。"""

PROV_HINT = {"North Bay and Area": "ON", "Pictou County, NS": "NS",
             "West Kootenay, BC": "BC", "North Okanagan Shuswap, BC": "BC", "Peace Liard, BC": "BC"}
"""名字里读不出省码(或读出来不可靠)的社区的人工省份表。
批E 拆分改动:原表另有 "Acadian Peninsula, NB" 与 "Superior East Region, ON" 两条,
它们是 FCIP 社区 → 搬去 fcip 域;余下五条键值一字未改。"""

K_CITIES = "cities"
"""社区行键:映射到的 Job Bank 城市清单。"""

MIN_RCIP = 10
"""RCIP 行数哨兵下限(官方名单 14 个;低于它即疑改版)。"""

COMM_IO_TPL = "IN_MANIFEST={manifest}\nOUT={out}"
"""本步开跑时打印的 IN/OUT 路径。"""

COMM_NO_ANCHOR = "  ✗ 找不到 Rural/Francophone communities 标题 —— 疑似 IRCC 页改版,保留旧表(不拦役)"
"""标题锚缺失时的留痕行 —— **print + return,不 raise 不拦役**(语义原样)。
批E 后本域仍要两个锚(Francophone h3 = RCIP 节的终点),所以文案逐字不改。"""

COMM_COLLAPSE_TPL = "  ✗ 解析塌方:RCIP {rcip}/14 —— 疑似 IRCC 页改版,保留旧表(不拦役)"
"""行数塌方时的留痕行 —— 同样 print + return,不拦役。
批E 拆分改动(哨兵单侧化):原文案是「RCIP {rcip}/14 · FCIP {fcip}/6」两侧同报,
拆域后本域只看得见 RCIP 一侧,FCIP 那一侧的哨兵与文案归 fcip.constants 同名常量。
判据不变:RCIP < MIN_RCIP 即保旧。"""

COMM_NOTE = ("IRCC 官方参与社区名单(fed-rcip crawl 缓存解析)。cities=人工核对的 Job Bank 城市映射,"
             "空=区域型社区界线未举证不打标(宁漏勿错);试点须雇主被社区指定,城市命中只是粗筛信号。")
"""pilot-communities.json 的口径说明(产物字段,逐字不改)。"""

COMM_DONE_TPL = "  ✓ 社区 {n}(RCIP {rcip})· 已映射城市 {mapped} 个社区 → {name}"
"""收尾报数行。
批E 拆分改动(哨兵单侧化):原文案是「社区 {n}(RCIP {rcip} + FCIP {fcip})」,
拆域后本域只产 RCIP 行,FCIP 那半句归 fcip.constants 同名常量。"""

# =========================================================================
# 5. 社区抽取器登记(社区官方名 → 抽取函数;details 步的私件群)
# =========================================================================

EXTRACTORS_DOC = """批C(E6-11,2026-08-15):社区名单抽取器注册表 —— 批B 一次性抽取转自动刷新。

四个地区模块各自导出 EXTRACTORS: dict[社区官方名(与 raw/rcip/rcip-communities.json 的 name 一致), callable]。
抽取函数签名(无参):
    fn() -> {"employers": [{"name": str, "location": str}...],   # 官方当前指定雇主(excluded/de-designated 剔除)
             "occupations": [{"noc": str5位或"", "title": str, "sectorOnly": bool}...],
             "employersUrl": str, "occupationsUrl": str}
约束:只用 stdlib + httpx + fitz(pymupdf) + re/json/csv;直连官方源带浏览器 UA;
     解析不动摇的红线=宁缺勿猜,拿不准的行不要;抛异常即可 —— 总控(build_pilot_details)对该社区保旧+喊人。

批E 拆分改动(2026-08-31,pilot 拆三域;Frank「拆成三个 很少有人有法语」):
本注册表由 18 个社区收成 **RCIP 14 个**,四个纯法语社区(Kelowna, BC / Acadian Peninsula, NB /
St. Pierre Jolys, MB / Superior East Region, ON)的抽取函数原样搬去 etl/fcip/extractors/;
双身份社区 Sudbury, ON 与 Timmins, ON 的抽取器**留在本域**(拍板点 8-②),
产出行照旧逐行带 RCIP / FCIP / RCIP+FCIP 的 type,fcip 域不重复抽取。

批L 溶解改动(2026-08-31,Frank「都需要检查的」——域内 .py 只许七名,子目录不豁免):
extractors/ 私件群(__init__ + atl/bc/on/prairie 四件)整体溶进本域五件 ——
四个地区文件成本文件第 6~9 段(常量)与 functions.py 同名同序四段(函数),
注册表本身成 functions.community_extractors() 构建函数(常量装不下函数,
照本域 live_extractors 先例);`_` 前缀私件名随溶退役成无下划线顶层名。
上面这段签名契约与红线**逐字存档不改**,它是抽取器的对外约定。"""
"""抽取器群的签名契约与红线(原 rcip/extractors/__init__.py 文件头,逐字折进)。"""

NB_COMMUNITY = "North Bay and Area"
"""ON 社区一:North Bay(与 rcip-communities.json 的 name 逐字一致,下同 —— 对不上就接不进既有表)。"""

SUD_COMMUNITY = "Sudbury, ON"
"""ON 社区二:Sudbury(**双身份**:RCIP + FCIP,抽取只在本域做一次,见 DUAL_COMMUNITIES)。"""

TM_COMMUNITY = "Timmins, ON"
"""ON 社区三:Timmins(**双身份**,同上)。"""

SSM_COMMUNITY = "Sault Ste. Marie, ON"
"""ON 社区四:Sault Ste. Marie。"""

TB_COMMUNITY = "Thunder Bay, ON"
"""ON 社区五:Thunder Bay。"""

WK_COMMUNITY = "West Kootenay, BC"
"""BC 社区一:West Kootenay —— **两段共用**:本段的抽取器登记 + quota 段的直连补抓社区二。
批L 溶解改动:原住 quota 段(直连补抓专用),抽取器登记需要同一个名,移进本族一处。"""

NOS_COMMUNITY = "North Okanagan Shuswap, BC"
"""BC 社区二:North Okanagan Shuswap。"""

NEBC_COMMUNITY = "Peace Liard, BC"
"""BC 社区三:Peace Liard(官方站名 NEBC = Northeast BC)。"""

MJ_COMMUNITY = "Moose Jaw, SK"
"""草原社区一:Moose Jaw。"""

CL_COMMUNITY = "Claresholm, AB"
"""草原社区二:Claresholm —— **两段共用**:本段的抽取器登记 + quota 段的直连补抓社区一。
批L 溶解改动:同 WK_COMMUNITY,原住 quota 段,移进本族一处。"""

SB_COMMUNITY = "Steinbach, MB"
"""草原社区三:Steinbach。"""

AL_COMMUNITY = "Altona/Rhineland, MB"
"""草原社区四:Altona/Rhineland。"""

BR_COMMUNITY = "Brandon, MB"
"""草原社区五:Brandon。"""

PICTOU_COMMUNITY = "Pictou County, NS"
"""大西洋社区:Pictou County(本域唯一一个大西洋社区)。"""

# =========================================================================
# 6. ON 五社区抽取(North Bay / Sudbury / Timmins / Sault Ste. Marie / Thunder Bay)
# =========================================================================

ON_DOC = """on.py — ON 五社区指定雇主/优先职业抽取器(E6-11 批C,2026-08-15)。

社区(键=rcip-communities.json 官方名)与源:
  North Bay and Area       雇主=admin-ajax load_monday_data 实时源;职业=nbrcip.ca/employers/ NOC 表
  Sudbury, ON              雇主+职业同页 vc_tta 面板,RCIP/FCIP 逐行 type
  Timmins, ON              雇主=immigration 页内链的 Designated-Employer-List PDF(pilot 列逐行归 type,
                           空白= RCIP+FCIP);职业=同页 elementor RCIP/FCIP 两栏
  Sault Ste. Marie, ON     雇主=designated-employers 页 <p> 列表;职业=rcip_employer 页分 sector 表
                           (Sales and Services 官方空栏 → sectorOnly)
  Thunder Bay, ON          雇主=页内「List of Designated Employers」PDF,y 聚簇双列;
                           「Business Designated, but currently excluded from 2026」段剔除,红字 not-hiring 保留

批E 拆分改动(2026-08-31,pilot 拆三域):第六个社区 "Superior East Region, ON" 是**纯法语试点**,
连同 SE_EMP_URL / SE_OCC_URL 两常量与 superior_east() 整体搬去 etl/fcip/extractors/on.py
(函数体一字未改);共用私件 _get/_clean/_cut_note 两域各留一份(常量各域自抄先例,
改一边记得改另一边)。**Sudbury/Timmins 两个双身份社区的抽取器留在本域**(拍板点 8-②:
IRCC 名单页两节都列它俩,抽取只做一次,产出行照旧带 RCIP / FCIP / RCIP+FCIP 逐行 type)。

红线:宁缺勿猜(excluded/de-designated 剔,拿不准的行不要);解析不到就抛异常,总控保旧。

批L 溶解改动(2026-08-31):本段 = 原 rcip/extractors/on.py 的全部常量;UA / TIMEOUT
两个抄本并进第 1 段(UA_CHROME126 / TIMEOUT_S),`<[^>]+>` 抄本并进第 1 段 TAG_RE,
其余常量名一字未改(私件的 `_` 前缀名随函数退役,见 functions 第 6 段)。"""
"""本段的社区与源(原 rcip/extractors/on.py 文件头,逐字折进)。"""

LI_RE = re.compile(r"<li>(.*?)</li>", re.S)
"""列表项(Timmins 职业块与 Thunder Bay 职业块共用同一条,值一字未改)。"""

NOC_LINE_RE = re.compile(r"(\d{5})\s+(.+)")
"""「12345 职业名」的整行(Timmins / Thunder Bay 两处共用)。"""

NOTE_DASH_RE = re.compile(r"\s[–—-]\s")
"""职业名里的破折段分隔(空格夹破折号)—— cut_note 的分段器与 Thunder Bay 的截附注共用。"""

NOTE_JOIN = " - "
"""cut_note 保留下来的小写延续段的重接符(官方 NOC 名内部的破折段)。"""

NOTE_STAR = "*"
"""职业名尾注星号(cut_note 一并剥掉)。"""

NB_EMP_URL = "https://nbrcip.ca/designated-employers/"
"""North Bay 雇主名单的**出处页**(名单本身走 admin-ajax 实时源,url 记这页给人看)。"""

NB_AJAX = "https://nbrcip.ca/wp-admin/admin-ajax.php"
"""North Bay 的 WordPress admin-ajax 实时源(雇主名单的真身)。"""

NB_OCC_URL = "https://nbrcip.ca/employers/"
"""North Bay 优先职业表所在页。"""

P_ACTION = "action"
"""admin-ajax 的查询参数名(P_ 查询参数词族)。"""

NB_AJAX_ACTION = "load_monday_data"
"""North Bay admin-ajax 的 action 值(站方给雇主表挂的 handler 名)。"""

NB_OCC_ANCHOR = 'id="occupation-table"'
"""North Bay 职业表的锚(找不到即页面改版,抛异常保旧)。"""

NB_OCC_ROW_RE = re.compile(r"<tr>\s*<td>(\d{5})</td>\s*<td>(.*?)</td>", re.S)
"""North Bay 职业表的一行:NOC 码 + 职业名。"""

NB_NO_TABLE = "North Bay: occupation-table 不见了"
"""North Bay 职业表锚缺失的异常说法。"""

NB_SHORT_TPL = "North Bay: employers={emp} occupations={occ}"
"""North Bay 任一份为空的异常说法(两份都得有,缺一即抛)。"""

SUD_URL = "https://investsudbury.ca/why-sudbury/newcomers/rcipfcip/"
"""Sudbury 的 RCIP/FCIP 页(雇主与职业同页两个面板)。"""

SUD_PANEL_RE = re.compile(r'<span class="vc_tta-title-text">(RCIP|FCIP)</span>')
"""Sudbury 页的面板标题(RCIP / FCIP)—— 用它 split 出逐面板正文,行级 type 由此而来。"""

SUD_OCC_RE = re.compile(r"<p>(\d{5})\s*(?:&#8211;|&#8212;|[–—-])\s*(.*?)</p>", re.S)
"""Sudbury 面板里的职业行「<p>12345 – 职业名</p>」(破折号三种实体/字符都认)。"""

SUD_BOX_RE = re.compile(r'<div class="employer_box_content">(.*?)</div></div>', re.S)
"""Sudbury 面板里的一个雇主卡片。"""

SUD_NAME_RE = re.compile(r"<h5[^>]*>(.*?)</h5>", re.S)
"""雇主卡片里的名字。"""

SUD_ADDR_RE = re.compile(r"<p[^>]*>(.*?)</p>", re.S)
"""雇主卡片里的地址(没有就空串)。"""

SUD_EMP_ANCHOR = 'id="employers"'
"""Sudbury 雇主段的起点锚。"""

SUD_JOBS_ANCHOR = "Find a job"
"""Sudbury 雇主段的终点锚(再往后是找工作的导航块,不是名单)。"""

DIV_CLOSE = "</div>"
"""div 结束标签(Sudbury 职业段截到这为止)。"""

SUD_NO_BOUNDS = "Sudbury: employers 段边界不见了"
"""Sudbury 雇主段边界锚缺失的异常说法。"""

SUD_SHORT_TPL = "Sudbury: employers={emp} occupations={occ}"
"""Sudbury 任一份为空的异常说法。"""

TM_PAGE = "https://timminsedc.com/immigration/"
"""Timmins 的移民页(雇主 PDF 链接与职业两栏都在这)。"""

TM_PDF_HREF_RE = re.compile(r'href="(https?://[^"]*Designated-Employer-List[^"]*\.pdf)"')
"""Timmins 页内的雇主名单 PDF 链接(文件名带日期,官方换版即换名,故动态发现)。"""

TM_NO_PDF = "Timmins: 页内找不到 Designated-Employer-List PDF 链接"
"""Timmins PDF 链接缺失的异常说法。"""

TM_HDR_RE = re.compile(r"List of Designated|Timmins Regional Rural|following employers|"
                       r"Immigration Pilot \(|Timmins and surrounding|Priority Sector|"
                       r"Employer.s Legal|Pilot Designated|^Under$|Updated as of", re.I)
"""Timmins PDF 的页眉/表头/说明句(命中即不是雇主行,剔除)。"""

TM_TAB_TITLE_RE = re.compile(r"elementor-tab-title[^>]*>(?:<a[^>]*>)?\s*(RCIP|FCIP)\s*<")
"""Timmins 职业块前面的 elementor 标签页标题(RCIP / FCIP),定该块职业行的 type。"""

TM_OCC_BLOCK_RE = re.compile(r"Priority Occupations:?</strong></p>\s*<ul>(.*?)</ul>", re.S)
"""Timmins 的一个职业块(标题后紧跟的 ul)。"""

TM_NO_TABS = "Timmins: 职业块前找不到 RCIP/FCIP 标签"
"""Timmins 职业块定不了 type 的异常说法(宁缺勿猜:定不了就抛,不默认一个)。"""

TM_SHORT_TPL = "Timmins: employers={emp} occupations={occ}"
"""Timmins 任一份为空的异常说法。"""

TM_X_NAME_MIN = 170
"""Timmins PDF 三列版式:雇主名列的左边界(x<170 是 sector 列,不要)。"""

TM_X_PILOT_MIN = 440
"""Timmins PDF 三列版式:pilot 列的左边界(x>=440)。"""

TM_Y_TOL = 3
"""同一视觉行的 y 容差(pt):pilot 值按 ±3 归到该雇主。"""

TM_CONT_NAME = "Residence"
"""Timmins PDF 里唯一一处换行续名(批B 实测仅此一例):这一格接到上一行名字后面。"""

TM_NOT_HIRING_RE = re.compile(r"\s*\[not hiring\]", re.I)
"""雇主名后的在招状态注记(『指定』≠『在招』,注记剥掉、行保留)。"""

TM_NON_ALPHA_RE = re.compile(r"[^A-Z]")
"""pilot 列取值时的杂字符(只留大写字母再比对 RCIP/FCIP)。"""

TM_PILOT_CODES = ("RCIP", "FCIP")
"""Timmins PDF 的 pilot 列认得的两个码;都不是(含空白)= 两试点均可 → CTYPE_BOTH。"""

K_PILOT = "pilot"
"""Timmins PDF 中间产物的行键:该雇主所属试点(空 = 两试点均可)。"""

SSM_EMP_URL = "https://welcometossm.com/designated-employers/"
"""Sault Ste. Marie 的指定雇主页。"""

SSM_OCC_URL = "https://welcometossm.com/rcip_employer/"
"""Sault Ste. Marie 的分行业职业表页。"""

SSM_BLOCK_RE = re.compile(r'<div class="fl-rich-text">(.*?)</div>', re.S)
"""SSM 页的富文本块(名单在其中最长的一个里)。"""

SSM_P_OPEN_RE = re.compile(r"<p>")
"""段落开标签(数哪个富文本块的 <p> 最多 = 名单块)。"""

SSM_P_RE = re.compile(r"<p>(.*?)</p>", re.S)
"""名单块里的一行(一个 <p> 一家雇主)。"""

SSM_NO_BLOCK = "SSM: fl-rich-text 块不见了"
"""SSM 名单块缺失的异常说法。"""

SSM_NAME_MAX = 120
"""雇主名的长度上限:超过它必是说明段落,不是名字。"""

SSM_SKIP_RE = re.compile(r"designation of employers|please note", re.I)
"""SSM 名单块里的免责说明段(剔除)。"""

SSM_NOT_HIRING_RE = re.compile(r"\s*\(not currently hiring\)", re.I)
"""在招状态注记(剥掉;指定状态保留,在招与否不影响)。"""

SSM_YEAR_NOTE_RE = re.compile(r"\s*\(2025\)\s*$")
"""名字尾巴的「(2025)」= 指定年份注记,剥掉。"""

SSM_MIN_EMP = 50
"""SSM 雇主行数下限(官方 150+ 量级;低于它即疑页面改版,抛异常保旧)。"""

SSM_SHORT_TPL = "SSM: 雇主仅 {n} 行,疑似页面改版"
"""SSM 雇主塌方的异常说法。"""

SSM_SECTOR_RE = re.compile(r'<h2 class="sector-title">([^<]+)</h2>')
"""SSM 职业页的行业标题(按它 split 成逐行业的段)。"""

SSM_PAIR_RE = re.compile(r'>(\d{5})</a>\s*</td>\s*<td class="occupation">([^<]+)<')
"""SSM 行业段里的一条职业(NOC 码 + 职业名)。"""

SSM_EMPTY_SECTOR = "No occupations currently listed"
"""SSM 官方给的空行业说法一(该行业只给名字,不给 NOC → sectorOnly)。"""

SSM_EMPTY_NOTE = "empty-sector-note"
"""SSM 官方给的空行业说法二(页面上的 css 类名)。"""

SSM_NO_OCC = "SSM: 职业表不见了"
"""SSM 职业表整表缺失的异常说法。"""

TB_PAGE = "https://gotothunderbay.ca/rural-community-immigration-pilot-rcip/"
"""Thunder Bay 的 RCIP 页(雇主 PDF 链接与职业清单都在这)。"""

TB_LINK_HINT = "List of Designated Employers"
"""Thunder Bay 的 PDF 认定词:链接**之后**的一小段正文里出现它,才是名单 PDF。"""

TB_LINK_WINDOW = 400
"""往链接后面看多少字找 TB_LINK_HINT。"""

TB_NO_PDF = "Thunder Bay: 页内找不到 List of Designated Employers PDF 链接"
"""Thunder Bay PDF 链接缺失的异常说法。"""

TB_SKIP_RE = re.compile(r"Designated Employer|updated on an ongoing|listed in red|AS OF|"
                        r"check back regularly|currently.?\s*not hiring|^not hiring\.$", re.I)
"""Thunder Bay PDF 的页眉/说明行(命中即剔;红字 not-hiring 的**雇主行**不在此列,保留)。"""

TB_EXCL_RE = re.compile(r"Business Designated, but currently excluded|^RCIP$", re.I)
"""排除段的段首:命中之后的行整段剔除(『指定但本年度排除』不算当前指定雇主)。"""

TB_PATCH = {
    "Baywood Dental": "131 East Avenue, Thunder Bay",
    "Bennett's Bakery": "899 Tungsten St, Thunder Bay; 400 Balmoral St, Thunder Bay; "
                        "801 Red River Road, Thunder Bay",
    "DELTA HOTELS": "2240 Sleeping Giant Parkway, Thunder Bay",
    "Denkymax": "59 Court Street N, Thunder Bay & 220 May Street N, Thunder Bay",
    "Equipment World Inc.": "988 Alloy Drive, Thunder Bay",
    "Fat Panda": "1100 Memorial Ave.#3, Thunder Bay, Arthur St W, Thunder Bay / "
                 "843 Red River Road unit 11 Thunder Bay",
    "RUGGEDAIR": "710 NORAH CRES THUNDER BAY",
    "RUNA PACHA": "1000 Fort William Rd, Unit 46C Intercity Shopping Centre, Thunder Bay",
    "Guac Mexi Grill": "445 Hodder Ave, Thunder Bay",
    "Hodder Avenue Confectionary": "1. 2013 Arthur St. E, Thunder Bay 2. 825 Red River Road "
                                   "3. 319 Cumberland St. 4. 931 Ft. William Rd",
    "KFC / Taco Bell": "588 Arthur St West, Thunder Bay, On, P7E5R7 / "
                       "843 Red River Road, Thunder Bay",
}
"""双列版式错位的手工校正(对照 As-of-August-13-2026.pdf 逐条核过;换版后名字对不上则自动跳过)。"""

TB_X_SPLIT = 290
"""Thunder Bay PDF 双列版式的分界 x:左=名字,右=地址。"""

TB_Y_TOL = 3
"""同一视觉行的 y 容差(pt):±3 内的片段聚成一簇。"""

K_Y = "y"
"""Thunder Bay 聚簇中间产物的键:该簇的 y 坐标。"""

K_ITEMS = "items"
"""Thunder Bay 聚簇中间产物的键:该簇的 (x, 文字) 片段清单。"""

K_EXCLUDED = "_ex"
"""Thunder Bay 中间产物的键:这一行是不是落在排除段里(落盘前整批滤掉)。"""

TB_ALLEN_PREFIX = "Allen Equipment Contracting"
"""版式事故一:名列里印了 Allen 的地址,导致两家被并成一行 —— 靠这个前缀认出来。"""

TB_ALLSTATE_MARK = "Allstate"
"""版式事故一的另一半(同一行里还有 Allstate,两条件同时成立才拆)。"""

TB_ALLEN_NAME = "Allen Equipment Contracting Corporation- Allen Contracting Corp"
"""拆出来的第一家(名字照 PDF 原文)。"""

TB_ALLEN_LOC = "36 Rubin Dr, Murillo"
"""拆出来的第一家的地址(印在名列里的那个)。"""

TB_ALLSTATE_NAME = "Allstate Insurance Company of Canada"
"""拆出来的第二家(地址沿用原行右列)。"""

TB_SOVEREIGN = "Sovereign Dental"
"""版式事故二:两家同名 Sovereign Dental,第二家的地址印在名行上方。"""

TB_SOVEREIGN_LOC1 = "2& 3-1101 Arthur St W, Thunder Bay"
"""Sovereign Dental 第一家的地址(逐条核过 PDF)。"""

TB_SOVEREIGN_LOC2 = "911 Fort William Rd #3, Thunder Bay, & 1101 Arthur St W Thunder Bay"
"""Sovereign Dental 第二家的地址。"""

TB_SOVEREIGN_PAIR = 2
"""校正只在**恰好两家**同名时执行(多了少了都说明换版,不猜)。"""

UL_OPEN_RE = re.compile(r"<ul[\s>]")
"""无序列表的开标签(找职业块的起点)。"""

UL_TAG_RE = re.compile(r"<(/?)ul[\s>]")
"""无序列表的开/闭标签(嵌套计深,配对到自己那个 </ul>)。"""

TB_NO_OCC = "Thunder Bay: Priority Occupations 段不见了"
"""Thunder Bay 职业段锚缺失的异常说法。"""

TB_SHORT_TPL = "Thunder Bay: employers={emp} occupations={occ}"
"""Thunder Bay 任一份为空的异常说法。"""

# =========================================================================
# 7. BC 三社区抽取(West Kootenay / North Okanagan Shuswap / Peace Liard)
# =========================================================================

BC_DOC = """bc — BC 三社区指定雇主/优先职业抽取(E6-11 批C,2026-08-15)。

社区与源(批B 2026-08-15 实测基线:雇主 263/450/0,职业各 25):
  West Kootenay, BC          雇主=官方公示页 html(accordion 表格,剔 De-designated 段);职业=priorities 页表格
  North Okanagan Shuswap, BC 雇主=官方 PDF(Resources and Policies 页动态发现链接,每月更新);职业=priority-sectors-nocs 页表格
  Peace Liard, BC            雇主=candidates 页链接的官方 PDF(批B 时官方待公示,2026-08 已公示 280 家);
                             职业=priority-occupations 页 Wix Table Master 组件挂接的官方 CSV(组件配置不在页 html 里,URL 只能照抄)

批E 拆分改动(2026-08-31,pilot 拆三域):第四个社区 Kelowna, BC 是**纯法语试点**,
连同它的 KEL_URL 常量与 kelowna() 整体搬去 etl/fcip/extractors/bc.py(函数体一字未改);
本文件共用私件 _get/_text/_dedupe 两域各留一份(常量各域自抄先例,改一边记得改另一边)。

约定:剔 de-designated;not-hiring 保留(『指定』≠『在招』);宁缺勿猜 —— 结构对不上就抛异常,总控保旧。

批L 溶解改动(2026-08-31):本段 = 原 rcip/extractors/bc.py 的全部常量;UA / TIMEOUT
两抄本并进第 1 段,`href="…pdf"` 与 `\\d{5}` 两条与 ON 段同值的正则并进第 1 段
(PDF_HREF_RE / NOC5_RE),其余常量名一字未改。"""
"""本段的社区与源(原 rcip/extractors/bc.py 文件头,逐字折进)。"""

WK_EMP_URL = "https://westkootenayimmigration.ca/designated-employers/"
"""West Kootenay 的指定雇主公示页。"""

WK_OCC_URL = "https://westkootenayimmigration.ca/priorities/"
"""West Kootenay 的优先职业页。"""

WK_LIST_START = "Designated Employer List"
"""West Kootenay 名单区的起点锚(h2 标题)。"""

WK_LIST_END = "De-designated Employers"
"""West Kootenay 名单区的终点锚 —— 之后是**已撤销指定**的雇主,一律不要。"""

WK_NO_BOUNDS = "WK 雇主页结构变了:找不到名单/De-designated 分界"
"""West Kootenay 分界锚缺失的异常说法(标记缺失=改版,抛)。"""

WK_TD_RE = re.compile(r"<td>(.*?)</td>", re.S)
"""West Kootenay 名单区里的一格。"""

WK_HEADER_MARK = "<strong>"
"""表头格(「Employer Name」)的标志,命中即跳过。"""

WK_LOC_SEP = ","
"""West Kootenay 一格里「名字, 地点」的分隔符(只切第一个逗号)。"""

WK_TR_RE = re.compile(r"<tr>(.*?)</tr>", re.S)
"""West Kootenay 职业表的一行。"""

WK_TD_ANY_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.S)
"""职业表一行里的各格(带属性的 td 也认)。"""

WK_NEW_MARK = "(new)"
"""职业名里的「(new)」标注,剥掉。"""

NOS_RES_URL = "https://rcipnorthokanaganshuswap.com/resources-and-policies/"
"""North Okanagan Shuswap 的资料页(每月换版的雇主 PDF 链接在这)。"""

NOS_OCC_URL = "https://rcipnorthokanaganshuswap.com/priority-sectors-nocs/"
"""North Okanagan Shuswap 的优先行业/职业页。"""

NOS_PDF_HINT = "Designated-Employer-List"
"""认雇主 PDF 的文件名片段(页里还有别的 PDF)。"""

NOS_NO_PDF = "NOS Resources 页找不到 Designated-Employer-List PDF 链接"
"""NOS 雇主 PDF 链接缺失的异常说法。"""

NOS_SECTOR_STARTS = {
    "Business, Finance and Administration",
    "Health",
    "Education, Law and Social, Community",
    "Sales and Services",
    "Trades and Transport",
    "Manufacturing and Utilities",
}
"""行业名(=行业列里每个雇主行的首行;Education 一条在 PDF 里固定折成两行,首行如上)。"""

NOS_NAMECOL_SKIP = {"rcip nos", "designated employer list", "business legal name"}
"""名列里的页眉/表头(**全小写比对**),命中即跳过。"""

NOS_X_SPLIT = 260
"""NOS PDF 两列版式的分界 x:左=行业列,右=雇主名列。"""

NOS_Y_TOL = 1
"""名列同一视觉行被拆成多个同 y 碎片时的聚合容差(pt)。"""

NOS_DY_ORDER = (0, -1, 1)
"""找同行行业名时的 y 偏移顺序:先本行,再上一行,再下一行(PDF 折行导致的错位)。"""

NOS_DATE_RE = re.compile(r"[A-Z][a-z]+ \d{1,2}, \d{4}")
"""名列里的换版日期行(「August 13, 2026」),不是雇主名,跳过。"""

NOS_MISMATCH_TPL = "NOS PDF 对不齐:行业行 {starts} vs 雇主名 {parts}"
"""行业行数与雇主名数对不上的异常说法 —— 对不齐即解析漏行,宁可抛也不产半份。"""

NOS_OCC_RE = re.compile(r">(\d{5})</a>\s*(?:–|-|&#8211;)\s*(.*?)</td>", re.S)
"""NOS 职业表的一格:「<a>12200</a> – Accounting technicians and bookkeepers」。"""

NFKC_FORM = "NFKC"
"""PDF 文本归一的 unicodedata 档位(合字还原 ﬂ→fl)。"""

NEBC_CAND_URL = "https://www.nebcimmigration.ca/candidates"
"""Peace Liard(NEBC)的候选人页,雇主名单 PDF 链接在这。"""

NEBC_OCC_URL = "https://www.nebcimmigration.ca/priority-occupations"
"""Peace Liard 的优先职业页(表格是 Wix 组件,页 html 里没有数据)。"""

NEBC_OCC_CSV = ("https://docs.google.com/spreadsheets/d/e/2PACX-1vQhjYZovjoLZlxWckFJpgPTCpbQeuC2PXew"
                "0SS71Oxil218Y8T0SOxIAOAT5MrtFhFQh5lDRLl9lV-8/pub?output=csv")
"""Peace Liard 职业表的真身 CSV —— Wix Table Master 组件的配置不在页 html 里,URL 只能照抄。"""

NEBC_A_RE = re.compile(r'<a[^>]+href="([^"]+)"[^>]*>((?:(?!</a>).)*)</a>', re.S)
"""页内链接(地址 + 锚文本;锚文本要拿来认名单 PDF)。"""

NEBC_PDF_MARK = ".pdf"
"""认 PDF 的地址片段。"""

NEBC_ANCHOR_HINT = "Designated Employer"
"""认名单 PDF 的锚文本片段。"""

NEBC_PENDING_RE = re.compile(r"will be posted|when available")
"""官方「待公示」的明文 —— 命中即空名单(基线 0 放行),不是解析失败。"""

NEBC_NO_LIST = "NEBC candidates 页既无名单 PDF 也无『待公示』字样 —— 疑似改版"
"""两条路都不通时的异常说法。"""

BOM = "﻿"
"""CSV 首字节的 BOM(读前剥掉)。"""

NEBC_X_NUM = 70
"""NEBC PDF 三列版式:行号列的右边界(x<70)。"""

NEBC_X_LEGAL = 300
"""NEBC PDF 三列版式:法定名列与 Operating As 列的分界 x。"""

NEBC_PAGE_RE = re.compile(r"Page \d+")
"""页脚的页码行,跳过。"""

K_LEGAL = "legal"
"""NEBC 中间产物的行键:法定名(Legal Name 列的各片段)。"""

K_OA = "oa"
"""NEBC 中间产物的行键:经营名(Operating As 列的各片段)。"""

NEBC_NAME_TPL = "{legal} ({oa})"
"""两名不同时的雇主名写法(法定名 + 括号里的经营名)。"""

NEBC_NORM_RE = re.compile(r"[^a-z0-9]")
"""比对两名是否同一个时的归一(只留小写字母数字)。"""

NEBC_TOTAL_RE = re.compile(r"(\d+)\s+Designated Employers")
"""PDF 自带的总数(「As of … • N Designated Employers」),拿来对账。"""

NEBC_MISMATCH_TPL = "NEBC PDF 自称 {claim} 家,实际解析 {n} 家"
"""对账对不上的异常说法(解析漏行,抛异常保旧)。"""

# =========================================================================
# 8. 草原五社区抽取(Moose Jaw / Claresholm / Steinbach / Altona-Rhineland / Brandon)
# =========================================================================

PRAIRIE_DOC = """prairie — 草原区 5 社区(SK/AB/MB)指定雇主+优先职业抽取(E6-11 批C,2026-08-15)。

社区与源(批B 实测口径;基线 雇主 147/23/42/23/39,职业 25~27):
  Moose Jaw, SK        雇主=官方 PDF(/candidates/ 页发现链接,原件重复段去重) 职业=/employers/ 页表格
  Claresholm, AB       单页站:雇主 <li>(HIRING/NOT HIRING 状态行一律保留) 职业=行业绑定行(同 NOC 可多行)
  Steinbach, MB        雇主=官方 PDF(/rcip/ 页发现链接) 职业=/rcip/ 页 <p> 行(移动/桌面双份渲染,去重)
  Altona/Rhineland, MB 雇主/职业=两张 eael 数据表(td-content 单元格)
  Brandon, MB          雇主=两列名单表(逐家备注列忽略) 职业=优先表 NOC 链接锚文本

批E 拆分改动(2026-08-31,pilot 拆三域):第六个社区 "St. Pierre Jolys, MB" 是**纯法语试点**,
连同 _SP_HOME / _SP_OCC_URL 两常量与 st_pierre_jolys() 整体搬去 etl/fcip/extractors/prairie.py
(函数体一字未改);共用私件 _aia_context/_get/_pdf/_tidy/_clean/_find_pdf_url/_require
两域各留一份(常量各域自抄先例,改一边记得改另一边)。

红线:宁缺勿猜 —— NOC 必须 5 位数字;解析为 0 行直接抛异常,总控(build_pilot_details)保旧。

批L 溶解改动(2026-08-31):本段 = 原 rcip/extractors/prairie.py 的全部常量;UA / TIMEOUT
两抄本并进第 1 段,_CL_URL 与 quota 段的 CL_URL 同值并成一处(第 1 段),
`_` 前缀常量名随溶去前缀(_MJ_NOTICE → MJ_NOTICE_RE 等,见下逐条),值一字未改。"""
"""本段的社区与源(原 rcip/extractors/prairie.py 文件头,逐字折进)。"""

PRAIRIE_DASH = r"[–—-]"
"""官方页 en/em dash 与连字符混用 —— 本段各正则的破折号片段(原 _DASH)。"""

HTTPS_PORT = 443
"""AIA 补链探测的默认端口(URL 没写端口时)。"""

CERT_FAIL_MARK = "CERTIFICATE_VERIFY_FAILED"
"""证书校验失败的错误串 —— 只有它才走 AIA 补链重试,别的连接错照抛。"""

CA_ISSUER_RE = re.compile(rb"http://[\x21-\x7e]+?\.(?:crt|cer|der|pem)")
"""叶证书里的 CA Issuers 下载地址(二进制扫,证书是 DER)。"""

PEM_MARK = b"BEGIN CERTIFICATE"
"""下下来的中间证书是不是已经是 PEM(否则按 DER 转)。"""

ASCII = "ascii"
"""证书地址/PEM 文本的编码(证书里这些串都是 ASCII)。"""

AIA_FAIL_TPL = "{host}: 叶证书无可用 CA Issuers URL,无法补链"
"""补链无源时的异常说法 —— **绝不 verify=False**,补不上就失败。"""

CURLY_QUOTE = "’"
"""弯引号(PDF/网页里常见)。"""

STRAIGHT_QUOTE = "'"
"""直引号 —— 归一目标(批B 底本口径,避免刷新时全量行 churn)。"""

PRAIRIE_SCRIPT_STYLE_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.S | re.I)
"""整页转文本行前先拆掉的脚本/样式块。
与 quota 段的 SCRIPT_STYLE_RE 不是同一条(那条用 `.*?` 吃属性,这条显式 `[^>]*`)——
两条各自服役,合并要重跑两边金标,不在本批内。"""

HREF_PATTERN_TPL = r'href="([^"]*(?:%s)[^"]*)"'
"""按给定 pattern 找页内链接的正则模板(PDF 链接动态发现;断行符与 PEM 拼接符用
fetch.constants.LINE_SEP,基础设施叶已有的不再自抄)。"""

PDF_LINK_FAIL_TPL = "官方页找不到 PDF 链接(pattern={pattern})"
"""动态发现 PDF 链接失败的异常说法。"""

AMP_ENTITY = "&amp;"
"""只还原这一个实体 —— 整串 unescape 会把查询串里的 &curren… 吃成 ¤(St. Pierre 实撞)。"""

AMP = "&"
"""AMP_ENTITY 的还原目标。"""

REQUIRE_FAIL_TPL = "{what} 解析 0 行 —— 源疑似改版"
"""草原各社区「解析 0 行」的统一异常说法。"""

MJ_CANDIDATES = "https://rcip.mjchamber.com/candidates/"
"""Moose Jaw 的候选人页(雇主 PDF 链接在这)。"""

MJ_OCC_URL = "https://rcip.mjchamber.com/employers/"
"""Moose Jaw 的雇主页(优先职业表在这)。"""

MJ_PDF_PATTERN = r"designated[^\"]*\.pdf"
"""Moose Jaw 雇主 PDF 的链接特征(嵌进 HREF_PATTERN_TPL;找不到时的报错也报它)。"""

MJ_PDF_RE = re.compile(HREF_PATTERN_TPL % MJ_PDF_PATTERN, re.I)
"""Moose Jaw 雇主 PDF 的链接正则(原 _find_pdf_url 每次现编,溶进来后预编译)。"""

MJ_NOTICE_RE = re.compile(
    r"important notice|use the rcip|already employed|accepting new application|mass email"
    r"|best way to participate|actively advertised|match your skills|successful applicants"
    r"|secure local employment|supported for designation", re.I)
"""PDF 顶部的告示段(勿群发邮件等),按关键词剔行。"""

MJ_NOTE_MARK = "**"
"""告示行的另一种起头,剔除。"""

MJ_MAX_WORDS = 8
"""雇主名最长 5~6 词,≥8 词的行必是正文句,剔除。"""

MJ_OCC_ROW_RE = re.compile(r"<td[^>]*>\s*(\d{5})\s*</td>\s*<td[^>]*>(.*?)</td>", re.S)
"""Moose Jaw 职业表的一行。"""

MJ_EMP_LABEL = "Moose Jaw 雇主"
"""Moose Jaw 雇主 0 行时异常说法里的名头。"""

MJ_OCC_LABEL = "Moose Jaw 职业"
"""Moose Jaw 职业 0 行时异常说法里的名头。"""

CL_LI_RE = re.compile(r"<li[^>]*>(.*?)</li>", re.S)
"""Claresholm 单页站里的列表项(雇主行)。"""

CL_EMP_RE = re.compile(
    r"^(?P<name>.+?)\s*%s\s*\d\s*,\s*.+?\s*%s\s*(?:NOT\s+HIRING|HIRING)$"
    % (PRAIRIE_DASH, PRAIRIE_DASH), re.I)
"""Claresholm 雇主行形如「Name – 6, Sales & Services – NOT HIRING」;
状态行一律保留(不因 NOT HIRING 剔除 ——『指定』≠『在招』)。
命名组 name 是全式唯一一个捕获组,溶进来后调用点按位置取 group(1),取值一字未改。"""

CL_SECTOR_RE = re.compile(r"^\d\s*%s\s*\D" % PRAIRIE_DASH)
"""行业标题行(单位数编号)—— 命中即上一条限定语失效。"""

CL_QUALIFIER_RE = re.compile(r"^To be used by\s+(.+?)\s*:$", re.I)
"""「To be used by X:」限定语,并入随后各行的职业名。"""

CL_OCC_RE = re.compile(r"^(\d{5})\s*%s\s*(.+)$" % PRAIRIE_DASH)
"""Claresholm 职业行(行业绑定,同 NOC 可多行)。"""

CL_QUALIFIER_TPL = " ({qualifier})"
"""限定语并进职业名的写法。"""

CL_EMP_LABEL = "Claresholm 雇主"
"""Claresholm 雇主 0 行时异常说法里的名头。"""

CL_OCC_LABEL = "Claresholm 职业"
"""Claresholm 职业 0 行时异常说法里的名头。"""

SB_URL = "https://steinbachedc.com/rcip/"
"""Steinbach 的 RCIP 页(雇主 PDF 链接与职业行都在这)。"""

SB_OCC_URL = SB_URL + "#priority"
"""职业清单的出处(同一页的锚点,产出行的 url 记到段级)。"""

SB_PDF_PATTERN = r"designated[-_ ]?employers[^\"]*\.pdf"
"""Steinbach 雇主 PDF 的链接特征(嵌进 HREF_PATTERN_TPL)。"""

SB_PDF_RE = re.compile(HREF_PATTERN_TPL % SB_PDF_PATTERN, re.I)
"""Steinbach 雇主 PDF 的链接正则(预编译,同 MJ_PDF_RE)。"""

SB_SKIP_RE = re.compile(r"steinbachedc\.com|list of designated employers|reimer ave", re.I)
"""PDF 里的页眉/联系方式行,剔除。"""

SB_DASH_FIX_RE = re.compile(r" -(?=[A-Za-z])")
"""PDF 排版伪影「Manitoba Health -Health…」:连字号右侧缺空格。"""

SB_DASH_FIX_TO = " - "
"""伪影的补齐写法(两侧各一个空格)。"""

SB_OCC_RE = re.compile(r"<p>\s*(\d{5})\s*(?:&#8211;|%s)\s*(.*?)\s*</p>" % PRAIRIE_DASH, re.S)
"""Steinbach 职业行(/rcip/ 页移动/桌面两个 tab 各渲染一次,按 (noc,title) 有序去重)。"""

SB_EMP_LABEL = "Steinbach 雇主"
"""Steinbach 雇主 0 行时异常说法里的名头。"""

SB_OCC_LABEL = "Steinbach 职业"
"""Steinbach 职业 0 行时异常说法里的名头。"""

AL_EMP_URL = "https://ared-rpga.com/immigration/rcip-employers/"
"""Altona/Rhineland 的雇主表页。"""

AL_OCC_URL = "https://ared-rpga.com/immigration/rcip-sector/"
"""Altona/Rhineland 的行业/职业表页。"""

AL_CELL_RE = re.compile(r'<div class="td-content">(.*?)</div>', re.S)
"""两张 eael 数据表的单元格(拍平成单元格流再解析)。"""

AL_EMP_LABEL = "Altona/Rhineland 雇主"
"""Altona/Rhineland 雇主 0 行时异常说法里的名头。"""

AL_OCC_LABEL = "Altona/Rhineland 职业"
"""Altona/Rhineland 职业 0 行时异常说法里的名头。"""

BR_EMP_URL = "https://economicdevelopmentbrandon.com/rcip/rcip-list-of-designated-employers"
"""Brandon 的指定雇主名单页(证书链要 AIA 补链的就是这站)。"""

BR_OCC_URL = "https://economicdevelopmentbrandon.com/rcip/rcip-sector-labour-market-priorities-list"
"""Brandon 的行业/职业优先表页。"""

BR_TABLE_RE = re.compile(r"<table[^>]*>(.*?)</table>", re.S)
"""Brandon 页里的表格(名单表是**第一个**含 BR_LIST_MARK 的)。"""

BR_LIST_MARK = "Designated Employers"
"""认名单表的表内文字。"""

BR_TR_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S)
"""名单表的一行。"""

BR_TD_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.S)
"""名单表一行里的各格(首列=雇主名;次列逐家备注按拍板忽略,行保留)。"""

BR_HEADER_NAME = "designated employers"
"""表头行的名字(**全小写比对**),跳过。"""

BR_OCC_RE = re.compile(r"NOCProfile\?code=\d+[^>]*>\s*(\d{5})\s*%s\s*([^<]+)</a>" % PRAIRIE_DASH)
"""Brandon 职业表里的 NOC 链接锚文本。"""

BR_EMP_LABEL = "Brandon 雇主"
"""Brandon 雇主 0 行时异常说法里的名头。"""

BR_OCC_LABEL = "Brandon 职业"
"""Brandon 职业 0 行时异常说法里的名头。"""

# =========================================================================
# 9. 大西洋一社区抽取(Pictou County)
# =========================================================================

ATL_DOC = """批C(E6-11):Atlantic 社区名单抽取器。

社区(键=raw/rcip/rcip-communities.json 的官方名):
  - "Pictou County, NS"        — RCIP,站 pcrcip.ca(雇主=官方 PDF,职业=首页列表)

批E 拆分改动(2026-08-31,pilot 拆三域):第二个社区 "Acadian Peninsula, NB" 是
**纯法语试点(FCIP/PPICF)**,连同 ACAD_PAGE_URL / _ACAD_HEADER_PREFIXES 两常量与
acadian_peninsula() 整体搬去 etl/fcip/extractors/atl.py(函数体一字未改);
共用私件 _fetch/_pdf_lines/_clean 两域各留一份(常量各域自抄先例,改一边记得改另一边)。
社区名单文件同批一分为二:rcip-communities.json / fcip-communities.json。

红线:宁缺勿猜 —— 解析不到的行直接丢;数量掉出下限抛异常,总控保旧。
PDF 链接不写死文件名(官方按日期换版),每次从页面重新发现最新版。

批L 溶解改动(2026-08-31):本段 = 原 rcip/extractors/atl.py 的全部常量;UA_HEADERS 拆成
第 1 段的 UA_CHROME126 + 本段的 HDR_ACCEPT_LANGUAGE / ATL_ACCEPT_LANG(头名归 HDR_ 词族),
超时 60 并进第 1 段 TIMEOUT_S,值一字未改。"""
"""本段的社区与源(原 rcip/extractors/atl.py 文件头,逐字折进)。"""

HDR_ACCEPT_LANGUAGE = "Accept-Language"
"""语言偏好请求头名(HDR_ 头名词族)。"""

ATL_ACCEPT_LANG = "en-CA,en;q=0.9,fr-CA;q=0.8"
"""大西洋站点的语言偏好(英法双语站,给它英优先的实况值)。"""

PICTOU_HOME_URL = "https://pcrcip.ca/"
"""Pictou County 首页(职业列表在这)。"""

PICTOU_EMPLOYERS_PAGE_URL = "https://pcrcip.ca/employers/"
"""Pictou County 的雇主页(当期 PDF 链接在这,文件名含日期)。"""

PICTOU_PDF_RE = re.compile(r'href="(https?://[^"]*Designated[_-]Employers[^"]*\.pdf)"', re.I)
"""Pictou 雇主 PDF 的链接(官方换版即换名,故动态发现)。"""

PICTOU_NO_PDF = "Pictou: employers 页找不到 Designated Employers PDF 链接"
"""Pictou PDF 链接缺失的异常说法。"""

PICTOU_STATUS_VALUES = {"recruiting", "not currently recruiting"}
"""PDF 里的招聘状态行(**全小写比对**);状态行的**前一非空行**=雇主名。"""

PICTOU_STATUS_HEADER = "Status"
"""状态列的表头字,前一行是它就不是雇主名。"""

PICTOU_VALUE_RE = re.compile(r'<p class="dmach-acf-value\s*">(.*?)</p>', re.S)
"""首页 repeater 的值元素(职业与 Priority Sectors 混装,靠尾码分离)。"""

PICTOU_OCC_RE = re.compile(r"^(.+?)\s*[–—-]\s*(\d{5})$")
"""首页职业行「Title – 12345」(第 1 组=职业名,第 2 组=NOC 码)。
批L 溶解改动:原写法是命名组 (?P<title>…)/(?P<noc>…),溶进本域后改成位置组 —— 组名
与行键 K_TITLE/K_NOC 同字面会让读的人以为是同一个词汇;捕获内容与顺序一字未改。"""

PICTOU_MIN_EMP = 30
"""Pictou 雇主行数下限(官方 60 家量级),低于它即疑 PDF 版式变更。"""

PICTOU_MIN_OCC = 10
"""Pictou 职业行数下限(官方 25 条),低于它即疑首页改版。"""

PICTOU_EMP_SHORT_TPL = "Pictou: 雇主仅解析出 {n} 家,疑似 PDF 版式变更"
"""Pictou 雇主塌方的异常说法。"""

PICTOU_OCC_SHORT_TPL = "Pictou: 职业仅解析出 {n} 条,疑似首页改版"
"""Pictou 职业塌方的异常说法。"""
