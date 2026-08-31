"""
fcip 域常量 —— 域词汇表(法语社区移民试点:社区名单、指定雇主/优先职业清单、名额状态;
照 company/noc 三件套样张,段横幅三行框 + N. 编号,与 functions.py 同名同序镜像)。

沿革:2026-08-31 批E 从 pilot 域拆出(Frank「拆成三个 很少有人有法语」)。
原 pilot/constants.py 的 details / quota / communities 三段整段搬来,常量名、正则、模板、
每条 docstring 逐字随段走;**批E 拆分改动逐处如下,每处在所属常量的 docstring 里另记一段**:
  · IN_COMMUNITIES / OUT_EMP / OUT_OCC / OUT_QUOTA / OUT_COMMUNITIES 五个路径改指 paths.FCIP
    下的 fcip-* 四件(pilot-* 四件随 pilot 域退役);
  · BASELINE_EMP 只留纯法语四社区(Kelowna 52 / Acadian Peninsula 32 /
    St. Pierre Jolys 6 / Superior East Region 15),原值一字未改;
  · SLUG_TO_COMMUNITY 只留 fcip-* 4 条(rcip-* 14 条归 rcip);
  · CITY_MAP 留六条 —— 纯法语四社区 + Sudbury/Timmins 两条**与 rcip 的镜像**
    (它俩的 FCIP 行也要带 cities;改一边记得改另一边);
  · PROV_HINT 只留 Acadian / Superior East 两条;
  · 塌方哨兵单侧化:MIN_RCIP 归 rcip,本域只看 MIN_FCIP;COMM_NO_ANCHOR /
    COMM_COLLAPSE_TPL / COMM_DONE_TPL 三条文案收成只报 FCIP 一侧;TYPE_RCIP 归 rcip;
  · 直连补抓整套(LIVE_* / CL_* / WK_*)是两个 RCIP 社区的破例,全部归 rcip,本域无直连件。
常量**值**除上述拆分项外一字未改;extractors/ 私件群随本域(纯法语四社区抽取器)。

批L 溶解改动(2026-08-31):extractors/ 私件群溶进本域五件 —— 本文件新增第 5~9 段
(登记 + ON/BC/草原/大西洋四地区的常量),四个原文件头逐字存档在
EXTRACTORS_DOC / ON_DOC / BC_DOC / PRAIRIE_DOC / ATL_DOC;抽取器里数出的同值抄本
(UA×4、超时×4、去标签正则×4、<li> 正则×2、弯直引号×2)按「有重复才收」并进第 1 段共享词汇。
与 rcip 第 1 段的同名常量仍是**镜像**(两域各留一份,改一边记得改另一边)。

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

IN_COMMUNITIES = paths.FCIP / "fcip-communities.json"
"""社区名单表 —— communities 步产出、details/quota 两步读入(同一个文件;
本步自己的落盘口见第 4 段 OUT_COMMUNITIES)。
批E 拆分改动:原 paths.PILOT / "pilot-communities.json" 一分为二,本域读写 FCIP 那一半
(6 行:纯法语四社区 + 双身份的 Sudbury/Timmins)。"""

K_PROVINCE = "province"
"""行键:省码(employers/details/quota/communities 四步共用)。"""

K_NAME = "name"
"""行键:社区官方名 / 雇主名(details 的社区索引、quota 的社区对表、communities 的产出行)。"""

K_TYPE = "type"
"""行键:试点类型(RCIP / FCIP / RCIP+FCIP)。"""

K_LOCATION = "location"
"""雇主行键:地点(官方没给就空串 —— 宁缺勿猜,不拿社区名顶)。
批L 溶解改动:抽取器群溶进本域后,四社区 `{"name": …, "location": …}` 的键词汇归此。"""

K_NOC = "noc"
"""职业行键:五位 NOC 码。"""

K_TITLE = "title"
"""职业行键:职业名(官方原文,附注从句已剪)。"""

K_SECTOR_ONLY = "sectorOnly"
"""职业行键:True = 官方只给了行业名,没给 NOC 码(本域四社区实测恒 False,形状与 rcip 对齐)。"""

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

UA_CHROME126 = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
"""直连官方源的浏览器 UA —— **本域自留一份**:与 fetch.constants.BROWSER_UA(Chrome/131)
不是同一个串,换成那份等于换 UA,不属「行为不变」的搬运。

