"""
statcan/cip 子域常量 —— CIP 2021 专业表词汇表(与 functions.py / scheme.py 同名同序镜像;方言同 statcan/constants.py:
每个常量赋值后裸字符串 docstring,决策记录连人带日期原样折进所属常量;文案模板一律 *_TPL)。

唯一特批 import = `paths`(IN/OUT 路径归这;processed 那格 PROCESSED_STATCAN 不进 paths 桶,
从 `paths.constants` 直取,理由见那条常量)。statcan 共用的 crawl slug / UA / 落盘键不在这里抄,
functions 直接从 statcan.constants 取(依赖单向:子域 → statcan 共用段)。

@author Frank
@time 2026-10-04 02:14:05
"""
import paths
from paths.constants import PROCESSED_STATCAN

# =========================================================================
# 1. 结构表(cip2021 步:官方 CSV → raw/statcan/cip2021.json)
# =========================================================================

CIP_CSV_URL = "https://www.statcan.gc.ca/en/media/4226"
"""官方结构表 CSV(CIP Canada 2021 Version 1.0 的 primary groupings 变体,英法双语)。2026-10-04 实测 httpx 直取 200、
2.27 MB:2,635 行 = 13 个 primary grouping + 49 个 series + 454 个 subseries + 2,119 个 class;列 = Level/Niveau /
Hierarchical structure / Structure hiérarchique / Code / Parent / Class title / Titres de classes / Class definition /
Définitions de la classe / Superscript / Supérieurs。本站只收 class 一层(访客选的是具体专业)。
分类标准五年一修,和 NAICS 同进 statcan_naics 调度单元日抓一发 —— raw/statcan/*.json 在 statcan 役的保鲜通配里(2 天),
不进链就只能靠人手点名续期(先例:statcan/main.py TOOLS 的 naics 沿革,2026-09-26 Frank「其他最次也是日更」)。"""

CIP_VERSION = "CIP Canada 2021 v1.0"
"""落盘的版本标(官方版本名)。"""

CIP_TITLE = "CIP Canada 2021 Version 1.0 - Primary groupings variant (CSV)"
"""crawl 层页行的标题。"""

CIP_TIMEOUT_S = 60
"""结构表请求超时(2.27 MB,本机 1 秒)。"""

CIP_ENC = "utf-8-sig"
"""结构表编码:UTF-8 带 BOM(2026-10-04 实测响应头 text/csv; charset=UTF-8、首三字节 EF BB BF)。
派工时说的 cp1252 不对 —— 按 cp1252 解会把 hiérarchique 解成 hiÃ©rarchique、首列名带 'ï»¿'。"""

CIP_COL_STRUCT = "Hierarchical structure"
"""列名:层级名(Primary groupings / Series / Subseries / Class)。**按它认 class,不按 Level 列** ——
primary groupings 变体里 series 30(跨学科)没有 series 行,它的 51 个 subseries 直挂各 grouping(Level 2),
65 个 class 落在 Level 3;按 Level 4 取会漏掉这 65 个(数据分析 30.71、数据科学 30.70 都在里面)。"""

CIP_COL_CODE = "Code"
"""列名:代码(class 是 'NN.NNNN' 写法,如 52.0203)。"""

CIP_COL_PARENT = "Parent"
"""列名:父码(primary grouping 为空)。官方表头写成 'Parent '(带尾随空格),读表时表头一律 strip 后再按名取。"""

CIP_COL_TITLE_EN = "Class title"
"""列名:英文类名。"""

CIP_COL_TITLE_FR = "Titres de classes"
"""列名:法文类名(原样带上,本站暂不显示)。"""

CIP_STRUCT_CLASS = "Class"
"""层级名:class(第 4 层;series 30 的在第 3 层,见 CIP_COL_STRUCT)。"""

CIP_GROUPINGS = ("00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12")
"""13 个 primary grouping 码(自校:每个 class 顺父链必须爬到其中之一,爬不到 = 表改版)。"""

CIP_CLASSES_N = 2119
"""class 数(2026-10-04 实测;自校不等即抛,保留旧表)。去重口径:按 code 先到先得 —— 派工时预期 series 30 会在
多个 grouping 下重复出现,实测这份变体里 2,119 个 class 码零重复(series 30 的每个 subseries 只挂一个 grouping),
去重是防线不是常态;真出现重复时 class 数对不上,自校会喊。"""

CIP_SERIES_LEN = 2
"""series 码 = class 码前两位(52.0203 → 52)。"""

CIP_DEPTH_MAX = 4
"""顺父链爬根的步数上限(class → subseries → series → grouping 最多三步;防坏表成环)。"""

CIP_FAIL_SHOW = 10
"""自校报错时列出的坏码个数上限。"""

OUT_CIP = paths.STATCAN / "cip2021.json"
"""第 1 步产物:2,119 个 class,一码一行(code / titleEn / titleFr / series / subseries / grouping)。"""

CIP_PRINT_OUT_TPL = "OUT={path}"
"""第 1 步开工报输出。"""

CIP_DONE_TPL = "✓ cip2021: {n} 个 class → {out}"
"""第 1 步收尾报数。"""

CIP_COUNT_FAIL_TPL = "cip2021 自校未过: class {n} 个(应 {want})"
"""第 1 步自校报错:条数与官方不一致(表改版 / 下载截断)。"""

CIP_ROOT_FAIL_TPL = "cip2021 自校未过: 爬不到 primary grouping 的 class {codes}"
"""第 1 步自校报错:父链断了(表改版)。"""

K_CIP_ROWS = "rows"
"""cip2021.json 落盘键:行清单。"""

K_CIP_VERSION = "version"
"""cip2021.json 落盘键:标准版本。"""

K_CIP_CODE = "code"
"""行键:class 码。"""

K_TITLE_EN = "titleEn"
"""行键:官方英文类名。"""

K_TITLE_FR = "titleFr"
"""行键:官方法文类名。"""

K_CIP_SERIES = "series"
"""行键:两位 series 码。"""

K_SUBSERIES = "subseries"
"""行键:subseries 码(= 官方父码,如 52.02 / 30.71)。"""

K_GROUPING = "grouping"
"""行键:两位 primary grouping 码(顺父链爬到根)。"""

CIP_JSON_ENC = "utf-8"
"""读本子域 json 产物的编码。"""

# =========================================================================
# 2. 中韩名(cip_i18n 步:英文名 → 本地 qwen 分批译 → processed/statcan/cip_i18n.json)
# =========================================================================

OUT_CIP_I18N = PROCESSED_STATCAN / "cip_i18n.json"
"""第 2 步产物:译名缓存 {code: {v, zh, ko}}(可断点续跑,版本对、已译的语言跳过)。
写 processed 不写 raw:raw 只放官方原文抽出来的东西,译名是我们加工的。"""

CIP_TRANS_V = 1
"""译名版本号(照 cms lib/db TRANS_V 惯例,2026-09-14 Frank「存进去的翻错了呢」):换模型 / 改提示词把它加一,
缓存里旧版本的格读进来即作废、整批重译。"""

CIP_TRANS_MODEL = "qwen3.6:latest"
"""翻译模型(与 noc 段 9 板帖标题英译同一只;盒子地址走 noc.functions.ollama_base,OLLAMA_URL 可覆盖)。"""

CIP_GEN_URL_TPL = "{base}/api/generate"
"""Ollama 生成端点(与 noc 段 9 同一条调用形:/api/generate、temperature 0、不开思维链)。"""

CIP_TRANS_BATCH = 25
"""一批送几条专业名(编号成行一次送;对不上就二分重试到单条,照 noc.translate_split)。"""

CIP_TRANS_TIMEOUT_S = 300.0
"""一批的请求超时(秒)。"""

CIP_TRANS_PROMPT_TPL = (
    "Translate each numbered Canadian post-secondary field of study (a CIP 2021 program class title) into {lang}. "
    "Use the standard name universities and colleges use for that field of study in {lang}; be concise and natural. "
    "Omit the word 'general' entirely (do not translate a trailing ', general'). "
    "Render ', other' as the field name followed by the word for 'other' in parentheses. "
    "Drop parenthesized lists of credential abbreviations such as (RN, ASN, BSN, ...) or (LPN, LVN, RPN, ...). "
    "Return exactly one line per item in the form 'N. translation', same numbering, no notes, no extra lines.\n\n{lines}"
)
"""翻译提示词(一批编号成行)。2026-10-04 试译 25 条定稿:初版写「Drop a trailing ', general'」韩文仍逐条译出「일반」、
注册护士那条把 (RN, ASN, BSN, BScN, MSN, MScN) 整串照抄 —— 改成「整个省掉 general」「去掉学位缩写串」两句。"""

CIP_GENERAL_SUFFIX = ", general"
"""送模型前从英文名尾部剥掉的「, general」(2026-10-04 试译:提示词明说省掉,韩文仍逐条译出「일반」;源头剥掉最稳)。"""

CIP_TRANS_LINE_TPL = "{n}. {text}"
"""送模型的一行(编号. 英文名)。"""

CIP_TRANS_LINE_RE = r"^\s*(\d+)\s*[.、:：)]\s*(.+)$"
"""解析模型回的一行(编号 + 译名;照 noc EN_TITLE_LINE_RE)。"""

CIP_TRANS_MAX_LEN = 60
"""译名长度上限(超了多半是模型加了解释)。"""

K_ZH = "zh"
"""译名缓存格键:中文。"""

K_KO = "ko"
"""译名缓存格键:韩文。"""

K_V = "v"
"""译名缓存格键:版本号。"""

CIP_LANGS = {K_ZH: "Simplified Chinese (as used in mainland China)", K_KO: "Korean (as used in South Korea)"}
"""要译的两门语言:缓存格键 → 提示词里的语言说法。"""

CIP_LANG_RE = {K_ZH: r"[一-鿿]", K_KO: r"[가-힯]"}
"""译名过闸:目标语言的字必须真出现(中文 = CJK 统一汉字,韩文 = 谚文音节)。"""

CIP_OTHER_EN = "other"
"""英文名里的「其他」一词(官方 'xxx, other' 兜底类)。"""

CIP_OTHER_LOCAL = {K_ZH: "其他", K_KO: "기타"}
"""译名过闸:英文名里没有 other,译名里却冒出「其他 / 기타」的退回(2026-10-04 补译 12 条时实撞:同批有 other 类,
模型给牙医学 51.0401、执业护士培训 51.3901 凭空加了「(其他)」)。"""

CIP_LATIN_RE = r"[A-Za-z]"
"""中文译名过闸:拉丁字母数不许多过汉字数(2026-10-04 首轮全量后体检:「workforce development and training(不计学分)」
「法律助理/ paralegal」这类只译了括号、正文照抄英文的能混过「有汉字」一关;(CEGEP)(STEM)CAD 这类缩写夹在中文里照放)。"""

NL = "\n"
"""换行(拼 / 拆模型的编号行)。"""

K_MODEL = "model"
"""Ollama 请求键:模型名。"""

K_PROMPT = "prompt"
"""Ollama 请求键:提示词。"""

K_STREAM = "stream"
"""Ollama 请求键:流式(关)。"""

K_THINK = "think"
"""Ollama 请求键:思维链(关)。"""

K_OPTIONS = "options"
"""Ollama 请求键:采样选项。"""

K_TEMPERATURE = "temperature"
"""Ollama 采样键:温度(0 求稳定)。"""

K_RESPONSE = "response"
"""Ollama 响应键:生成正文。"""

CIP_I18N_IO_TPL = "IN={src}  OUT={out}  模型 {model} @ {base}"
"""第 2 步开工报输入输出。"""

