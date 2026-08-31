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

TAG_RE = re.compile(r"(?s)<[^>]+>")
"""HTML 标签(去 tag 取纯文本)。"""

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
CL_* / WK_* 与它们的函数)留在本域;fcip 域无直连件。"""
"""两个直连破例的举证(原行内注释,逐字折进)。"""

LIVE_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
           "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
"""直连补抓用的浏览器 UA —— **本域自留一份**:与 fetch.constants.BROWSER_UA(Chrome/131)
不是同一个串,换成那份等于换 UA,不属「行为不变」的搬运。"""

LIVE_TIMEOUT_S = 60
"""直连补抓的超时秒数。"""

CL_COMMUNITY = "Claresholm, AB"
"""直连补抓社区一:Claresholm(与 rcip-communities.json 的 name 逐字一致)。"""

CL_URL = "https://claresholm-rcip.ca/"
"""Claresholm 官网首页(月度名额写在首页)。"""

WK_COMMUNITY = "West Kootenay, BC"
"""直连补抓社区二:West Kootenay。"""

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