批L 溶解改动(2026-08-31):四个抽取器文件各自的 UA 抄本(on 是裸串、bc/prairie 是
{"User-Agent": …} 的 dict、atl 是带 Accept-Language 的两键 dict)溶进来后数出四份同值,
收成本常量一处 + 各段自己拼 headers;与 rcip.constants.UA_CHROME126 是**镜像**
(两域各留一份,改一边记得改另一边)。"""

TIMEOUT_S = 60
"""直连官方源的超时秒数(四段共用;原四个文件各一份 TIMEOUT=60,rcip 侧镜像同名)。"""

TAG_RE = re.compile(r"(?s)<[^>]+>")
"""HTML 标签(去 tag 取纯文本)。
批L 溶解改动:原住 quota 段(text_of_html 一个消费者),抽取器群溶进来后四段的去标签也用它
(四个抽取器文件里的 `<[^>]+>` 抄本随之退役),移进共享段。"""

LI_RE = re.compile(r"<li>(.*?)</li>", re.S)
"""列表项(Superior East 与 Kelowna 两处的雇主 <ul> 共用同一条,值一字未改)。"""

PRIORITY_OCC_ANCHOR = "Priority Occupations"
"""官方页里「优先职业」段的标题锚(Kelowna 的 Google Doc 与 St. Pierre 的职业页共用)。"""

FILETYPE_PDF = "pdf"
"""fitz.open 的 filetype 档位名(St. Pierre 与 Acadian 两处 PDF 解析共用)。"""

CURLY_QUOTE = "’"
"""弯引号(PDF/网页里常见)。"""

STRAIGHT_QUOTE = "'"
"""直引号 —— 归一目标:草原段的 tidy(批B 底本口径)与大西洋段比对页眉前的归一共用。"""

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

批E 拆分改动(2026-08-31):18 社区一分为二 —— 本域跑**纯法语四社区**,抽取器住
fcip.extractors,IN/OUT 全部改指 raw/fcip/fcip-{communities,employers,occupations}.json。
⚠ fcip-communities.json 有 6 行,另两行 Sudbury/Timmins 是双身份社区,抽取器住 rcip 域
(拍板点 8-②);本域总控在 EXTRACTORS 里查不到它俩 → got is None → 不刷新也不报警
(基线里也没有它俩),行数为 0,收尾报数把它俩记进「保旧」尾巴 —— 这是预期状态,不是塌方。
上面那段 IN/OUT 是原文件头逐字存档,路径以本段常量为准。"""
"""本步的沿革与 IN→OUT(原 build_pilot_details.py 文件头,逐字折进)。"""

OUT_EMP = paths.FCIP / "fcip-employers.json"
"""各社区官方公示的指定雇主行(原地刷新,塌方保旧)。
批E 拆分改动:原 paths.PILOT / "pilot-employers.json",本域只写纯法语四社区的行。"""

OUT_OCC = paths.FCIP / "fcip-occupations.json"
"""各社区官方优先/在收职业行(原地刷新,塌方保旧)。
批E 拆分改动:原 paths.PILOT / "pilot-occupations.json",本域只写纯法语四社区的行。"""

BASELINE_EMP = {
    "Superior East Region, ON": 15, "Kelowna, BC": 52,
    "St. Pierre Jolys, MB": 6, "Acadian Peninsula, NB": 32,
}
"""批B 基线(2026-08-15 实抽行数);哨兵 = 新抽 < 基线一半 → 疑似改版塌方,保旧。
批E 拆分改动:原 18 条里属于纯法语四社区的这四条搬来本域,数值一字未改;
其余 14 条留在 rcip.constants 同名常量。原注「Peace Liard 雇主基线 0(官方待公示):
>0 即收,不设下限」讲的是 RCIP 社区,随那 14 条留在 rcip。"""

MIN_OCC = 10
"""职业清单的行数下限(各社区都是 ~25 条量级,低于它即疑改版塌方)。
批E 拆分改动:两域各留一份原值(标量镜像,改一边记得改另一边)。"""

CTYPE_BOTH = "RCIP+FCIP"
"""同名社区双类型(Sudbury/Timmins 各有 RCIP+FCIP 两行)时的类型说法。
批E 拆分改动:双身份社区的抽取归 rcip 域(拍板点 8-②),本域的兜底表 DUAL_COMMUNITIES
是空的 —— 常量留着是为了兜底逻辑与 rcip 镜像同形,真触发不到。"""

DUAL_COMMUNITIES: tuple[str, ...] = ()
"""**双身份社区**在本域的名单:空。
IRCC 官方名单页的 Rural 与 Francophone 两节都列了 Sudbury, ON 与 Timmins, ON,
但拍板点 8-② 定了「抽取器住 rcip,fcip 不重复抽取」—— 它俩的产出行(含 type=RCIP+FCIP)
全部落在 raw/rcip/,所以本域没有需要兜底成 RCIP+FCIP 的社区。
常量留着而不是删掉:与 rcip.constants.DUAL_COMMUNITIES 镜像同形,
哪天 IRCC 改口径要在本域也抽双身份社区,填这里即可,判定逻辑一行不用改。"""

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
# 3. quota 步(FCIP 社区名额状态)
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