CIP_I18N_TODO_TPL = "  {lang}: 待译 {n} 条(缓存已有 {have} 条)"
"""第 2 步每门语言的待译数。"""

CIP_I18N_TICK_TPL = "  {lang} [{done}/{todo}] 本轮译成 {ok}"
"""第 2 步进度行(每批落一次盘)。"""

CIP_I18N_DONE_TPL = "✓ cip_i18n: {n} 个 class,中文 {zh} / 韩文 {ko} → {out}"
"""第 2 步收尾报数。"""

CIP_TRANS_FAIL = "cip 译名批"
"""译名请求失败的留痕标签(err 的出事对象位)。"""

# =========================================================================
# 3. 汇装件(cip_programs 步:表 + 中韩名 + 专业 → 大类对照 + 热门名次)
# =========================================================================

CIP_POPULAR = (
    "52.0201",
    "52.0301",
    "52.0203",
    "52.0901",
    "12.0503",
    "12.0504",
    "13.1210",
    "11.0201",
    "11.0701",
    "30.7101",
    "52.0211",
    "52.1401",
    "50.0409",
    "51.3801",
    "51.3902",
    "15.0805",
)
"""热门专业胶囊(有序,名次 = 下标 + 1;2026-10-04 Claude 按「在加中国留学生 / 新移民常读的」挑、Frank 抽查)。
每个码都在 2026-10-04 抓的 cip2021.json 里核到(第 3 步自校:缺一个即抛)。逐条(中文意图 → 码 → 官方英文名):
  工商管理 52.0201 Business administration and management, general;会计 52.0301 Accounting;
  供应链物流 52.0203 Logistics, materials, and supply chain management;酒店管理 52.0901 Hospitality administration/management, general;
  烹饪 / 厨师 12.0503 Culinary arts/chef training;烹饪管理 12.0504 Restaurant, culinary and catering management/manager;
  幼儿教育 13.1210 Early childhood education and teaching(19.0709 Child care provider/assistant 是保育员,不取);
  计算机编程 11.0201 Computer programming/programmer, general;计算机科学 11.0701 Computer science;
  数据分析 30.7101 Data analytics, general(数据科学 30.7001 Data science, general 胶囊只放一个,留给搜索);
  项目管理 52.0211 Project management;市场营销 52.1401 Marketing/marketing management, general;
  平面设计 50.0409 Graphic design;注册护士 51.3801 Registered nursing/registered nurse (RN, ASN, BSN, BScN, MSN, MScN);
  护理员 PSW 51.3902 Nursing assistant/aide and patient care assistant/aide —— 官方 2,119 条的类名与定义里没有一条写
    personal support,取定义最贴的这条(医院 / 长期护理院、在注册护士或执照护士督导下做护理);51.2601 Health aide、
    51.2602 Home health aide/home attendant 也沾边,TODO Frank 抽查;
  机械工程技术 15.0805 Mechanical/mechanical engineering technology/technician。"""

OUT_CIP_PROGRAMS = PROCESSED_STATCAN / "cip_programs.json"
"""第 3 步产物:cip_programs 表的行(列对齐 docs/sql/cip-programs-20261004.sql)。
🔴 写 processed 不写 mart:data/mart/*.json 每小时被 build 役整目录上传、seed 灌库,生产 DDL 没跑之前这张表不许进生产;
DDL 跑完后再接汇装(mart 的 to_mart_tables 加一项读本文件,跑法见 DDL 文件头)。
2026-10-04 收口:生产 DDL 已跑、已在 payload.config 注册、已接汇装(mart 的 build_cip_programs 原样读本文件,
data/mart/cip_programs.json 每轮产出);本步照旧只写 processed,改了对照表或重译后重跑本步,下一轮汇装才看得到。
2026-10-05 掌上高考版(Frank「可以,做吧」):行尾多三格 —— titleEnShort / places 两个 DB 列(生产 DDL
docs/sql/cip-programs-places-20261005.sql 同日已跑)+ titleZhRaw(只在 processed / mart,不进库);titleZh 换成清洗名。"""

K_TITLE_ZH = "titleZh"
"""cip_programs 行键:中文名(本地 qwen 译;没译成 = null)。
2026-10-05 起这一格是清洗后的中文显示名(cip_zh_show_of:去「/技术员」这类直译尾巴、「X/Y」改「X与Y」,不带「/」);
机翻定稿原样挪到 titleZhRaw(K_TITLE_ZH_RAW)。"""

K_TITLE_KO = "titleKo"
"""cip_programs 行键:韩文名(同上)。"""

K_BROADS = "broads"
"""cip_programs 行键:本站职业大类清单(noc.functions.major_broads_of 推,单一来源 noc.constants.MAJOR_SERIES_BROADS)。"""

K_POPULAR = "popular"
"""cip_programs 行键:热门名次(CIP_POPULAR 下标 + 1);不在热门清单 = null。"""

CIP_NAME_FIX = {
    # 热门 16 条:胶囊上的名字(机翻照字面拼,「护理助理/护理人员及患者护理助理/护理人员」上不了胶囊)
    "52.0201": {K_ZH: "工商管理", K_KO: "경영학"},
    "52.0301": {K_ZH: "会计", K_KO: "회계학"},
    "52.0203": {K_ZH: "供应链与物流管理", K_KO: "물류·공급망 관리"},
    "52.0901": {K_ZH: "酒店管理", K_KO: "호텔경영학"},
    "12.0503": {K_ZH: "烹饪与厨师", K_KO: "조리·셰프"},
    "12.0504": {K_ZH: "餐饮与宴会管理", K_KO: "외식경영"},
    "13.1210": {K_ZH: "幼儿教育", K_KO: "유아교육"},
    "11.0201": {K_ZH: "计算机编程", K_KO: "컴퓨터 프로그래밍"},
    "11.0701": {K_ZH: "计算机科学", K_KO: "컴퓨터과학"},
    "30.7101": {K_ZH: "数据分析", K_KO: "데이터 분석"},
    "52.0211": {K_ZH: "项目管理", K_KO: "프로젝트 관리"},
    "52.1401": {K_ZH: "市场营销", K_KO: "마케팅"},
    "50.0409": {K_ZH: "平面设计", K_KO: "그래픽 디자인"},
    "51.3801": {K_ZH: "注册护士", K_KO: "간호학(RN)"},
    "51.3902": {K_ZH: "护理助理", K_KO: "간호조무사"},
    "15.0805": {K_ZH: "机械工程技术", K_KO: "기계공학 기술"},
    # 译错 / 没译成
    "52.1304": {K_KO: "보험계리학"},
    "60.0899": {K_ZH: "药学住院医师/进修项目（其他）"},
    "01.0310": {K_KO: "양봉학"},
    "51.3901": {K_ZH: "注册实习护士培训"},
    "34.0105": {K_ZH: "冥想与身心健康（不计学分）"},
    "53.0104": {K_ZH: "荣誉高中文凭课程"},
    "51.0401": {K_ZH: "牙医学"},
    "22.0302": {K_ZH: "法律助理/律师助理"},
    "30.2599": {K_KO: "인지과학 (기타)"},
    "51.0906": {K_KO: "체외순환 기술"},
    # 两条撞成同名的,把细的那条改开
    "12.0509": {K_ZH: "烹饪科学"},
    "48.0701": {K_ZH: "木工工艺"},
    "15.1001": {K_ZH: "施工工程技术/技术员"},
    "15.0701": {K_KO: "산업안전보건 기술자"},
    "45.0199": {K_ZH: "综合社会科学（其他）", K_KO: "일반 사회과학 (기타)"},
    "04.0803": {K_ZH: "建筑研究", K_KO: "건축 연구"},
    "51.1007": {K_KO: "조직검사 기술학"},
    "51.2604": {K_ZH: "康复护理员", K_KO: "재활 도우미"},
    "43.0399": {K_ZH: "安全与保护服务专项课程（其他）", K_KO: "보안 및 보호 서비스 특화 과정 (기타)"},
    "13.1299": {K_KO: "교사 교육(수준·방법별) (기타)"},
    "13.1399": {K_KO: "교사 교육(과목별) (기타)"},
    "52.0101": {K_KO: "비즈니스/상업"},
    "40.9999": {K_KO: "물리과학 (기타)"},
    "53.0299": {K_KO: "고등학교 수료증 프로그램 (기타)"},
}
"""人工定名(2026-10-04 收口审查后立;Frank 可改):汇装时**整格盖过**机翻名,不再过术语校正与「其他」归一。
三类:① 热门 16 条的胶囊名(短、人话;英文官方原名照旧主文案);② 审查抽出的错译与没译成的(精算韩文译成「计量经济学」、
药学 60.0899 中文译成「医师助理…」、养蜂韩文夹汉字、LPN 中文译成与 NP 撞词的「执业护士」、中文留英文 wellness / Regents、
牙医学 / 法律助理中文没过闸;认知科学 30.2599 韩文译成「文化研究」);③ 中 / 韩撞成同名的(中文 8 组、韩文 8 组,
不改开搜索下拉里两条一模一样;术语校正 / 「其他」归一后又撞出的 3 组同批改开 —— 汇装后中韩名零重名,test_cip 守着)。
译名缓存(cip_i18n.json)不动 —— 机翻原样留档,哪天重译也盖得住。
码不在 CIP 表里汇装即抛(死键 = 码写错)。"""

CIP_TERM_FIX = (
    (K_KO, "technician", "기술자/기술사", "기술자"),
    (K_KO, "technologist", "기술자/기술사", "기술자"),
    (K_KO, "technician", "기술사", "기술자"),
    (K_KO, "technologist", "기술사", "기술자"),
    (K_KO, "fellowship", "페로우", "펠로우"),
)
"""机翻的系统性错词(2026-10-04 收口审查):(语言, 英文名里须含的词, 错词, 改成)—— 英文名(小写)含那个词才换,
免得误伤别的意思(只认 technician / technologist,不认 technology:「科学技术史」的韩文正是「과학기술사」)。
technician / technologist 韩文 52 条译成「기술사」(韩国专业工程师资格的名称),改「기술자」(另 1 条 51.0906 英文只有
technology,走人工定名),
「기술자/기술사」并写的先并成一个;fellowship 韩文 67 条写「페로우」、114 条写「펠로우」,统一后者。
人工定名(CIP_NAME_FIX)的格不过这一关。"""

CIP_OTHER_EN_TAIL = ", other"
"""英文名以它结尾(不分大小写)= 官方「其他」兜底类,译名的「其他」写法要归一(见 CIP_OTHER_MARK)。"""

CIP_OTHER_MARK = {K_ZH: "（其他）", K_KO: " (기타)"}
"""「其他」兜底类译名的统一写法(2026-10-04 收口审查:中文有「（其他）」177 条、「，其他」76 条、前缀「其他」28 条、
「及其他」等 13 条四种写法,韩文「 (기타)」「(기타)」「, 기타」、前缀「기타」也是四种)。取各自最多的那种:正文 + 括号后缀。"""

CIP_OTHER_TAILS = {
    K_ZH: ("（其他）", "(其他)", "，其他", ",其他", "及其他", "其他"),
    K_KO: ("(기타)", ", 기타", "기타"),
}
"""归一时从译名尾部剥掉的「其他」写法(长的在前,反复剥到剥不动;「기타(기타)」这种叠写一并剥净)。"""

CIP_OTHER_HEADS = {K_ZH: "其他", K_KO: "기타"}
"""归一时从译名头部剥掉的「其他」写法(「其他电气和输电线路安装工」→「电气和输电线路安装工（其他）」)。"""

CIP_OTHER_TRIM = " ,，、"
"""剥完首尾「其他」后再修掉的残留空白与标点。"""

CIP_PROGRAMS_DONE_TPL = "✓ cip_programs: {n} 行(中文 {zh} / 韩文 {ko} / 热门 {pop})→ {out}"
"""第 3 步收尾报数。"""

CIP_POPULAR_MISS_TPL = "cip_programs 自校未过: 热门码不在 CIP 表里 {codes}"
"""第 3 步自校报错:CIP_POPULAR 里有码在官方表里找不到。"""

CIP_FIX_MISS_TPL = "cip_programs 自校未过: 人工定名的码不在 CIP 表里 {codes}"
"""第 3 步自校报错:CIP_NAME_FIX 里有码在官方表里找不到(死键,多半是码写错)。
2026-10-05 起同一句也报显示名的两张人工定名表(CIP_EN_SHORT_FIX / CIP_ZH_SHOW_FIX)的死键。"""

CIP_BROADS_FAIL_TPL = "cip_programs 自校未过: 专业 → 大类对照表有问题 {problems}"
"""第 3 步自校报错:noc 的 MAJOR_SERIES_BROADS 值域越界 / 有 class 落不到任何大类。"""

# =========================================================================
# 4. 选择器位置(places:左栏大类 → 专业类 → 专业;cip_programs 步顺手算)
# =========================================================================

K_PLACES = "places"
"""cip_programs 行键:这个专业在选择器里挂在哪(清单,一处一格,按 catOrder 先后;不进选择器的 = [])。
2026-10-05 Frank「参考掌上高考啊」「可以,做吧」立:左栏 16 个大类 → 可展开的专业类(「N个专业」+ 箭头)→ 专业;
设计与效果图见 docs/design/访客四题-专业题调研-20261004.md「效果图:掌上高考版」,生产 DDL
docs/sql/cip-programs-places-20261005.sql 同日已跑(places jsonb)。序号与 single 都在这里算好,接口只按序号排。"""

K_PLACE_CAT = "cat"
"""位置格键:左栏大类键(CIP_CATS 的键,如 fin)。"""

K_PLACE_CAT_ORDER = "catOrder"
"""位置格键:大类在左栏的序号(1..16,CIP_CATS 的先后)。"""

K_PLACE_CAT_EN = "catEn"
"""位置格键:大类英文名。"""

K_PLACE_CAT_ZH = "catZh"
"""位置格键:大类中文名。"""

K_PLACE_CAT_KO = "catKo"
"""位置格键:大类韩文名。"""

K_PLACE_GROUP = "group"
"""位置格键:专业类键 —— CIP subseries 码(52.03)或自定专业类键(eng.mech / logi.mgmt,见 CIP_CUSTOM_GROUPS)。
2026-10-05 单列并类再加两种:<大类>.cross 交叉学科类、<大类>.misc 其他专业类(见 CIP_CROSS_TAIL / CIP_MISC_TAIL)。"""

K_PLACE_GROUP_EN = "groupEn"
"""位置格键:专业类英文名(CIP_GROUP_NAMES)。"""

K_PLACE_GROUP_ZH = "groupZh"
"""位置格键:专业类中文名。"""

K_PLACE_GROUP_KO = "groupKo"
"""位置格键:专业类韩文名。"""

K_PLACE_GROUP_ORDER = "groupOrder"
"""位置格键:专业类在这个大类里的序号(1 起连续):先折叠类(装两个以上专业的),后单列类(只装一个的),排法见
cip_cat_places_of。
2026-10-05 单列卡兜底类殿后(契约「any 'other' item last」;效果图按「热门名次 → 码」排,审查改判照契约)。
2026-10-05 单列并类(Frank「这下面怎么还有一些单蹦的专业」):单列类已并进别的专业类(cip_cat_folded_of),正常不再有;
其他专业类(<大类>.misc)不论装几个一律殿后。"""

K_PLACE_ORDER = "order"
"""位置格键:专业在这个专业类里的序号(1 起连续;单列类恒为 1)。"""

K_PLACE_SINGLE = "single"
"""位置格键:这个专业类在这个大类里只装这一个专业 —— 选择器不折叠它,所有单列类合成一张卡,列在折叠类之后。
2026-10-05 单列并类起正常全表都是 false(格照留,接口契约不变);唯一可能为真的是并完只剩一个专业的其他专业类
(无处可并;自测断言真表一个都没有)。"""

CIP_SINK_SERIES = ("32", "33", "34", "35", "36", "37", "60", "61")
"""不进选择器的 series:32–37 不计学分课(基础技能 / 公民 / 健康 / 人际 / 休闲 / 个人发展)、60 / 61 住院医师培训
(访客问的是读过的专业,这几类不是;places 给 [],搜索里照旧搜得到、沉底)。与 cms lib/majors 的 SINK_SERIES 同一份名单,
两边各自声明(跨介质),改一处要对另一处。"""

CIP_CATS = {
    "biz": ("Business", "商科", "경영"),
    "fin": ("Finance", "财会金融", "재무금융"),
    "it": ("Computing", "计算机", "컴퓨터"),
    "eng": ("Engineering", "工程", "공학"),
    "health": ("Health", "医疗健康", "보건의료"),
    "edu": ("Education", "教育", "교육"),
    "hosp": ("Hospitality", "餐饮酒店", "외식호텔"),
    "build": ("Trades", "建筑技工", "건축기술"),
    "logi": ("Transport", "交通物流", "교통물류"),
    "arts": ("Arts", "艺术传媒", "예술미디어"),
    "hum": ("Humanities", "人文语言", "인문언어"),
    "social": ("Society", "社科心理", "사회심리"),
    "law": ("Law", "法律安全", "법률안전"),
    "sci": ("Sciences", "自然科学", "자연과학"),
    "agri": ("Agriculture", "农林资源", "농림자원"),
    "other": ("Other", "其他", "기타"),
}
"""左栏 16 个大类:键 → (英文, 中文, 韩文);先后即左栏序(catOrder = 下标 + 1)。左栏第一项「热门」不在这里
(热门 16 条走 CIP_POPULAR,接口 ?top=1 另给)。键形 = 2~8 个小写字母(接口按 /^[a-z]{2,8}$/ 收参)。
2026-10-05 效果图复核后定名:中文不超过 4 个字、英文一个词(左栏中文 80px / 英文 96px 一行放下);由草稿 20 类并成 16 类
(数据并进计算机、技工并进建筑、个人服务并进其他、体育并进医疗健康)。韩文同批手写。"""

CIP_CAT_PREFIX_LENS = (7, 5, 2)
"""查大类时依次试的码前缀长度:class 全码 → subseries → series(最细的先命中,同 noc 的 MAJOR_SERIES_BROADS 口径)。"""

CIP_CAT_OF = {
    "01": ("agri",), "03": ("agri",), "04": ("build",), "05": ("social",), "09": ("arts",), "10": ("arts",),
    "11": ("it",), "12": ("other",), "12.05": ("hosp",), "13": ("edu",), "14": ("eng",), "15": ("eng",), "16": ("hum",),
    "19": ("social",), "19.05": ("health", "hosp"), "19.07": ("edu", "social"), "19.09": ("arts",), "21": ("other",),
    "22": ("law",), "23": ("hum",), "24": ("hum",), "25": ("hum",), "26": ("sci",), "27": ("it",), "28": ("law",),
    "29": ("law",), "30.06": ("it",), "30.08": ("it",), "30.12": ("build",), "30.16": ("fin", "it"), "30.30": ("it",),
    "30.31": ("it",), "30.37": ("health",), "30.39": ("it",), "30.48": ("it",), "30.49": ("it",), "30.70": ("it",),
    "30.71": ("it",), "31": ("health",), "31.01": ("hosp",), "31.03": ("hosp",), "31.0601": ("edu",), "38": ("hum",),
    "39": ("hum",), "40": ("sci",), "41": ("sci",), "42": ("social",), "43": ("law",), "44": ("social",),
    "45": ("social",), "46": ("build",), "47": ("build",), "48": ("build",), "49": ("logi",), "50": ("arts",),
    "51": ("health",), "52": ("biz",), "52.0203": ("biz", "logi"), "52.03": ("fin",), "52.0409": ("logi",),
    "52.0410": ("logi",), "52.06": ("fin",), "52.08": ("fin",), "52.09": ("hosp", "biz"), "52.12": ("it", "biz"),
    "52.13": ("fin",), "52.16": ("fin",), "52.17": ("fin",), "52.20": ("build", "biz"), "53": ("other",),
    "54": ("hum",), "55": ("hum",),
}
"""专业 → 左栏大类:键 = series 2 位 / subseries 5 位 / class 7 位(最细的先命中),值 = 大类键(可挂两个)。
挂两处的:52.09 酒店旅游(餐饮酒店 + 商科)、52.12 管理信息系统(计算机 + 商科)、52.20 建筑管理(建筑技工 + 商科)、
52.0203 供应链(商科 + 交通物流)、30.16 会计与计算机(财会金融 + 计算机)、19.05 食品营养(医疗健康 + 餐饮酒店)、
19.07 家庭研究(教育 + 社科心理)。
2026-10-05 效果图复核两轮的改判:31.01 / 31.03 公园休闲研究与管理改挂餐饮酒店(加拿大学院在酒店旅游休闲学院开,
挨着 52.09 旅游,不是医疗);31.0601 户外教育改挂教育;12 系个人服务(美容 / 殡葬 / 赌场)并进其他,只留 12.05 烹饪进餐饮酒店。
series 30(跨学科)没有整系一行:点名的 subseries 走本表,其余按 primary grouping 落(CIP_CAT_SERIES30)。
不进选择器的 series(CIP_SINK_SERIES)不在表里。查不到大类的专业汇装即抛(不硬塞「其他」)。"""

CIP_SERIES_30 = "30"
"""跨学科 series:本表没点名的 subseries 按 primary grouping 落大类(CIP_CAT_SERIES30)。"""

CIP_CAT_SERIES30 = {
    "03": "hum", "04": "social", "05": "biz", "06": "sci", "07": "it", "08": "build", "10": "health", "12": "other",
}
"""series 30 里 CIP_CAT_OF 没点名的 subseries:primary grouping 码 → 大类键(人文 03 / 社科 04 / 商科 05 / 自然科学 06 /
数学计算机 07 / 建筑 08 / 医疗 10 / 其他 12)。"""