批E 拆分改动(2026-08-31):本域只扫 fcip-* 4 个 slug,IN/OUT 改指 raw/fcip/ 两件;
rcip-* 14 个 slug 与两个直连破例社区(Claresholm / West Kootenay,上面 LIVE_DOC 那一路)
全部归 rcip 域,本域**没有直连件**。上一版实测(2026-08-16)四站全文都不提名额 →
本域稳定产 0 行,那是「官方没写」不是「我们没抓」。
上面那段 IN/OUT 是原文件头逐字存档,路径以本段常量为准。"""
"""本步的判据与 IN→OUT(原 build_pilot_quota.py 文件头,逐字折进)。"""

IN_CRAWL = paths.DATA / "crawl"
"""crawl 役的缓存根(逐 slug 一目录:manifest.json + html_cache/)。"""

OUT_QUOTA = paths.FCIP / "fcip-quota.json"
"""社区级名额状态 + 职业满额行(每行锚定官网原句)。
批E 拆分改动:原 paths.PILOT / "pilot-quota.json",本域只写 FCIP 四社区的行(实测 0 行)。"""

MANIFEST_FILE = "manifest.json"
"""每个 crawl slug 目录下的清单文件名。"""

K_CRAWLED_AT = "crawled_at"
"""manifest 顶层键:该轮 crawl 的时间(取前 10 位作 asOf)。"""

ASOF_LEN = 10
"""从 crawled_at 里截出 ISO 日期的长度(YYYY-MM-DD)。"""

SLUG_TO_COMMUNITY = {
    "fcip-acadian": "Acadian Peninsula, NB",
    "fcip-kelowna": "Kelowna, BC",
    "fcip-st-pierre": "St. Pierre Jolys, MB",
    "fcip-superior-east": "Superior East Region, ON",
}
"""crawl slug → 社区官方名(与 fcip-communities.json 的 name 逐字一致,不然接不上既有表)。
这四行是 FCIP 四社区(RCIP 之外的独立站;首版漏挂 → 它们的缓存从没被扫过)。
2026-08-16 实测四站全文都不提名额,所以挂上去也不产行 —— 挂的是**覆盖**,不是结论。
批E 拆分改动:原表的前 14 行(rcip-*)归 rcip.constants 同名常量,本四行键值一字未改。"""

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

QUOTA_IO_TPL = "IN_CRAWL={crawl}\nIN_COMMUNITIES={comm}\nOUT={out}"
"""本步开跑时打印的 IN/OUT 路径。"""

QUOTA_SKIP_TPL = "  ! {slug}: 社区名对不上 fcip-communities.json({name})—— 跳过,不猜省份"
"""slug 对不上社区表时的留痕行。
批E 拆分改动:文案里的文件名随 IN_COMMUNITIES 从 pilot-communities.json 改成 fcip-communities.json。"""

QUOTA_ROW_TPL = "  {name:<28} {flags}"
"""逐社区的缓存扫描结果行。"""

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

QUOTA_NOTE = "RCIP 社区名额状态;每行锚定官网原句(quote+url)。空 = 官网没写,不是没有限额。"
"""pilot-quota.json 的口径说明(产物字段,逐字不改 —— 09 汇装两域并集,两边 note 必须同字)。"""

QUOTA_DONE_TPL = "\nOUT {path}  社区级 {comm} 行 / 职业满额 {occ} 行"
"""收尾报数行。"""

# =========================================================================
# 4. communities 步(FCIP 试点社区名单)
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
**h3「Francophone communities」之后到页尾**那一节(FCIP 6 个,含双身份的 Sudbury/Timmins),
OUT 改指 raw/fcip/fcip-communities.json;Rural 那一节归 rcip 域同名步。
本域**只需要 Francophone 一个锚**(它是段起点,段终点是页尾),所以缺锚文案也随之单侧化。"""
"""本步的口径与 IN→OUT(原 build_pilot_communities.py 文件头,逐字折进)。"""

IN_MANIFEST = paths.CRAWL / "fed-rcip" / "manifest.json"
"""fed-rcip crawl 役的页清单(官方名单页的缓存入口)。
批E 拆分改动:名单页是同一页(Rural 与 Francophone 两节同页),所以 manifest 入口
与 rcip.constants 同名常量是**镜像**,两域各读一次、各解析各的节。"""

OUT_COMMUNITIES = IN_COMMUNITIES
"""本步的落盘口 —— 与第 1 段 IN_COMMUNITIES 是同一个文件,两个名字说的是本步的角色
(communities 写、details/quota 读)。"""

ERRORS_REPLACE = "replace"
"""读 IRCC 缓存 html 的容错模式:坏字节替换不炸(与 employers/quota 那两处的 ignore
不是一档 —— 原脚本各写各的,收拢时不并,免得悄悄改了正文)。"""

COMM_PAGE_SUFFIX = "rural-franco-pilots.html"
"""官方名单页在 manifest 里的 URL 尾巴。"""

RE_FRANCO_H3 = re.compile(r"<h3[^>]*>\s*Francophone communities\s*</h3>")
"""「Participating communities」节里 FCIP 的 h3 标题锚
(页顶导语也含 Francophone 字样,只认 h3 标题锚)。
批E 拆分改动:原 RE_RURAL_H3 / RE_FRANCO_H3 两个锚,本域只用得上 Francophone 这一个
(它是 FCIP 段的起点,段终点是页尾);Rural 锚归 rcip.constants。正则一字未改。"""