CIP_CUSTOM_GROUPS = {
    "eng.mech": ("eng", ("14.19", "14.11", "15.08", "15.1103")),
    "eng.elec": ("eng", ("14.10", "14.47", "15.03")),
    "eng.comp": ("eng", ("14.09", "15.12")),
    "eng.civil": ("eng", ("14.08", "14.04", "14.33", "15.01", "15.02", "15.10")),
    "eng.survey": ("eng", ("14.38", "15.1102")),
    "eng.chem": ("eng", ("14.07", "14.40", "14.43", "14.44", "15.0615")),
    "eng.mat": ("eng", ("14.06", "14.18", "14.20", "14.28", "14.32", "15.16", "15.0607", "15.0611", "15.0617")),
    "eng.aero": ("eng", ("14.02", "15.0801")),
    "eng.marine": ("eng", ("14.22", "14.24", "15.0806")),
    "eng.energy": ("eng", ("14.23", "14.48", "15.14", "15.17")),
    "eng.mining": ("eng", ("14.21", "14.25", "14.39", "15.09")),
    "eng.env": ("eng", ("14.14", "15.05")),
    "eng.ind": ("eng", ("14.27", "14.35", "14.36", "14.37", "15.06", "15.1501", "15.1503")),
    "eng.auto": ("eng", ("14.41", "14.42", "15.04")),
    "eng.draft": ("eng", ("15.13", "15.1502")),
    "eng.safety": ("eng", ("15.07",)),
    "eng.bio": ("eng", ("14.05", "14.45", "15.0401")),
    "eng.general": ("eng", ("14.01", "14.12", "14.13", "14.99", "15.00", "15.1199", "15.1599", "15.99")),
    "logi.mgmt": ("logi", ("52.0203", "52.0409", "52.0410")),
    "other.hs": ("other", ("53.01", "53.02")),
}
"""不是一个 CIP subseries 的专业类:键 → (所在大类, 成员前缀)。前缀是 5 位 subseries 或 7 位 class 码,**最长的前缀赢**
(7 位码能把一个专业从它的 subseries 里拎出来),同长先登记的赢;只在所在大类里生效。2026-10-05 效果图复核立三种:
  ① 工程:CIP 14(工程)与 15(工程技术)照掌上高考「工学」按学科合成 18 类(机械、电气、计算机、土木……);
     14 / 15 里没点名的 subseries 照旧自成一类;
  ② 交通物流:52.0203 供应链 / 52.0409 / 52.0410 合成「物流管理类」(商科里的 52.0203 照旧在工商管理类);
  ③ 其他:53.01 高中文凭 / 53.02 高中证书在用户眼里是一回事,合成「高中课程类」。
名字在 CIP_GROUP_NAMES。"""

CIP_GROUP_FOLD = {"31.9999": "31.05"}
"""并进同大类另一个专业类的专业:class 码 → 专业类键(2026-10-05 效果图复核:公园休闲健身「其他」并进运动机能学类,
免得它自成一个单列类)。先于 CIP_CUSTOM_GROUPS 判。"""

CIP_SINGLE_TO = {
    "fin": {"30.16": "52.03", "52.16": "52.03", "52.17": "52.08"},
    "it": {"27.06": "27.05"},
    "eng": {"14.03": "eng.bio"},
    "health": {"30.37": "51.00", "51.04": "51.05", "51.17": "51.18"},
    "edu": {"31.06": "13.01"},
    "build": {"04.10": "52.20", "04.99": "04.02"},
    "logi": {"49.99": "49.02"},
    "hum": {"39": "39.06"},
    "agri": {"01.80": "01.81"},
    "other": {"12.99": "other.misc"},
}
"""单列专业并类的人工表(2026-10-05 Frank「这下面怎么还有一些单蹦的专业」立;掌上高考每个专业都在一个专业类里,
规则全文见 cip_cat_folded_of):大类键 → {码前缀 → 目标专业类键};前缀是 2 位 series / 5 位 subseries / 7 位 class,
最长的赢;只管分桶后只装一个专业的类(装两个以上的照旧),先于自动规则判。逐条理由(自动规则会放错或放不下的):
  财会金融 30.16 会计学与计算机科学 → 会计类(本大类只有它一个跨学科专业,单独成交叉学科类又是单列);
           52.16 税务 → 会计类、52.17 保险 → 金融类(就近都会落管理科学类;掌上高考保险学在金融学类);
  计算机 27.06 应用统计学 → 统计学类(通用类规则会落数学类);
  工程 14.03 农业工程 → 生物工程类(加拿大的农业工程多已改名生物系统工程,14.45 就在生物工程类;通用类规则会落综合工程类);
  医疗健康 30.37 人类健康设计 → 健康科学（通用）(理由同 30.16);51.04 牙医学 → 口腔医学研究类、51.17 视光学 →
           眼视光辅助类(通用类规则会落健康科学（通用）,同学科的类更贴);
  教育 31.06 户外教育 → 教育学（通用）(本大类没有别的 31 系专业,按规则进其他专业类又是单列);
  建筑技工 04.10 房地产开发 → 建筑管理类(就近会落建筑技术类);04.99 建筑与规划（其他）→ 建筑学类(04 系没有通用类,
           兜底码就近会落码最大的建筑技术类);
  交通物流 49.99 交通运输（其他）→ 陆路运输类(49.01 是航空运输,不是通用类);
  人文语言 39 → 神学类(39 系没有 39.00 / 39.01 通用类,圣经研究 / 宗教教育 / 宗教职业（其他）就近会散进宣教学类、
           宗教机构管理类);
  农林资源 01.80 兽医学 → 兽医临床科学类(通用类规则会落农学（通用）);
  其他 12.99 生活服务（其他）→ 其他专业类(就近会落博彩服务类;同大类的 21.01 技术预备教育按规则也进其他专业类,两个凑一类)。
键要命中本大类至少一个单列专业、目标要是本大类分桶时就有的专业类或本大类的交叉学科类 / 其他专业类,否则汇装即抛
(死键,口径同 CIP_GROUP_DEAD_TPL)。"""

CIP_SERIES_GENERAL_TAILS = (".00", ".01")
"""series 的通用类 subseries 尾码,先到先得(2026-10-05 单列并类立):本大类里有 XX.00 的专业,通用类就是装它的那个类
(46.00 建筑工种、51.00 健康科学这几系的通用类排在 .00,XX.01 是砌筑、脊骨神经医学),否则装 XX.01 的那个类
(11.01 计算机、52.01 商科、14.01 在综合工程类)。"""

CIP_CROSS_TAIL = ".cross"
"""交叉学科类的专业类键尾(键 = 大类键 + 本尾,如 it.cross;2026-10-05 单列并类立):series 30 跨学科专业单列时并进这里。"""

CIP_MISC_TAIL = ".misc"
"""其他专业类的专业类键尾(键 = 大类键 + 本尾,如 law.misc;2026-10-05 单列并类立):本大类没有同 series 折叠类的单列专业、
并完只剩一个专业的交叉学科类,都并进这里;排在本大类所有专业类之后。"""

CIP_SUBSERIES_LEN = 5
"""subseries 码 = class 码前五位(52.0203 → 52.02)。"""

CIP_GROUP_NAMES = {
    "01.00": ("Agriculture", "农学（通用）", "농학 (일반)"),
    "01.01": ("Agribusiness", "农业经济管理类", "농업경영"),
    "01.02": ("Agricultural mechanics", "农业机械化类", "농업기계화"),
    "01.03": ("Farming", "农业生产类", "농업생산"),
    "01.04": ("Food processing", "农产品加工类", "농산물가공"),
    "01.05": ("Animal services", "动物服务类", "동물 서비스"),
    "01.06": ("Horticulture", "应用园艺类", "응용원예"),
    "01.07": ("International agriculture", "国际农业类", "국제농업"),
    "01.08": ("Agricultural services", "农业公共服务类", "농업 공공서비스"),
    "01.09": ("Animal science", "动物科学类", "동물과학"),
    "01.10": ("Food science", "食品科学类", "식품과학"),
    "01.11": ("Plant science", "植物科学类", "식물과학"),
    "01.12": ("Soil science", "土壤科学类", "토양학"),
    "01.13": ("Pre-veterinary", "农学兽医预科类", "농학 및 수의 예과"),
    "01.80": ("Veterinary medicine", "兽医学类", "수의학"),
    "01.81": ("Veterinary sciences", "兽医临床科学类", "수의임상과학"),
    "01.82": ("Veterinary administration", "兽医行政类", "동물병원 행정"),
    "01.83": ("Veterinary technology", "兽医技术类", "동물보건"),
    "01.99": ("Other agriculture", "农学与兽医（其他）", "농학 및 수의 (기타)"),
    "03.01": ("Conservation", "自然资源保护类", "자연자원 보전"),
    "03.02": ("Environmental management", "环境资源管理类", "환경자원 관리"),
    "03.03": ("Fisheries", "渔业科学类", "수산학"),
    "03.05": ("Forestry", "林学类", "산림학"),
    "03.06": ("Wildlife management", "野生动物管理类", "야생동물 관리"),
    "03.99": ("Other natural resources", "自然资源（其他）", "자연자원 (기타)"),
    "04.02": ("Architecture", "建筑学类", "건축학"),
    "04.03": ("Urban planning", "城乡规划类", "도시계획"),
    "04.04": ("Environmental design", "环境设计类", "환경디자인"),
    "04.05": ("Interior architecture", "室内建筑类", "실내건축"),
    "04.06": ("Landscape architecture", "风景园林类", "조경학"),
    "04.08": ("Architectural history", "建筑史与保护类", "건축사와 보존"),
    "04.09": ("Architectural technology", "建筑技术类", "건축기술"),
    "04.10": ("Real estate development", "房地产开发类", "부동산개발"),
    "04.99": ("Other architecture and planning", "建筑学（其他）", "건축학 (기타)"),
    "05.01": ("Area studies", "区域研究类", "지역학"),
    "05.02": ("Gender and ethnicity", "族群与性别研究类", "민족과 젠더 연구"),
    "05.99": ("Other area and ethnic studies", "区域与族群（其他）", "지역 및 민족 연구 (기타)"),
    "09.01": ("Communication studies", "传播学类", "커뮤니케이션학"),
    "09.04": ("Journalism", "新闻学类", "저널리즘"),
    "09.07": ("Broadcasting", "广播电视类", "방송미디어"),
    "09.09": ("Advertising and PR", "广告与公关类", "광고홍보"),
    "09.10": ("Publishing", "出版类", "출판"),
    "09.99": ("Other communication", "新闻传播（其他）", "커뮤니케이션 (기타)"),
    "10.01": ("Communications technology", "传媒技术类", "미디어기술"),
    "10.02": ("Audiovisual technology", "视听技术类", "영상음향 기술"),
    "10.03": ("Graphic communications", "图文传播类", "그래픽 커뮤니케이션"),
    "10.99": ("Other communications technology", "传媒技术（其他）", "미디어기술 (기타)"),
    "11.01": ("General computing", "计算机综合类", "컴퓨터 및 정보과학 (일반)"),
    "11.02": ("Programming", "计算机编程类", "프로그래밍"),
    "11.03": ("Data processing", "数据处理类", "데이터 처리"),
    "11.04": ("Information science", "信息科学类", "정보학"),
    "11.05": ("Systems analysis", "系统分析类", "시스템 분석"),
    "11.06": ("Office applications", "办公软件应用类", "사무자동화"),
    "11.07": ("Computer science", "计算机科学类", "컴퓨터과학"),
    "11.08": ("Software applications", "软件与媒体应用类", "소프트웨어 응용"),
    "11.09": ("Networking", "网络与通信类", "네트워크와 통신"),
    "11.10": ("IT administration", "信息技术管理类", "IT 관리"),
    "11.99": ("Other computing", "计算机（其他）", "컴퓨터 (기타)"),
    "12.03": ("Funeral services", "殡葬服务类", "장례지도"),
    "12.04": ("Cosmetology", "美容美发类", "미용"),
    "12.05": ("Culinary arts", "烹饪与餐饮类", "조리와 외식"),
    "12.06": ("Casino operations", "博彩服务类", "카지노 운영"),
    "12.99": ("Other personal services", "生活服务（其他）", "생활서비스 (기타)"),
    "13.01": ("Education", "教育学（通用）", "교육학 (일반)"),
    "13.02": ("Bilingual education", "双语与多元教育类", "다문화 교육"),
    "13.03": ("Curriculum and instruction", "课程与教学类", "교육과정"),
    "13.04": ("Education administration", "教育管理类", "교육행정"),
    "13.05": ("Educational technology", "教育技术类", "교육공학"),
    "13.06": ("Educational assessment", "教育评估类", "교육평가"),
    "13.07": ("Comparative education", "比较教育类", "비교교육"),
    "13.09": ("Foundations of education", "教育基础理论类", "교육 기초 이론"),
    "13.10": ("Special education", "特殊教育类", "특수교육"),
    "13.11": ("Student counselling", "学生辅导类", "학생상담"),
    "13.12": ("Teaching by level", "分学段师范类", "학교급별 교원양성"),
    "13.13": ("Subject teaching", "分学科师范类", "교과별 교원양성"),
    "13.14": ("ESL and FSL teaching", "第二语言教学类", "제2언어 교육"),
    "13.15": ("Teaching assistants", "教学助理类", "교육 보조"),
    "13.99": ("Other education", "教育学（其他）", "교육학 (기타)"),
    "14.01": ("General engineering", "工程学（通用）", "공학 (일반)"),
    "14.02": ("Aerospace", "航空航天类", "항공우주공학"),
    "14.03": ("Agricultural engineering", "农业工程类", "농업공학"),
    "14.04": ("Architectural engineering", "建筑工程类", "건축공학"),
    "14.05": ("Biomedical engineering", "生物医学工程类", "의공학"),
    "14.06": ("Ceramic engineering", "陶瓷工程类", "세라믹공학"),
    "14.07": ("Chemical engineering", "化学工程类", "화학공학"),
    "14.08": ("Civil engineering", "土木类", "토목공학"),
    "14.09": ("Computer engineering", "计算机工程类", "컴퓨터공학"),
    "14.10": ("Electrical engineering", "电气与电子工程类", "전기전자공학"),
    "14.11": ("Engineering mechanics", "工程力学类", "공학역학"),
    "14.12": ("Engineering physics", "工程物理类", "공학물리"),
    "14.13": ("Engineering science", "工程科学类", "공학과학"),
    "14.14": ("Environmental engineering", "环境工程类", "환경공학"),
    "14.18": ("Materials engineering", "材料工程类", "재료공학"),
    "14.19": ("Mechanical engineering", "机械工程类", "기계공학"),
    "14.20": ("Metallurgical engineering", "冶金工程类", "금속공학"),
    "14.21": ("Mining engineering", "矿业工程类", "광산공학"),
    "14.22": ("Marine engineering", "船舶与海洋工程类", "조선해양공학"),
    "14.23": ("Nuclear engineering", "核工程类", "원자력공학"),
    "14.24": ("Ocean engineering", "海洋工程类", "해양공학"),
    "14.25": ("Petroleum engineering", "石油工程类", "석유공학"),
    "14.27": ("Systems engineering", "系统工程类", "시스템공학"),
    "14.28": ("Textile engineering", "纺织工程类", "섬유공학"),
    "14.32": ("Polymer engineering", "高分子工程类", "고분자공학"),
    "14.33": ("Construction engineering", "施工工程类", "건설공학"),
    "14.34": ("Forest engineering", "森林工程类", "산림공학"),
    "14.35": ("Industrial engineering", "工业工程类", "산업공학"),
    "14.36": ("Manufacturing engineering", "制造工程类", "제조공학"),
    "14.37": ("Operations research", "运筹学类", "운용과학"),
    "14.38": ("Surveying engineering", "测绘工程类", "측량공학"),
    "14.39": ("Geological engineering", "地质工程类", "지질공학"),
    "14.40": ("Paper engineering", "造纸工程类", "제지공학"),
    "14.41": ("Electromechanical engineering", "机电工程类", "기전공학"),
    "14.42": ("Robotics and automation", "机器人与自动化类", "로봇자동화공학"),
    "14.43": ("Biochemical engineering", "生化工程类", "생화학공학"),
    "14.44": ("Engineering chemistry", "工程化学类", "공업화학"),
    "14.45": ("Biosystems engineering", "生物系统工程类", "바이오시스템공학"),
    "14.47": ("Electrical and computer engineering", "电气与计算机类", "전기컴퓨터공학"),
    "14.48": ("Energy engineering", "能源动力类", "에너지시스템공학"),
    "14.99": ("Other engineering", "工程（其他）", "공학 (기타)"),
    "15.00": ("Engineering technology", "工程技术（通用）", "공학기술 (일반)"),
    "15.01": ("Architectural engineering technology", "建筑工程技术类", "건축공학기술"),
    "15.02": ("Civil engineering technology", "土木工程技术类", "토목공학기술"),
    "15.03": ("Electronics technology", "电子工程技术类", "전기전자기술"),
    "15.04": ("Electromechanical technology", "机电技术类", "기전기술"),
    "15.05": ("Environmental control", "环境控制技术类", "환경제어기술"),
    "15.06": ("Industrial production", "工业生产技术类", "산업생산기술"),
    "15.07": ("Quality and safety", "质量与安全技术类", "품질안전기술"),
    "15.08": ("Mechanical technology", "机械工程技术类", "기계공학기술"),
    "15.09": ("Mining and petroleum technology", "采矿与石油技术类", "광산석유기술"),
    "15.10": ("Construction technology", "施工技术类", "건설기술"),
    "15.11": ("Engineering-related technology", "工程相关技术类", "공학 관련 기술"),
    "15.12": ("Computer technology", "计算机技术类", "컴퓨터공학기술"),
    "15.13": ("Drafting and design", "制图与设计类", "설계제도"),
    "15.14": ("Nuclear technology", "核工程技术类", "원자력기술"),
    "15.15": ("Engineering-related fields", "工程相关领域类", "공학 관련 분야"),
    "15.16": ("Nanotechnology", "纳米技术类", "나노기술"),
    "15.17": ("Energy technology", "能源技术类", "에너지기술"),
    "15.99": ("Other engineering technology", "工程技术（其他）", "공학기술 (기타)"),
    "16.01": ("Linguistics and translation", "语言学与翻译类", "언어학과 통번역"),
    "16.02": ("African languages", "非洲语言类", "아프리카어"),
    "16.03": ("East Asian languages", "东亚语言类", "동아시아어"),
    "16.04": ("Slavic languages", "斯拉夫语类", "슬라브어와 발트어"),
    "16.05": ("Germanic languages", "日耳曼语类", "게르만어"),
    "16.06": ("Modern Greek", "现代希腊语类", "현대 그리스어"),
    "16.07": ("South Asian languages", "南亚语言类", "남아시아어"),
    "16.08": ("Iranian languages", "伊朗语言类", "이란어"),
    "16.09": ("Romance languages", "罗曼语类", "로망스어"),
    "16.10": ("Indigenous languages", "美洲原住民语言类", "아메리카 원주민어"),
    "16.11": ("Middle Eastern languages", "中东语言类", "중동어"),
    "16.12": ("Classics", "古典语言类", "고전어"),
    "16.13": ("Celtic languages", "凯尔特语类", "켈트어"),
    "16.14": ("SE Asian languages", "东南亚语言类", "동남아시아와 태평양어"),
    "16.15": ("Central Asian languages", "突厥与中亚语言类", "튀르크어와 중앙아시아어"),
    "16.16": ("Sign language", "手语类", "수어"),
    "16.17": ("Language learning", "第二语言学习类", "제2언어 학습"),
    "16.18": ("Armenian", "亚美尼亚语类", "아르메니아어"),
    "16.99": ("Other languages", "外语（其他）", "외국어 (기타)"),
    "19.01": ("Family and consumer sciences", "家政学（通用）", "가정학 (일반)"),
    "19.02": ("Consumer business", "家政商务类", "소비자 비즈니스"),
    "19.04": ("Consumer economics", "消费经济类", "소비자경제"),
    "19.05": ("Food and nutrition", "食品营养类", "식품영양"),
    "19.06": ("Housing", "住房与人居类", "주거환경"),
    "19.07": ("Family studies", "人类发展与家庭类", "인간발달과 가족"),
    "19.09": ("Apparel and textiles", "服装与纺织类", "의류학"),
    "19.10": ("Work and family", "工作与家庭类", "일과 가족"),
    "19.99": ("Other family and consumer sciences", "家政学（其他）", "가정학 (기타)"),
    "21.01": ("Pre-technology", "技术预备教育类", "기술 예비교육"),
    "22.00": ("Legal studies", "法律通识类", "법률 교양"),
    "22.01": ("Law", "法学类", "법학"),
    "22.02": ("Advanced law", "高级法律研究类", "법학 전문연구"),
    "22.03": ("Legal support", "法律辅助类", "법률사무"),
    "22.99": ("Other law", "法学（其他）", "법학 (기타)"),
    "23.01": ("English", "英语（通用）", "영어영문학 (일반)"),
    "23.13": ("English writing", "英语写作类", "영어 작문"),
    "23.14": ("English literature", "英语文学类", "영문학"),
    "23.99": ("Other English", "英语（其他）", "영어영문학 (기타)"),
    "24.01": ("Liberal arts", "文理通识类", "자유교양"),
    "25.01": ("Library science", "图书情报类", "문헌정보학"),
    "25.03": ("Library assisting", "图书档案辅助类", "사서 보조"),
    "25.99": ("Other library fields", "图书馆学（其他）", "문헌정보학 (기타)"),
    "26.01": ("Biology", "生物学（通用）", "생물학 (일반)"),
    "26.02": ("Biochemistry", "生化与分子生物类", "생화학과 분자생물학"),
    "26.03": ("Botany", "植物学类", "식물학"),
    "26.04": ("Cell biology", "细胞与解剖学类", "세포생물학과 해부학"),
    "26.05": ("Microbiology", "微生物与免疫类", "미생물학과 면역학"),
    "26.07": ("Zoology", "动物学类", "동물학"),
    "26.08": ("Genetics", "遗传学类", "유전학"),
    "26.09": ("Physiology and pathology", "生理与病理类", "생리학과 병리학"),
    "26.10": ("Pharmacology", "药理与毒理类", "약리학과 독성학"),
    "26.11": ("Bioinformatics", "生物信息类", "생물정보학"),
    "26.12": ("Biotechnology", "生物技术类", "생명공학"),
    "26.13": ("Ecology and evolution", "生态与进化类", "생태와 진화"),
    "26.14": ("Molecular medicine", "分子医学类", "분자의학"),
    "26.15": ("Neuroscience", "神经科学类", "신경과학"),
    "26.99": ("Other biology", "生物学（其他）", "생명과학 (기타)"),
    "27.01": ("Mathematics", "数学类", "수학"),
    "27.03": ("Applied mathematics", "应用数学类", "응용수학"),
    "27.05": ("Statistics", "统计学类", "통계학"),
    "27.06": ("Applied statistics", "应用统计类", "응용통계학"),
    "27.99": ("Other math and statistics", "数学与统计（其他）", "수학과 통계 (기타)"),
    "28.08": ("Military leadership", "军事指挥类", "군사학"),
    "29.05": ("Military technology", "军事技术类", "군사기술"),
    "30.00": ("Inclusive education", "融合教育类", "통합교육"),
    "30.01": ("Biological and physical sciences", "生物与物理科学类", "생물과 물리과학"),
    "30.05": ("Peace studies", "和平与冲突研究类", "평화학"),
    "30.06": ("Systems science", "系统科学类", "시스템과학"),
    "30.08": ("Math and computer science", "数学与计算机类", "수학과 컴퓨터과학"),
    "30.10": ("Biopsychology", "生物心理学类", "생물심리학"),
    "30.11": ("Gerontology", "老年学类", "노년학"),
    "30.12": ("Historic preservation", "文物保护类", "문화유산 보존"),
    "30.13": ("Medieval studies", "中世纪与文艺复兴类", "중세와 르네상스"),
    "30.14": ("Museum studies", "博物馆学类", "박물관학"),
    "30.15": ("Science and society", "科技与社会类", "과학기술과 사회"),
    "30.16": ("Accounting and computing", "会计与计算机类", "회계와 컴퓨터과학"),
    "30.17": ("Behavioural sciences", "行为科学类", "행동과학"),
    "30.18": ("Natural sciences", "自然科学类", "자연과학"),
    "30.19": ("Nutrition science", "营养科学类", "영양과학"),
    "30.20": ("Global studies", "国际与全球化类", "국제학"),
    "30.21": ("Holocaust studies", "大屠杀研究类", "홀로코스트학"),
    "30.22": ("Ancient studies", "古典与古代研究类", "고대 문명 연구"),
    "30.23": ("Intercultural studies", "跨文化研究类", "다문화 연구"),
    "30.25": ("Cognitive science", "认知科学类", "인지과학"),
    "30.26": ("Cultural studies", "文化研究类", "문화연구"),
    "30.27": ("Human biology", "人体生物学类", "인체생물학"),
    "30.28": ("Dispute resolution", "纠纷解决类", "분쟁해결"),
    "30.29": ("Maritime studies", "海事研究类", "해사학"),
    "30.30": ("Computational science", "计算科学类", "계산과학"),
    "30.31": ("Human-computer interaction", "人机交互类", "인간과 컴퓨터 상호작용"),
    "30.32": ("Marine science", "海洋科学类", "해양과학"),
    "30.33": ("Sustainability", "可持续发展类", "지속가능성학"),
    "30.34": ("Anthrozoology", "人与动物关系类", "인간과 동물 관계"),
    "30.35": ("Climate science", "气候科学类", "기후과학"),
    "30.36": ("Comparative literature", "文化与比较文学类", "문화연구와 비교문학"),
    "30.37": ("Design for health", "健康设计类", "헬스케어 디자인"),
    "30.38": ("Earth systems science", "地球系统科学类", "지구시스템과학"),
    "30.39": ("Economics and computing", "经济与计算机类", "경제학과 컴퓨터과학"),
    "30.40": ("Economics and languages", "经济与外语类", "경제학과 외국어"),
    "30.41": ("Environmental geosciences", "环境地球科学类", "환경지질학"),
    "30.42": ("Geoarchaeology", "地质考古类", "지질고고학"),
    "30.43": ("Geobiology", "地球生物学类", "지구생물학"),
    "30.44": ("Geography and environment", "地理与环境类", "지리와 환경"),
    "30.45": ("History and literature", "历史与文学类", "역사와 문학"),
    "30.46": ("History and politics", "历史与政治类", "역사와 정치학"),
    "30.47": ("Linguistics and anthropology", "语言与人类学类", "언어학과 인류학"),
    "30.48": ("Computational linguistics", "计算语言学类", "전산언어학"),
    "30.49": ("Mathematical economics", "数理经济类", "수리경제학"),
    "30.50": ("Math and atmospheric science", "数学与大气海洋类", "수학과 대기해양과학"),
    "30.51": ("Philosophy, politics and economics", "政治经济与哲学类", "정치경제철학"),
    "30.52": ("Digital humanities", "数字人文类", "디지털 인문학"),
    "30.53": ("Thanatology", "死亡学类", "죽음학"),
    "30.70": ("Data science", "数据科学类", "데이터과학"),
    "30.71": ("Data analytics", "数据分析类", "데이터 분석"),
    "30.99": ("Other interdisciplinary studies", "跨学科（其他）", "학제간 연구 (기타)"),
    "31.01": ("Recreation studies", "休闲与游憩类", "여가와 레크리에이션"),
    "31.03": ("Recreation management", "休闲设施管理类", "여가시설 관리"),
    "31.05": ("Kinesiology", "体育学类", "체육학"),
    "31.06": ("Outdoor education", "户外教育类", "야외교육"),
    "31.99": ("Other recreation and fitness", "体育与休闲（其他）", "체육과 여가 (기타)"),
    "38.00": ("Philosophy and religion", "哲学与宗教（通用）", "철학과 종교학 (일반)"),
    "38.01": ("Philosophy", "哲学类", "철학"),
    "38.02": ("Religious studies", "宗教学类", "종교학"),
    "38.99": ("Other philosophy and religion", "哲学与宗教（其他）", "철학과 종교학 (기타)"),
    "39.02": ("Biblical studies", "圣经研究类", "성서학"),
    "39.03": ("Missions", "宣教学类", "선교학"),
    "39.04": ("Religious education", "宗教教育类", "종교교육"),
    "39.05": ("Religious music", "宗教音乐类", "종교음악"),
    "39.06": ("Theology", "神学类", "신학"),
    "39.07": ("Pastoral ministry", "牧养与事工类", "목회상담"),
    "39.08": ("Religious administration", "宗教机构管理类", "종교기관 행정"),
    "39.99": ("Other religious vocations", "神学（其他）", "신학 (기타)"),
    "40.01": ("Physical sciences", "物理科学（通用）", "물리과학 (일반)"),
    "40.02": ("Astronomy", "天文学类", "천문학"),
    "40.04": ("Atmospheric sciences", "大气科学类", "대기과학"),
    "40.05": ("Chemistry", "化学类", "화학"),
    "40.06": ("Geology", "地质学类", "지구과학"),
    "40.08": ("Physics", "物理学类", "물리학"),
    "40.10": ("Materials science", "材料科学类", "재료과학"),
    "40.11": ("Physics and astronomy", "物理与天文类", "물리학과 천문학"),
    "40.99": ("Other physical sciences", "物理科学（其他）", "물리과학 (기타)"),
    "41.00": ("Science technology", "实验技术（通用）", "과학 실험기술 (일반)"),
    "41.01": ("Biology technology", "生物实验技术类", "생물 실험기술"),
    "41.02": ("Radiologic technology", "核与放射技术类", "원자력 방사선기술"),
    "41.03": ("Physical science technology", "理化技术类", "이화학 기술"),
    "41.99": ("Other science technology", "实验技术（其他）", "과학 실험기술 (기타)"),
    "42.01": ("Psychology", "心理学（通用）", "심리학 (일반)"),
    "42.27": ("Experimental psychology", "基础心理学类", "기초심리학"),
    "42.28": ("Applied psychology", "临床与应用心理类", "임상과 응용 심리학"),
    "42.99": ("Other psychology", "心理学（其他）", "심리학 (기타)"),
    "43.01": ("Criminal justice", "刑事司法与矫正类", "형사사법과 교정"),
    "43.02": ("Fire protection", "消防类", "소방"),
    "43.03": ("Emergency management", "应急管理类", "재난관리"),
    "43.04": ("Security", "安全科学与技术类", "보안과학"),
    "43.99": ("Other protective services", "安全保卫（其他）", "보안 (기타)"),
    "44.00": ("Human services", "社会服务（通用）", "사회서비스 (일반)"),
    "44.02": ("Community organization", "社区组织类", "지역사회 조직"),
    "44.04": ("Public administration", "公共行政类", "행정학"),
    "44.05": ("Public policy", "公共政策类", "공공정책"),
    "44.07": ("Social work", "社会工作类", "사회복지학"),
    "44.99": ("Other public services", "公共服务（其他）", "행정과 사회복지 (기타)"),
    "45.01": ("General social sciences", "社会科学（通用）", "사회과학 (일반)"),
    "45.02": ("Anthropology", "人类学类", "인류학"),
    "45.03": ("Archaeology", "考古学类", "고고학"),
    "45.04": ("Criminology", "犯罪学类", "범죄학"),
    "45.05": ("Demography", "人口学类", "인구학"),
    "45.06": ("Economics", "经济学类", "경제학"),
    "45.07": ("Geography", "地理学类", "지리학"),
    "45.09": ("International relations", "国际关系类", "국제관계학"),
    "45.10": ("Political science", "政治学类", "정치학"),
    "45.11": ("Sociology", "社会学类", "사회학"),
    "45.12": ("Urban studies", "城市研究类", "도시학"),
    "45.13": ("Sociology and anthropology", "社会与人类学类", "사회학과 인류학"),
    "45.15": ("Geography and anthropology", "地理与人类学类", "지리학과 인류학"),
    "45.99": ("Other social sciences", "社会科学（其他）", "사회과학 (기타)"),
    "46.00": ("Construction trades", "建筑工种（通用）", "건설기능 (일반)"),
    "46.01": ("Masonry", "砌筑类", "조적"),
    "46.02": ("Carpentry", "建筑木工类", "건축목공"),
    "46.03": ("Electrical installation", "电工与线路类", "전기공사"),
    "46.04": ("Building finishing", "建筑装修与检验类", "건축 마감과 검사"),
    "46.05": ("Plumbing", "管道工类", "배관"),
    "46.99": ("Other construction trades", "建筑工种（其他）", "건설기능 (기타)"),
    "47.00": ("Mechanics and repair", "机械维修（通用）", "정비 (일반)"),
    "47.01": ("Electronics repair", "电子设备维修类", "전자기기 정비"),
    "47.02": ("HVAC and refrigeration", "暖通制冷维修类", "공조냉동 정비"),
    "47.03": ("Heavy equipment", "重型设备维修类", "중장비 정비"),
    "47.04": ("Precision repair", "精密设备维修类", "정밀기기 수리"),
    "47.06": ("Vehicle repair", "车辆维修类", "차량 정비"),
    "47.07": ("Energy systems repair", "能源设备维修类", "에너지설비 정비"),
    "47.99": ("Other mechanics and repair", "机械维修（其他）", "정비 (기타)"),
    "48.00": ("Precision production", "精密制造（通用）", "정밀가공 (일반)"),
    "48.03": ("Leather and upholstery", "皮革与软装类", "가죽공예와 천갈이"),
    "48.05": ("Metalworking", "金属加工类", "금속가공"),
    "48.07": ("Woodworking", "木工工艺类", "목공"),
    "48.08": ("Boilermaking", "锅炉制造类", "보일러 제작"),
    "48.99": ("Other precision production", "精密制造（其他）", "정밀가공 (기타)"),
    "49.01": ("Air transport", "航空运输类", "항공운항"),
    "49.02": ("Ground transport", "陆路运输类", "육상운송"),
    "49.03": ("Marine transport", "水上运输类", "해상운송"),
    "49.99": ("Other transport", "交通运输（其他）", "운송 (기타)"),
    "50.01": ("General arts", "艺术学（通用）", "예술 (일반)"),
    "50.02": ("Crafts", "工艺美术类", "공예"),
    "50.03": ("Dance", "舞蹈类", "무용"),
    "50.04": ("Design", "设计学类", "디자인"),
    "50.05": ("Theatre", "戏剧与舞台类", "연극과 무대"),
    "50.06": ("Film and photography", "影视与摄影类", "영화와 사진"),
    "50.07": ("Fine arts", "美术学类", "미술"),
    "50.09": ("Music", "音乐类", "음악"),
    "50.10": ("Arts management", "艺术管理类", "예술경영"),
    "50.11": ("Community art", "社会参与艺术类", "사회참여 예술"),
    "50.99": ("Other arts", "艺术学（其他）", "예술 (기타)"),
    "51.00": ("Health sciences", "健康科学（通用）", "보건과학 (일반)"),
    "51.01": ("Chiropractic", "脊骨神经医学类", "카이로프랙틱"),
    "51.02": ("Speech and hearing", "听力与言语类", "언어청각치료"),
    "51.04": ("Dentistry", "口腔医学类", "치의학"),
    "51.05": ("Dental sciences", "口腔医学研究类", "치의학 전문연구"),
    "51.06": ("Dental support", "牙科辅助类", "치과 보조"),
    "51.07": ("Health administration", "医疗管理类", "의료행정"),
    "51.08": ("Medical assisting", "医疗助理类", "의료 보조"),
    "51.09": ("Allied health", "医学技术类", "의료기술"),
    "51.10": ("Medical laboratory", "医学检验类", "임상병리"),
    "51.11": ("Pre-medicine", "医学预科类", "보건의료 예과"),
    "51.12": ("Medicine", "临床医学类", "의학"),
    "51.14": ("Clinical sciences", "医学研究类", "의과학"),
    "51.15": ("Mental health", "心理健康服务类", "정신건강 서비스"),
    "51.17": ("Optometry", "视光学类", "검안학"),
    "51.18": ("Eye care support", "眼视光辅助类", "안경광학"),
    "51.20": ("Pharmacy", "药学类", "약학"),
    "51.22": ("Public health", "公共卫生类", "공중보건"),
    "51.23": ("Rehabilitation", "康复治疗类", "재활치료"),
    "51.26": ("Health aides", "健康护工类", "요양보호"),
    "51.27": ("Medical informatics", "医学插图与信息类", "의료정보와 의학 일러스트"),
    "51.31": ("Dietetics", "临床营养类", "임상영양"),
    "51.32": ("Medical humanities", "医学人文类", "의료인문학"),
    "51.33": ("Alternative medicine", "替代与补充医学类", "대체의학"),
    "51.34": ("Alternative care aides", "替代医学辅助类", "대체의학 지원"),
    "51.35": ("Massage therapy", "按摩治疗类", "마사지 치료"),
    "51.36": ("Mind-body therapies", "身心疗法类", "심신 치료"),
    "51.37": ("Holistic therapies", "能量与草本疗法类", "에너지와 생약 요법"),
    "51.38": ("Nursing", "护理学类", "간호학"),
    "51.39": ("Practical nursing", "实用护理类", "실무간호와 간호조무"),
    "51.99": ("Other health", "医疗健康（其他）", "보건의료 (기타)"),
    "52.01": ("Business", "商科（通用）", "경영 (일반)"),
    "52.02": ("Management", "工商管理类", "경영학"),
    "52.03": ("Accounting", "会计类", "회계"),
    "52.04": ("Office administration", "行政文秘类", "사무행정"),
    "52.05": ("Business communication", "商务传播类", "비즈니스 커뮤니케이션"),
    "52.06": ("Business economics", "管理经济学类", "경영경제학"),
    "52.07": ("Entrepreneurship", "创业类", "창업"),
    "52.08": ("Finance", "金融类", "금융"),
    "52.09": ("Hospitality", "酒店与旅游管理类", "호텔관광경영"),
    "52.10": ("Human resources", "人力资源类", "인적자원관리"),
    "52.11": ("International business", "国际商务类", "국제경영"),
    "52.12": ("Information systems", "管理信息系统类", "경영정보"),
    "52.13": ("Management science", "管理科学类", "경영과학"),
    "52.14": ("Marketing", "市场营销类", "마케팅"),
    "52.15": ("Real estate", "房地产类", "부동산"),
    "52.16": ("Taxation", "税务类", "세무"),
    "52.17": ("Insurance", "保险类", "보험"),
    "52.18": ("Sales and retail", "销售与零售类", "판매와 유통"),
    "52.19": ("Specialized sales", "专项销售类", "분야별 판매"),
    "52.20": ("Construction management", "建筑管理类", "건설관리"),
    "52.21": ("Telecom management", "电信管理类", "통신경영"),
    "52.99": ("Other business", "商科（其他）", "경영 (기타)"),
    "53.01": ("High school diplomas", "高中文凭类", "고등학교 졸업 과정"),
    "53.02": ("High school certificates", "高中证书类", "고교 졸업 인정"),
    "54.01": ("History", "历史学类", "역사학"),
    "55.01": ("French", "法语（通用）", "불어불문학 (일반)"),
    "55.13": ("French writing", "法语写作类", "프랑스어 작문"),
    "55.14": ("French literature", "法语文学类", "프랑스 문학"),
    "55.99": ("Other French", "法语（其他）", "불어불문학 (기타)"),
    "eng.mech": ("Mechanical", "机械类", "기계"),
    "eng.elec": ("Electrical", "电气类", "전기"),
    "eng.comp": ("Computer engineering", "计算机类", "컴퓨터공학"),
    "eng.civil": ("Civil", "土木类", "토목"),
    "eng.survey": ("Surveying", "测绘类", "측량"),
    "eng.chem": ("Chemical", "化工类", "화학공학"),
    "eng.mat": ("Materials", "材料类", "재료"),
    "eng.aero": ("Aerospace", "航空航天类", "항공우주"),
    "eng.marine": ("Marine", "船舶与海洋类", "조선해양"),
    "eng.energy": ("Energy", "能源动力类", "에너지"),
    "eng.mining": ("Mining", "矿业类", "광업"),
    "eng.env": ("Environmental", "环境类", "환경"),
    "eng.ind": ("Industrial", "工业类", "산업공학"),
    "eng.auto": ("Automation", "自动化类", "자동화"),
    "eng.draft": ("Drafting and design", "制图与设计类", "제도와 설계"),
    "eng.safety": ("Quality and safety", "质量与安全类", "품질과 안전"),
    "eng.bio": ("Bioengineering", "生物工程类", "생명공학"),
    "eng.general": ("General engineering", "综合工程类", "공학 일반"),
    "logi.mgmt": ("Logistics", "物流管理类", "물류관리"),
    "other.hs": ("High school", "高中课程类", "고등학교 과정"),
    "it.cross": ("Interdisciplinary", "交叉学科类", "학제 간"),
    "hum.cross": ("Interdisciplinary", "交叉学科类", "학제 간"),
    "social.cross": ("Interdisciplinary", "交叉学科类", "학제 간"),
    "law.misc": ("Other majors", "其他专业类", "기타 전공"),
    "sci.cross": ("Interdisciplinary", "交叉学科类", "학제 간"),
    "other.cross": ("Interdisciplinary", "交叉学科类", "학제 간"),
    "other.misc": ("Other majors", "其他专业类", "기타 전공"),
}
"""专业类三语名:专业类键 → (英文短名, 中文, 韩文);409 个 CIP subseries(不进选择器的 series 不收)+ 20 个自定专业类。
2026-10-05 效果图批 Opus 手写定稿(本站惯例:Opus 定案的名字为准,自动程序不再覆盖):中文照掌上高考「专业类」写法
(名词 + 类;', general' 写「（通用）」、', other' 写「（其他）」),韩文照 titleKo 的写法,英文是短名(不带 ', general'、
斜杠与学位括注)。手机卡片上折三行(英)/ 两行(中)的几个类头同批改短(Alternative care aides / ESL and FSL teaching /
Heavy equipment / Precision repair / Slavic languages / SE Asian languages / Language learning / Gender and ethnicity;
计算机综合类 / 斯拉夫语类 / 东南亚语言类)。
也是「其他」兜底专业的改名料(cip_en_other_of / cip_zh_other_of 拿专业所在 subseries 的名字派生)。
用到的专业类缺名汇装即抛。
2026-10-05 单列并类(Frank「这下面怎么还有一些单蹦的专业」)再加 7 个:交叉学科类(<大类>.cross,计算机 / 人文语言 /
社科心理 / 自然科学 / 其他五个大类)与其他专业类(<大类>.misc,法律安全 / 其他两个大类),同名同译,用到哪个大类才登记哪个
(并类规则改了冒出新的,汇装照样缺名即抛)。"""