RE_COMM_LINK = re.compile(r'<a[^>]+href="(https?://[^"]+)"[^>]*>\s*([^<]{3,60})\s*</a>')
"""名单区里的社区链接(URL + 显示名)。"""

TYPE_FCIP = "FCIP"
"""法语社区试点类型码。"""

OFFICIAL_HOSTS = ("canada.ca", "gc.ca")
"""联邦域名 —— 名单区里指向它们的链接是导航不是社区,剔除。"""

CITY_MAP_DOC = """社区 → Job Bank 城市(2026-08-15 生产库实测城市名;Sudbury 库里双写名并存都收)。
区域型社区界线 2026-08-15 批B 举证补齐(各社区官方站原句,agent 抽取归档 raw/pilot 备查):
  Pictou=五镇+县;WK=官方首页 Discover our Region(正向名单,非穷尽);NOS=官方首页原句 20 社区;
  Peace=PRRD+NRRM 八城镇;Acadian=官方首页八市镇(取库内实拼,Tracadie 双写名并存都收,
  Bas-Caraquet 因官方只点名上级市政区 Rivière-du-Nord 不单列 → 不映射);Superior East=官方六镇;
  Claresholm 官方注明 25km 含 Granum/Stavely(Stavely 库内暂无岗,留名);Rhineland 辖内官方未列名 → 只保 Altona"""
"""CITY_MAP 的逐社区界线举证(原行内注释,逐字折进 —— 举证全文两域各存一份,
讲 RCIP 社区的那几条留在这里是为了「一条不丢」)。"""

CITY_MAP: dict[str, list[str]] = {
    "Sudbury, ON": ["Sudbury", "Greater Sudbury"],
    "Timmins, ON": ["Timmins"],
    "Superior East Region, ON": ["Chapleau", "Dubreuilville", "Wawa", "White River", "Hornepayne", "Manitouwadge"],
    "St. Pierre Jolys, MB": ["St-Pierre-Jolys"],
    "Kelowna, BC": ["Kelowna"],
    "Acadian Peninsula, NB": ["Caraquet", "Shippagan", "Tracadie", "Tracadie-Sheila", "Neguac", "Lamèque"],
}
"""社区 → Job Bank 城市的人工核对表(界线举证见 CITY_MAP_DOC;空 = 不参与打标)。
批E 拆分改动:本表 = 纯法语四社区 + **Sudbury/Timmins 两条与 rcip.constants.CITY_MAP 的镜像**
(它俩在 IRCC 名单页两节都出现,FCIP 行也要带 cities,不然 05f 少一半打标依据)——
⚠ 镜像两份,**改一边记得改另一边**;六条城市清单一字未改。"""

PROV_RE = re.compile(r",\s*(ON|MB|SK|AB|BC|NS|NB)\s*$")
"""社区名尾巴自带的省码(「Sudbury, ON」)。"""

PROV_HINT = {"Acadian Peninsula, NB": "NB", "Superior East Region, ON": "ON"}
"""名字里读不出省码(或读出来不可靠)的社区的人工省份表。
批E 拆分改动:原表七条里这两条讲的是 FCIP 社区,搬来本域;另五条留在 rcip。
本域六个社区名尾巴都自带省码(PROV_RE 读得出),这两条与正则同值,是原表的存档不是新判。"""

K_CITIES = "cities"
"""社区行键:映射到的 Job Bank 城市清单。"""

MIN_FCIP = 4
"""FCIP 行数哨兵下限(官方名单 6 个;低于它即疑改版)。"""

COMM_IO_TPL = "IN_MANIFEST={manifest}\nOUT={out}"
"""本步开跑时打印的 IN/OUT 路径。"""

COMM_NO_ANCHOR = "  ✗ 找不到 Francophone communities 标题 —— 疑似 IRCC 页改版,保留旧表(不拦役)"
"""标题锚缺失时的留痕行 —— **print + return,不 raise 不拦役**(语义原样)。
批E 拆分改动(哨兵单侧化):原文案是「找不到 Rural/Francophone communities 标题」,
本域只用 Francophone 一个锚(FCIP 段起点),Rural 那一侧的文案归 rcip.constants 同名常量。"""

COMM_COLLAPSE_TPL = "  ✗ 解析塌方:FCIP {fcip}/6 —— 疑似 IRCC 页改版,保留旧表(不拦役)"
"""行数塌方时的留痕行 —— 同样 print + return,不拦役。
批E 拆分改动(哨兵单侧化):原文案是「RCIP {rcip}/14 · FCIP {fcip}/6」两侧同报,
拆域后本域只看得见 FCIP 一侧。判据不变:FCIP < MIN_FCIP 即保旧。"""

COMM_NOTE = ("IRCC 官方参与社区名单(fed-rcip crawl 缓存解析)。cities=人工核对的 Job Bank 城市映射,"
             "空=区域型社区界线未举证不打标(宁漏勿错);试点须雇主被社区指定,城市命中只是粗筛信号。")
"""pilot-communities.json 的口径说明(产物字段,逐字不改 —— 05f/09 读两域并集,两边 note 必须同字)。"""

COMM_DONE_TPL = "  ✓ 社区 {n}(FCIP {fcip})· 已映射城市 {mapped} 个社区 → {name}"
"""收尾报数行。
批E 拆分改动(哨兵单侧化):原文案是「社区 {n}(RCIP {rcip} + FCIP {fcip})」,
拆域后本域只产 FCIP 行,RCIP 那半句归 rcip.constants 同名常量。"""

# =========================================================================
# 5. 社区抽取器登记(社区官方名 → 抽取函数;details 步的私件群)
# =========================================================================

EXTRACTORS_DOC = """批C(E6-11,2026-08-15):法语社区名单抽取器注册表 —— 批B 一次性抽取转自动刷新。

四个地区模块各自导出 EXTRACTORS: dict[社区官方名(与 raw/fcip/fcip-communities.json 的 name 一致), callable]。
抽取函数签名(无参):
    fn() -> {"employers": [{"name": str, "location": str}...],   # 官方当前指定雇主(excluded/de-designated 剔除)
             "occupations": [{"noc": str5位或"", "title": str, "sectorOnly": bool}...],
             "employersUrl": str, "occupationsUrl": str}
约束:只用 stdlib + httpx + fitz(pymupdf) + re/json/csv;直连官方源带浏览器 UA;
     解析不动摇的红线=宁缺勿猜,拿不准的行不要;抛异常即可 —— 总控(build_pilot_details)对该社区保旧+喊人。

批E 拆分改动(2026-08-31,pilot 拆三域;Frank「拆成三个 很少有人有法语」):
本注册表 = **纯法语四社区**(Kelowna, BC / Acadian Peninsula, NB / St. Pierre Jolys, MB /
Superior East Region, ON),四个函数自 etl/pilot/extractors/ 的四个地区文件原样搬来(函数体一字未改),
地区分文件的结构沿用(bc/atl/prairie/on),共用私件与 rcip 域两边各留一份镜像。
⚠ fcip-communities.json 里还有 Sudbury, ON 与 Timmins, ON 两个**双身份社区**行,
但它们的抽取器住 rcip 域(拍板点 8-②:IRCC 名单页两节都列它俩,抽取只做一次),
本注册表**故意不含**它们 —— 总控查不到抽取器即跳过,fcip 产物只含纯法语四社区。

批L 溶解改动(2026-08-31,Frank「都需要检查的」——域内 .py 只许七名,子目录不豁免):
extractors/ 私件群(__init__ + atl/bc/on/prairie 四件)整体溶进本域五件 —— 四个地区文件
成本文件第 6~9 段(常量)与 functions.py 同名同序四段(函数),注册表本身成
functions.community_extractors() 构建函数;`_` 前缀私件名随溶退役成无下划线顶层名。
上面这段签名契约与红线**逐字存档不改**,它是抽取器的对外约定。"""
"""抽取器群的签名契约与红线(原 fcip/extractors/__init__.py 文件头,逐字折进)。"""

SE_COMMUNITY = "Superior East Region, ON"
"""ON 法语社区:Superior East Region(与 fcip-communities.json 的 name 逐字一致,下同)。"""

KEL_COMMUNITY = "Kelowna, BC"
"""BC 法语社区:Kelowna。"""

SP_COMMUNITY = "St. Pierre Jolys, MB"
"""草原法语社区:St. Pierre Jolys。"""

ACAD_COMMUNITY = "Acadian Peninsula, NB"
"""大西洋法语社区:Acadian Peninsula(官方站是法语,PPICF)。"""

# =========================================================================
# 6. ON 一社区抽取(Superior East Region)
# =========================================================================

ON_DOC = """on.py — ON 法语社区(Superior East Region)指定雇主/优先职业抽取器(E6-11 批C,2026-08-15)。

社区(键=fcip-communities.json 官方名)与源:
  Superior East Region, ON 雇主=fcip-employers 页 ul;职业=fcip 页文本块 NOC 行

批E 拆分改动(2026-08-31,pilot 拆三域;Frank「拆成三个 很少有人有法语」):本文件自
etl/pilot/extractors/on.py 拆出 —— SE_EMP_URL / SE_OCC_URL 两常量与 superior_east()
**函数体一字未改**;共用私件 UA / TIMEOUT / _get / _clean / _cut_note 是与
etl/rcip/extractors/on.py 的**镜像**(常量各域自抄先例:同一段代码两域各留一份,
改一边记得改另一边)。ON 的其余五个社区留在 rcip 域,**其中 Sudbury/Timmins 是双身份社区**:
IRCC 名单页 Rural 与 Francophone 两节都列它俩,抽取只在 rcip 做一次(拍板点 8-②),
本域不重复抽取 —— 所以本文件只有 Superior East 一个键。

红线:宁缺勿猜(excluded/de-designated 剔,拿不准的行不要);解析不到就抛异常,总控保旧。

批L 溶解改动(2026-08-31):本段 = 原 fcip/extractors/on.py 的全部常量;UA / TIMEOUT /
去标签正则三个抄本并进第 1 段,其余常量名一字未改;镜像关系不变(rcip 第 6 段是另一半)。"""
"""本段的社区与源(原 fcip/extractors/on.py 文件头,逐字折进)。"""