CIP_UNRANKED = 10 ** 6
"""排序里「不在热门清单」的名次(比任何真名次都大,排在热门之后)。"""

CIP_PLACES_DONE_TPL = ("  选择器: {cats} 个大类 / {groups} 个折叠专业类 + {singles} 个单列专业 / {placed} 个专业挂上"
                       "(挂两处的 {twice} 个)")
"""第 3 步收尾报数(选择器那一半;专业类按大类各算,同一个 subseries 挂两个大类算两个)。"""

CIP_CAT_LOST_TPL = "cip_programs 自校未过: 落不到左栏大类的专业 {codes}"
"""第 3 步自校报错:CIP_CAT_OF / CIP_CAT_SERIES30 都查不到(表改版或新 series)。"""

CIP_CAT_UNKNOWN_TPL = "cip_programs 自校未过: 大类键不在 CIP_CATS 里 {cats}"
"""第 3 步自校报错:对照表或自定专业类写了不存在的大类键(多半是拼错)。"""

CIP_CAT_EMPTY_TPL = "cip_programs 自校未过: 一个专业都没有的大类 {cats}"
"""第 3 步自校报错:左栏会出一个点开是空的大类。"""

CIP_GROUP_NAMELESS_TPL = "cip_programs 自校未过: 专业类没有三语名 {groups}"
"""第 3 步自校报错:用到的专业类在 CIP_GROUP_NAMES 里没有名字。"""