NOTE_DASH_RE = re.compile(r"\s[–—-]\s")
"""职业名里的破折段分隔(空格夹破折号)—— cut_note 的分段器。"""

NOTE_JOIN = " - "
"""cut_note 保留下来的小写延续段的重接符(官方 NOC 名内部的破折段)。"""

NOTE_STAR = "*"
"""职业名尾注星号(cut_note 一并剥掉)。"""

SE_EMP_URL = "https://superioreastcfdc.ca/superioreastcfdc.ca/index.php/en-ca/fcip/fcip-employers"
"""Superior East 的指定雇主页。"""

SE_OCC_URL = "https://superioreastcfdc.ca/superioreastcfdc.ca/index.php/en-ca/fcip"
"""Superior East 的 FCIP 主页(职业散在 sppb 文本块里)。"""

SE_LIST_RE = re.compile(r"Designated Employers</h3>.*?<ul>(.*?)</ul>", re.S)
"""雇主名单:h3 标题后的第一个 ul。"""

SE_NO_LIST = "Superior East: Designated Employers 列表不见了"
"""名单缺失的异常说法。"""

SE_BREAK_RE = re.compile(r"<(?:br[^>]*|/p|/h6)>")
"""先按换行类标签断行,再统一去标签 —— 职业行才不会被并成一坨。"""

SE_OCC_LINE_RE = re.compile(r"(\d{5})\s*(?:[–—-]\s*)?([A-Za-z].+)")
"""职业行「12345 – Titre」(破折号可省;同码只收首见的)。"""

SE_SHORT_TPL = "Superior East: employers={emp} occupations={occ}"
"""任一份为空的异常说法(两份都得有,缺一即抛)。"""

# =========================================================================
# 7. BC 一社区抽取(Kelowna)
# =========================================================================

BC_DOC = """bc — BC 法语社区(Kelowna)指定雇主/优先职业抽取(E6-11 批C,2026-08-15)。

社区与源(批B 2026-08-15 实测基线:雇主 52,职业 25):
  Kelowna, BC                雇主=官方页 designated-employers__list 全量名单;职业=官方页「Priority occupation 2026」链接的 Google Doc

批E 拆分改动(2026-08-31,pilot 拆三域;Frank「拆成三个 很少有人有法语」):本文件自
etl/pilot/extractors/bc.py 拆出 —— KEL_URL 常量与 kelowna() **函数体一字未改**;
共用私件 UA / TIMEOUT / _get / _text / _dedupe 是与 etl/rcip/extractors/bc.py 的**镜像**
(常量各域自抄先例:同一段代码两域各留一份,改一边记得改另一边);
BC 的另外三个社区(West Kootenay / North Okanagan Shuswap / Peace Liard)是乡村试点,留在 rcip 域。

约定:剔 de-designated;not-hiring 保留(『指定』≠『在招』);宁缺勿猜 —— 结构对不上就抛异常,总控保旧。

批L 溶解改动(2026-08-31):本段 = 原 fcip/extractors/bc.py 的全部常量;UA / TIMEOUT /
去标签正则 / <li> 正则四个抄本并进第 1 段,其余常量名一字未改。"""
"""本段的社区与源(原 fcip/extractors/bc.py 文件头,逐字折进)。"""

KEL_URL = "https://www.sdecb.com/en/pilot-program/"
"""Kelowna(SDECB)的试点页:雇主全量名单与职业 Doc 链接都在这。"""

KEL_LIST_RE = re.compile(r"designated-employers__list.*?<ul>(.*?)</ul>", re.S)
"""雇主全量名单的 ul。"""

KEL_NO_LIST = "Kelowna 页找不到 designated-employers__list 全量名单"
"""名单缺失的异常说法。"""

KEL_NOT_HIRING_RE = re.compile(r"\s*\(not hiring[^)]*\)\s*$", re.I)
"""名字尾巴的在招状态注记,剥掉(行保留 ——『指定』≠『在招』)。"""

KEL_LOCATION = "Kelowna"
"""本社区雇主的地点:官方名单不分列地址,全在 Kelowna(原脚本即写死此值)。"""

KEL_DOC_RE = re.compile(r'<a[^>]+href="(https://docs\.google\.com/document/d/[A-Za-z0-9_-]+)'
                        r'[^"]*"[^>]*>(?:(?!</a>).)*?Priority occupation', re.S)
"""「Priority occupation 2026」按钮指向的官方 Google Doc(取到 doc id 为止)。"""

KEL_NO_DOC = "Kelowna 页找不到 Priority occupation 的 Google Doc 链接"
"""职业 Doc 链接缺失的异常说法。"""

KEL_EXPORT_SUFFIX = "/export?format=txt"
"""Google Doc 的纯文本导出口(拼在 doc id 后面)。"""

KEL_NOC_RE = re.compile(r"\d{5}")
"""独占一行的五位 NOC 码(**整行**比对);下一非空行 = 职业名。"""

# =========================================================================
# 8. 草原一社区抽取(St. Pierre Jolys)
# =========================================================================

PRAIRIE_DOC = """prairie — 草原区法语社区(St. Pierre Jolys, MB)指定雇主+优先职业抽取(E6-11 批C,2026-08-15)。

社区与源(批B 实测口径;基线 雇主 6,职业 25):
  St. Pierre Jolys, MB 雇主=官方 PDF(FCIP 主页发现链接,▪ 分条) 职业=priority 页 <li>

批E 拆分改动(2026-08-31,pilot 拆三域;Frank「拆成三个 很少有人有法语」):本文件自
etl/pilot/extractors/prairie.py 拆出 —— _SP_HOME / _SP_OCC_URL 两常量与 st_pierre_jolys()
**函数体一字未改**;共用私件 UA / TIMEOUT / _DASH / _aia_context / _get / _pdf / _tidy /
_clean / _find_pdf_url / _require 是与 etl/rcip/extractors/prairie.py 的**镜像**
(常量各域自抄先例:同一段代码两域各留一份,改一边记得改另一边);草原区另外五个社区
(Moose Jaw / Claresholm / Steinbach / Altona-Rhineland / Brandon)是乡村试点,留在 rcip 域。

红线:宁缺勿猜 —— NOC 必须 5 位数字;解析为 0 行直接抛异常,总控(build_pilot_details)保旧。

批L 溶解改动(2026-08-31):本段 = 原 fcip/extractors/prairie.py 的全部常量;UA / TIMEOUT /
去标签正则 / 弯直引号四类抄本并进第 1 段,`_` 前缀常量名随溶去前缀(_SP_HOME → SP_HOME 等),
值一字未改;AIA 补链整套(本域只有 Brandon 那条路的镜像,St. Pierre 站没触发过)照旧留段内。"""
"""本段的社区与源(原 fcip/extractors/prairie.py 文件头,逐字折进)。"""

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

HREF_PATTERN_TPL = r'href="([^"]*(?:%s)[^"]*)"'
"""按给定 pattern 找页内链接的正则模板(PDF 链接动态发现)。"""

PDF_LINK_FAIL_TPL = "官方页找不到 PDF 链接(pattern={pattern})"
"""动态发现 PDF 链接失败的异常说法。"""

AMP_ENTITY = "&amp;"
"""只还原这一个实体 —— 整串 unescape 会把查询串里的 &curren… 吃成 ¤(St. Pierre 实撞)。"""

AMP = "&"
"""AMP_ENTITY 的还原目标。"""

REQUIRE_FAIL_TPL = "{what} 解析 0 行 —— 源疑似改版"
"""草原段「解析 0 行」的异常说法。"""

SP_HOME = "https://villagestpierrejolys.ca/p/francophone-communities-immigration-pilot-program"
"""St. Pierre Jolys 的 FCIP 主页(雇主 PDF 链接在这)。"""

SP_OCC_URL = "https://villagestpierrejolys.ca/p/priority-sectors-and-occupations"
"""St. Pierre Jolys 的优先行业/职业页。"""

SP_PDF_PATTERN = r"fileName=Designated[^\"]*\.pdf"
"""雇主 PDF 的链接特征(站方用 fileName= 查询串挂附件;找不到时的报错也报它)。"""

SP_PDF_RE = re.compile(HREF_PATTERN_TPL % SP_PDF_PATTERN, re.I)
"""雇主 PDF 的链接正则(原 _find_pdf_url 每次现编,溶进来后预编译)。"""

SP_BULLET = "▪"
"""PDF 按 ▪ 分条,每条首个非空行 = 雇主名。"""

SP_NOT_HIRING_RE = re.compile(r"\s*%s?\s*\[not\s*hiring\]\s*$" % PRAIRIE_DASH, re.I)
"""名字尾巴的在招状态注记,剥离(行保留)。"""

SP_DASH_FIX_RE = re.compile(r"(\w)-\s+(\w)")
"""PDF 断行伪影「Franco- manitobaine」:连字号后被塞进了空格。"""

SP_DASH_FIX_TO = r"\1-\2"
"""伪影的补齐写法(把空格吃掉)。"""

SP_OCC_RE = re.compile(r"<li>\s*(\d{5})\s*%s\s*(.*?)\s*</li>" % PRAIRIE_DASH, re.S)
"""职业页的 <li> 行「12345 – Titre」。"""

SP_EMP_LABEL = "St. Pierre Jolys 雇主"
"""雇主 0 行时异常说法里的名头。"""

SP_OCC_LABEL = "St. Pierre Jolys 职业"
"""职业 0 行时异常说法里的名头。"""

# =========================================================================
# 9. 大西洋一社区抽取(Acadian Peninsula)
# =========================================================================