CIP_GROUP_DEAD_TPL = "cip_programs 自校未过: 对照表死键(一个专业都没命中) 自定专业类 {groups} / 并类 {folds} / 大类对照 {cats}"
"""第 3 步自校报错(2026-10-05 审查补):CIP_CUSTOM_GROUPS 的成员前缀 / CIP_GROUP_FOLD 的码 / CIP_CAT_OF 的键
一个专业都没命中 —— 多半是码写错一位(写错不会报别的错,那个专业只会悄悄退回自己的 subseries)。"""

CIP_SINGLE_DEAD_TPL = "cip_programs 自校未过: 单列并类表死键(大类键不对 / 没命中单列专业 / 目标专业类不在本大类) {keys}"
"""第 3 步自校报错(2026-10-05 单列并类立):CIP_SINGLE_TO 的 (大类, 前缀) 没命中本大类任何单列专业、或目标专业类
不是本大类原有的类(也不是本大类的交叉学科类 / 其他专业类)—— 写错不会报别的错,那个专业只会悄悄走自动规则、
或顶着别的大类的类名自成单列。"""

# =========================================================================
# 5. 显示名(titleEnShort 英文短名 / titleZh 中文清洗名;cip_programs 步顺手算)
# =========================================================================

K_TITLE_EN_SHORT = "titleEnShort"
"""cip_programs 行键:英文显示名(DB 列 title_en_short;cip_en_short_of 算)。官方长标题照旧在 titleEn(搜索照旧拿它比)。
契约上空串 = 照用 titleEn;本步每行都填(规则清洗不会清成空串,test_cip 守着)。2026-10-05 掌上高考版立。"""

K_TITLE_ZH_RAW = "titleZhRaw"
"""cip_programs 行键:中文机翻定稿(cip_local_name_of 的原样产物;只在 processed / mart,不是 DB 列)。
2026-10-05 起 titleZh 换成它清洗过的显示名(cip_zh_show_of),这一格留底:改清洗规则时有原文可对。"""

CIP_EN_SHORT_FIX = {
    # 热门 16 条:胶囊与卡片上的英文名
    "52.0201": "Business administration", "52.0301": "Accounting", "52.0203": "Supply chain management",
    "52.0901": "Hospitality management", "12.0503": "Culinary arts", "12.0504": "Restaurant management",
    "13.1210": "Early childhood education", "11.0201": "Computer programming", "11.0701": "Computer science",
    "30.7101": "Data analytics", "52.0211": "Project management", "52.1401": "Marketing", "50.0409": "Graphic design",
    "51.3801": "Registered nursing", "51.3902": "Nursing assistant", "15.0805": "Mechanical engineering technology",
    # 规则缩不好的(2026-10-05 效果图批)
    "52.0305": "Accounting and business management", "52.0601": "Managerial economics",
    "11.0301": "Data processing technology", "15.1102": "Surveying technology", "52.0208": "E-commerce",
    "11.0401": "Information science", "39.0201": "Biblical studies", "52.1101": "International business",
    "15.1305": "Electrical drafting and CAD", "04.0301": "Urban and regional planning",
    "14.0201": "Aerospace engineering", "14.0501": "Biomedical engineering", "14.1401": "Environmental engineering",
    "14.4501": "Biosystems engineering", "15.0406": "Automation engineering technology",
    # 2026-10-05 审查补:同根两词规则判不对的
    "51.0811": "Pathologist assistant", "51.0907": "Radiation therapy", "51.0903": "Electroneurodiagnostic technology",
}
"""英文短名人工定名(整格盖过规则,2026-10-05 效果图批手写):热门 16 条的胶囊名 + 规则缩出来不像话或和中文对不齐的。
码不在 CIP 表里汇装即抛。
2026-10-05 审查补三条:51.0811 原名 Pathology/pathologist assistant(助理是职业名,前半留学科会拼出 Pathology assistant)、
51.0907 Radiation therapist/therapeutic radiographer(therapist / therapeutic 被同根规则当一个词)、
51.0903 Electroneurodiagnostic/electroencephalographic(两个不同学科被同根规则吞掉前一个)。"""

CIP_ZH_SHOW_FIX = {
    "14.0401": "建筑工程", "14.3301": "施工工程", "14.4301": "生化工程", "14.3801": "测绘工程", "15.1102": "测绘技术",
    "52.0305": "会计与工商管理", "11.0301": "数据处理技术", "52.0601": "管理经济学", "11.0401": "信息科学",
    "39.0201": "圣经研究", "52.1101": "国际贸易与商务", "15.1305": "电气电子绘图与CAD", "04.0301": "城市与区域规划",
    "52.0208": "电子商务", "10.0105": "传媒技术", "04.9999": "建筑与规划（其他）", "39.9999": "宗教职业（其他）",
    "45.0199": "社会科学通识（其他）", "14.0201": "航空航天工程", "14.0501": "生物医学工程", "14.1401": "环境工程",
}
"""中文显示名人工定名(整格盖过清洗规则;titleZhRaw 不受影响,2026-10-05 效果图批手写):清洗后撞名的、和专业类名
对不齐的、规则漏网的。码不在 CIP 表里汇装即抛。"""

CIP_EN_NOTE_RE = r"\s*\([^)]*\)"
"""英文清洗 ①:去括注整段((RN, ASN, BSN…)这类学位缩写串、(not for credit))。
2026-10-05 审查:(not for credit) 照样先去掉,清洗完由 cip_en_short_of 补回(CIP_EN_NFC)。"""

CIP_EN_NFC = "(not for credit)"
"""不计学分课的括注(2026-10-05 审查立):原名带它的,英文短名清洗完补回到末尾 —— 中文「（不计学分）」本来就留着
(64 行),英文全去掉会中英对不上,还和计学分的同名专业撞名(36.0115 / 50.0901 都是 Music,36.0207 / 49.0109 都是
Remote aircraft pilot)。官方 71 行全是这一种写法(2026-10-05 实测)。"""

CIP_EN_OTHER_RE = r",\s*other$"
"""英文清洗 ②:', other' 结尾 = 兜底类,改成「Other + 主题」(见 cip_en_other_of)。"""

CIP_EN_GENERAL_RE = r",\s*general$"
"""英文清洗 ③:去尾部 ', general'。"""

CIP_EN_LANG_RE = r" languages?, literatures?,? and linguistics$"
"""英文清洗 ④:语言类长尾「X languages, literatures, and linguistics」缩成「X languages」(换成 CIP_EN_LANG_TO)。"""

CIP_EN_LANG_TO = " languages"
"""英文清洗 ④ 的替换串。"""

CIP_EN_SPACE_RE = r"\s+"
"""英文清洗收尾:连续空白并成一个。"""

CIP_EN_SWAPS = (
    ("CAD/CADD", "CAD"),
    (" and/or ", " or "),
    ("technologies/technicians", "technologies"),
    ("technology/technician", "technology"),
)
"""英文斜杠处理第一步:整串替换(按序;CAD/CADD 收成 CAD,and/or 收成 or,technology/technician 只留学科)。"""

CIP_EN_ROLES = (
    "patient care assistant", "kitchen assistant", "histotechnologist", "concrete finisher", "transcriptionist",
    "court reporter", "chef training", "technologist", "perfusionist", "phlebotomist", "receptionist", "pastry chef",
    "boilermaker", "meat cutter", "technician", "programmer", "specialist", "assistant", "installer", "bartender",
    "sommelier", "carpenter", "surveying", "machinist", "drywaller", "operator", "repairer", "mechanic", "manager",
    "analyst", "officer", "plumber", "worker", "cutter", "welder", "clerk", "baker", "mason", "aide",
)
"""英文斜杠处理第二步:去掉斜杠后的 CIP 角色后缀(/technician、/manager、/chef training…);长的在前逐个剥
(同长保持效果图的登记序)。
2026-10-05 审查补 11 个(同长排在原有的之后):welder / plumber / machinist / concrete finisher / drywaller /
perfusionist / histotechnologist / phlebotomist / court reporter / receptionist / transcriptionist —— 题面问的是
「学的什么专业」,斜杠后的职业名不该进显示名(48.0508 Welding technology and welder 这类)。派工写的是 finisher,
登记成 concrete finisher:官方原文是「Concrete finishing/concrete finisher」,单词 finisher 一条都剥不到。"""

CIP_EN_ROLE_RE_TPL = r"/{role}\b"
"""剥角色后缀的正则模板(role 先过 re.escape)。"""

CIP_EN_PAIR_RE = r"([A-Za-z'\-]+)/([A-Za-z'\-]+)"
"""英文斜杠处理第三步:同根两词(nurse/nursing、Mechanical/mechanical)只留长的那个(见 cip_en_pair_of)。
2026-10-05 审查:右边是职业名、左边不是的留左边(therapy/therapist 留 therapy,见 CIP_EN_AGENT_RE);留右边时
首字母照左边的大小写(Biology/biological 出 Biological)。"""

CIP_EN_AGENT_RE = r"(?:ist|er|or|ian)$"
"""职业名后缀(2026-10-05 审查立):同根两词右边符合、左边不符合 = 「学科/从业者」(therapy/therapist、
audiology/audiologist、upholstery/upholsterer),留左边的学科名。2026-10-05 实测进选择器的同根对里命中的全是
真职业名(technician / therapist / counsellor / receptionist…),没有误伤。"""

CIP_EN_ROOT_LEN = 4
"""同根判定:两边都不短于 4 个字母、前 4 个字母(不分大小写)相同。"""

CIP_EN_CHAIN_RE = r"[A-Za-z'\-]+(?:/[A-Za-z'\-]+)+"
"""英文斜杠处理第四步:剩下的斜杠链,两段写「A and B」,三段以上「A, B and C」。"""

CIP_SLASH = "/"
"""斜杠(中英清洗都拿它切)。"""

CIP_SPACE = " "
"""空格(英文切首词、并空白)。"""

CIP_EN_AND = " and "
"""英文斜杠链的末段连接词。"""

CIP_EN_LIST_SEP = ", "
"""英文三段以上斜杠链的前几段分隔。"""

CIP_EN_OTHER_HEAD = "Other "
"""英文兜底类的前缀(「Other + 主题」)。"""

CIP_EN_PROPER = (
    "African", "Armenian", "Biblical", "CAD", "Celtic", "Central", "East", "English", "French", "Germanic", "HVAC",
    "Holocaust", "IT", "Indigenous", "Iranian", "Medieval", "Middle", "Modern", "PR", "Romance", "Slavic", "South",
    "Southeast",
)
"""拼「Other + 主题」时首词不改小写的专名(语言、地区、缩写)。"""

CIP_LCFIRST_MIN = 2
"""首字母改小写的最短长度(短于它、或第二个字母大写的缩写如 IT,原样)。"""

CIP_OTHER_CODE_TAIL = "99"
"""兜底专业:class 码以 99 结尾(52.0299、52.9999);专业类里排最后、名字从专业类名派生。"""

CIP_OTHER_GROUP_TAIL = ".99"
"""兜底专业类:subseries 码以 .99 结尾(52.99);这类里的兜底专业直接用专业类名(「商科（其他）」/「Other business」)。"""

CIP_ZH_NOTE_RE = r"（[A-Za-z0-9 ,.\-]+）"
"""中文清洗 ①:去纯拉丁字母的括注(全角括号里只有学位缩写这类)。"""

CIP_ZH_ROLES = (
    "肉品切割工", "法庭速记员", "牙科卫生师", "厨房助理", "技术员", "分析师", "程序员", "测量员", "面包师", "糕点师",
    "调酒师", "锅炉工", "护理学", "操作员", "安装工", "维修工", "水管工", "机械师", "灌注师", "速记员", "接待员",
    "软包工", "美容师", "经理", "技师", "工人", "焊工",
)
"""中文清洗 ②:去直译角色尾巴「/技术员」「与技术员」「及技术员」这类(长的在前逐个剥)。
2026-10-05 审查补 10 个(同长排在原有的之后),与英文同批补的角色后缀 / 同根规则对齐同一批行:法庭速记员 22.0303、
牙科卫生师 51.0602、水管工 46.0503、机械师 48.0501(顺带 47.0617 发动机技师/机械师)、灌注师 51.0906、速记员 51.0708、
接待员 01.8203 / 51.0712、软包工 48.0303、美容师 12.0401、焊工 48.0508 —— 2026-10-05 实测每个词在全表机翻定稿里
只命中这几行的「/X」,没有误伤。"""

CIP_ZH_AGENT_TAILS = ("师", "家", "员", "工", "士")
"""中文职业尾字(2026-10-05 审查立):两段斜杠且后一段只比前一段多一个尾字(物理治疗/物理治疗师、听力学/听力学家、
理发/理发师)留前一段的学科名(与英文 CIP_EN_AGENT_RE 同一口径);多的不是这几个字的(宗教/宗教学)照旧留长的。"""

CIP_ZH_ROLE_JOINS = ("/", "与", "及")
"""角色尾巴前面的连接符(三种按序剥)。"""

CIP_ZH_SWAPS = (("CAD/CADD", "CAD"),)
"""中文清洗 ③:整串替换。"""

CIP_ZH_AND = "与"
"""中文两段斜杠改写的连接字(「X/Y」→「X与Y」;已有「与 / 及」的不再加)。"""

CIP_ZH_ALSO = "及"
"""中文已有的另一个连接字(有它就不再拼「与」,改顿号)。"""

CIP_ZH_LIST_SEP = "、"
"""中文三段以上(或已有连接字的)斜杠链改顿号。"""

CIP_ZH_GENERAL_MARK = "（通用）"
"""专业类中文名里的「通用」标(兜底专业拿专业类名派生时剥掉)。"""

CIP_ZH_CLASS_TAIL = "类"
"""专业类中文名的尾字(兜底专业拿专业类名派生时剥掉:「会计类」→「会计（其他）」)。"""

# =========================================================================
# 6. 自测(用例住 scheme 的 StatcanCipTest / StatcanCipPlacesTest)
# =========================================================================

TEST_VERBOSITY = 2
"""unittest 运行档:逐条打用例名与结果(同 gcjobs / mart / pnp.qc 自测)。"""