ATL_DOC = """批C(E6-11):Atlantic 法语社区名单抽取器。

社区(键=raw/fcip/fcip-communities.json 的官方名):
  - "Acadian Peninsula, NB"    — FCIP/PPICF,站 inspirepeninsuleacadienne.ca(法语;
                                 雇主=官方 PDF,职业=项目页手风琴列表)

批E 拆分改动(2026-08-31,pilot 拆三域;Frank「拆成三个 很少有人有法语」):本文件自
etl/pilot/extractors/atl.py 拆出 —— ACAD_PAGE_URL / _ACAD_HEADER_PREFIXES 两常量与
acadian_peninsula() **函数体一字未改**;共用私件 UA_HEADERS / _fetch / _pdf_lines / _clean
是与 etl/rcip/extractors/atl.py 的**镜像**(常量各域自抄先例:同一段代码两域各留一份,
改一边记得改另一边);Atlantic 的另一个社区 Pictou County, NS 是乡村试点,留在 rcip 域。

红线:宁缺勿猜 —— 解析不到的行直接丢;数量掉出下限抛异常,总控保旧。
PDF 链接不写死文件名(官方按日期换版),每次从页面重新发现最新版。

批L 溶解改动(2026-08-31):本段 = 原 fcip/extractors/atl.py 的全部常量;UA_HEADERS 拆成
第 1 段的 UA_CHROME126 + 本段的 HDR_ACCEPT_LANGUAGE / ATL_ACCEPT_LANG(头名归 HDR_ 词族),
超时与去标签/弯引号抄本并进第 1 段,值一字未改。"""
"""本段的社区与源(原 fcip/extractors/atl.py 文件头,逐字折进)。"""

HDR_ACCEPT_LANGUAGE = "Accept-Language"
"""语言偏好请求头名(HDR_ 头名词族)。"""

ATL_ACCEPT_LANG = "en-CA,en;q=0.9,fr-CA;q=0.8"
"""大西洋站点的语言偏好(英法双语站,给它英优先的实况值)。"""

ACAD_PAGE_URL = (
    "https://inspirepeninsuleacadienne.ca/"
    "programme-pilote-immigration-communautes-francophones/"
)
"""Péninsule acadienne 的 PPICF 项目页(雇主 PDF 链接与职业手风琴都在这)。"""

ACAD_PDF_RE = re.compile(r'href="(https?://[^"]*[Ll]iste-des-employeurs[^"]*\.pdf)"')
"""雇主 PDF 链接:文件名带日期(Liste-des-employeurs-designes-PPICF-<date>.pdf),动态发现。"""

ACAD_NO_PDF = "Acadian: 项目页找不到 Liste des employeurs PDF 链接"
"""PDF 链接缺失的异常说法。"""

ACAD_HEADER_PREFIXES = (
    "commission de services",
    "liste des employeurs",
    "programme pilote",
    "les employeurs suivants",
    "pour la péninsule acadienne",
    "nb :",
    "nb:",
)
"""PDF 页眉/页脚固定句(比对前先做 ’→' 归一 + casefold)。"""

ACAD_NOTE_RE = re.compile(r"\(\s*ne recrute pas[^)]*\)", re.IGNORECASE)
"""「(ne recrute pas …)」括注 —— 行保留,仅去括注。"""

ACAD_SPLIT_RE = re.compile(r"\s+[–—-]\s+")
"""「Nom - Lieu」以空格夹连字符分隔(地名内部连字符如 St-Isidore 不受影响)。"""

ACAD_SPLIT_MAX = 1
"""只切第一处 —— 「Nom - Lieu」后面的破折号属于地名本身;职业行的 <br> 之后是备注,同样只取第一段。"""

ACAD_PARTS_WITH_LOCATION = 2
"""切出两段才有地点;个别行无地点(如 Résidence St Isidore),location 留空,宁缺勿猜。"""

ACAD_ICON_RE = re.compile(r'<span class="elementor-icon-list-text">(.*?)</span>', re.S)
"""职业手风琴的一条(同页其他 icon-list 是资格条文,靠行首 5 位码过滤)。"""

ACAD_BR_RE = re.compile(r"<br\s*/?>")
"""<br> 之后是限额备注,不入 title(只取第一段)。"""

ACAD_OCC_RE = re.compile(r"^(\d{5})\s*[–—-]\s*(.+)$")
"""职业行「12345 – Titre」(第 1 组=NOC 码,第 2 组=职业名)。
批L 溶解改动:原写法是命名组 (?P<noc>…)/(?P<title>…),溶进本域后改成位置组 —— 组名
与行键 K_NOC/K_TITLE 同字面会让读的人以为是同一个词汇;捕获内容与顺序一字未改。"""

ACAD_MIN_EMP = 20
"""雇主行数下限(官方 30+ 家量级),低于它即疑 PDF 版式变更。"""

ACAD_MIN_OCC = 10
"""职业行数下限(官方 25 条),低于它即疑页面改版。"""

ACAD_EMP_SHORT_TPL = "Acadian: 雇主仅解析出 {n} 家,疑似 PDF 版式变更"
"""雇主塌方的异常说法。"""

ACAD_OCC_SHORT_TPL = "Acadian: 职业仅解析出 {n} 条,疑似页面改版"
"""职业塌方的异常说法。"""
