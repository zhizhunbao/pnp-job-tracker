"""
classify 域常量 —— 路径 / mart 键 / NOC 语料 / 模型接线 / 候选检索 / 判定提示词 / 记录 / 试点 / 打印模板
(照 jdformat 三件套样张:段横幅三行框 + N. 编号,与 scheme.py / functions.py 同名同序镜像;
每个常量赋值后裸字符串 docstring)。
判据:常量只装 JSON 装得下的(标量 / 字符串表 / 正则)+ IN/OUT 路径;唯一特批 import = os / re 与 paths。
"""
import os
import re

import paths

# =========================================================================
# 1. 输入输出(IN/OUT 住模块头,运行时打印)
# =========================================================================

IN_MART_JOBS = paths.MART / "jobs.json"
"""汇装好的岗位表(load 域 build 链每小时产):本域只读它 —— 在招 / 标题 / 正文 / 职业码四格一处齐,
externalId 也是它定的,mart 回并就按这把键。"""

IN_NOC_DESC = paths.NOC / "descriptions.json"
"""官方职业描述(noc 域产):byNoc = 五位码 → 官方类名 + 职责清单,候选检索的语料底子。"""

OUT_JOBS = paths.PROCESSED_CLASSIFY / "jobs.json"
"""本域产物:externalId → LabelRecord(判出的职业码、判法、候选、版本、时刻)。
只留当前 mart 在招且未分类的岗(不在列的每轮剪掉:已判的码随上一轮汇装进了库)。"""

IN_GOLD = paths.RAW / "classify" / "gold_jobs.json"
"""人工核对的标准答案(externalId → {verdict, accept, was, title}):2026-09-15 首轮 211 条逐条复核的结论,
判定层测试惯例的「手写金标」。verdict=ok 判对、wrong 判错(accept 记可接受的码,可能不止一个)、
unsure 我拿不准的(算分时跳过,不算对也不算错)。改口径后 `--only score` 自动对分,不再人工重看一遍。"""

K_VERDICT = "verdict"
"""金标行:人工结论。"""

K_ACCEPT = "accept"
"""金标行:可接受的码清单(判出的码在里面就算对)。"""

K_GOLD_TITLE = "title"
"""金标行:岗位标题(打印错判时给人看)。"""

VERDICT_UNSURE = "unsure"
"""金标结论:拿不准,算分时跳过。"""

OUT_PILOT_SAMPLE = paths.PROCESSED_CLASSIFY / "pilot_sample.json"
"""试点抽到的岗位清单(externalId 数组):抽过一次就钉死,以后重出核对表只认这份。
2026-09-15 实撞:种子定死也不够 —— build 每小时重算 mart,池子一变,同一个种子抽出来的是另一批
(重出表时凭空多判了 166 条)。要重新抽样就删掉这个文件。"""

OUT_PILOT = paths.PROCESSED_CLASSIFY / "pilot_jobs.tsv"
"""试点核对表(人工复核用,Excel 直开):一行一岗,带标题、判出的码、官方类名、候选与相似度。
不是数据链产物,mart 不读它。"""

TEXT_ENCODING = "utf-8"
"""读写文件的编码。"""

JSON_INDENT = 1
"""产物缩进(大表 1 省体积,同 jdformat 的 formatted.json)。"""

FLUSH_N = 20
"""每判多少条落一次盘(一轮可能几十分钟,中途被杀不丢已做的)。"""

RETRY_FAILED_DAYS = 7
"""失败记录的冷却天数:判不出多半是这条帖本身(标题含糊、正文全是福利),隔一周再试一次,不每轮重打。"""

DEFAULT_LIMIT = 400
"""每轮条数的默认上限(环境变量写坏时也退回它)。"""

CLASSIFY_LIMIT = os.environ.get("CLASSIFY_LIMIT", str(DEFAULT_LIMIT))
"""每轮最多判多少条(本地验收可压小:CLASSIFY_LIMIT=5)。形同 jdformat 的 JDFORMAT_LIMIT。"""

# =========================================================================
# 2. mart 岗位行的键
# =========================================================================

K_EXTERNAL_ID = "externalId"
"""mart 岗位行:全站岗位身份键(jb: / ats: / 板名: 前缀形)。"""

K_STATUS = "status"
"""mart 岗位行:open / campus(closed 不在 jobs.json 里)。"""

K_TITLE = "title"
"""mart 岗位行:职位标题(判定的主证据,空标题不判)。"""

K_DESCRIPTION = "description"
"""mart 岗位行:岗位正文(判定的次证据;空正文只拿标题判,仍然判)。"""

K_NOC = "noc"
"""mart 岗位行:五位职业码(非空 = 源带码或规则已判出,本域一律不碰)。"""

K_ORIGIN = "origin"
"""mart 岗位行:渠道(哪个爬虫抓进来的;试点按它分层抽样)。"""

K_CITY = "city"
"""mart 岗位行:城市(只进核对表,给人看上下文,不进判定)。"""

K_DATE_POSTED = "datePosted"
"""mart 岗位行:发布日(ISO;本域按它新→旧排队 —— 新帖先判,用户先看到的也是它们)。"""

OPEN_STATUSES = ("open", "campus")
"""要判的状态:职位板与校内渠道的帖都要分类(口径同 jdformat)。"""

FIELD_NONE = ""
"""空值:读 mart 行、读环境、判定失败时的统一空串(函数体零字面量,空串也从这里取)。"""

# =========================================================================
# 3. NOC 语料(候选检索的底子)
# =========================================================================

K_BY_NOC = "byNoc"
"""官方描述文件的顶层键:五位码 → 一条职业。"""

K_NOC_CODE = "noc"
"""官方描述行:五位码。"""

K_NOC_TITLE = "title"
"""官方描述行:官方类名(英文)。"""

K_DUTIES = "duties"
"""官方描述行:职责清单(字符串数组)。"""

DUTIES_MAX = 6
"""一条职业进语料的职责条数上限(前几条已经说清这份工在干什么,再多只摊薄相似度)。"""

EXAMPLES_MAX = 8
"""一条职业进语料的官方示例职称条数上限(示例职称最贴帖子标题的写法,是命中的主力)。"""

CORPUS_TPL = "{title}. Example job titles: {examples}. Main duties: {duties}"
"""一条职业的语料文本(官方类名 + 示例职称 + 职责;与岗位文本同一个嵌入模型编码后比相似度)。"""

DUTY_SEP = " "
"""职责条之间的分隔(句号已在原文里,空格接上即可)。"""

EXAMPLE_SEP = "; "
"""示例职称之间的分隔。"""

# =========================================================================
# 4. 模型接线(局域网 Ollama;与 jdformat / news / company 同一台盒子同一个变量)
# =========================================================================

ENV_LLM_BASE = "NEWS_LLM_BASE"
"""局域网 Ollama 基址的环境变量(不另立名字:一台盒子一个变量)。"""

ENV_LLM_MODEL = "NEWS_LLM_MODEL"
"""判定用模型名的环境变量(缺省 LLM_MODEL_DEFAULT)。"""

LLM_MODEL_DEFAULT = "qwen3.6:latest"
"""盒子上的默认判定模型(与 jdformat 同型号,口径一致)。"""

ENV_EMBED_MODEL = "CLASSIFY_EMBED_MODEL"
"""候选检索用嵌入模型名的环境变量(缺省 EMBED_MODEL_DEFAULT)。"""

EMBED_MODEL_DEFAULT = "bge-m3:latest"
"""盒子上的嵌入模型(1024 维;2026-09-15 实测暖机后 13 毫秒一条)。"""

URL_TAIL_SLASH = "/"
"""基址末尾要削掉的斜杠。"""

PATH_OLLAMA_GENERATE = "/api/generate"
"""Ollama 单轮生成端点(判定层用)。"""

PATH_OLLAMA_EMBED = "/api/embed"
"""Ollama 批量嵌入端点(候选检索层用)。"""

P_MODEL = "model"
"""请求体键:模型名。"""

P_PROMPT = "prompt"
"""请求体键:提示词。"""

P_STREAM = "stream"
"""请求体键:是否流式(一律 False,整段回)。"""

P_THINK = "think"
"""请求体键:思考模式(一律 False —— 只要一个码,思考纯烧预算)。"""

P_OPTIONS = "options"
"""请求体键:采样参数。⚠ 不传 num_ctx:2026-09-15 jdformat 实撞,显式上下文长度与别的调用点不一致会让
Ollama 每条都重载模型(一条 50~85 秒),去掉即稳。"""

P_NUM_PREDICT = "num_predict"
"""采样参数键:最多生成多少 token。"""

P_TEMPERATURE = "temperature"
"""采样参数键:温度。"""

P_RESPONSE = "response"
"""生成回包键:模型答复正文。"""

P_INPUT = "input"
"""嵌入请求体键:待编码文本数组。"""

P_EMBEDDINGS = "embeddings"
"""嵌入回包键:与输入同序的向量数组。"""

GEN_TOKENS = 16
"""判定的生成上限:答案只有一个五位码或 NONE,给足余量即可。"""

LLM_TEMPERATURE = 0.0
"""判定温度:零 —— 同一条帖每次判出同一个码,便于复核与回归。"""

CLIENT_TIMEOUT_S = 120
"""单次请求超时(秒):嵌入一批 32 条与单条判定都在这个量级内。"""

EMBED_BATCH = 32
"""一次嵌入请求打包多少条文本(实测 32 条 0.42 秒;再大只增单请求风险不增吞吐)。"""

THINK_RE = re.compile(r"<think>.*?</think>", re.S)
"""剥 think 块(模型模板不认 think=False 时的双保险,同 jdformat)。"""

STRIP_REPL = ""
"""剥 think 块的替换串。"""

NOTE_HTTP_TPL = "http {status}"
"""非 2xx 的由头(进记录 note)。"""

NOTE_NO_LLM = "✗ 没配 NEWS_LLM_BASE(局域网盒子地址),本域不跑"
"""缺盒子地址时的提示(手动件缺配置不是代码病,直接退)。"""

NET_ERRORS = ("ConnectError", "ConnectTimeout", "ReadTimeout", "ConnectionError")
"""判为「盒子连不上」的异常类名:整轮中止,不记失败、不进冷却(jdformat 同款闸,Frank 出门时实撞)。"""

# =========================================================================
# 5. 候选检索
# =========================================================================

CAND_K = 20
"""给模型看几个候选:多了摊薄注意力、提示词变长,少了真码可能不在列。
2026-09-15 首跑三条实撞两条真码不在候选里(Extrusion Assistant Foremen 缺「塑料橡胶制造业主管」、
Soudeur 缺「焊工」),8 → 12 → 20 放宽。候选是判定的天花板:真码不在列,模型再老实也只能选错的;
宁可多给几个让它挑,也不能漏。试点核对表带候选码,就是为了量这一层到底漏多少。"""

TITLE_QUERY_TPL = "{title}"
"""标题单独做一次检索的文本(与「标题+正文」那次并行 —— 正文里的福利、公司介绍会稀释标题信号,
法语标题尤其明显;两次取每个码的最好成绩合并)。"""

QUERIES_PER_JOB = 2
"""一条岗发几次检索查询(标题一次、标题+正文一次;嵌入 13 毫秒一条,翻倍也便宜)。"""

LOW_SCORE = 0.45
"""检索太弱的门槛:最高分低于它 = 这条帖的语言跟英文语料对不上,先翻标题再查一次。
2026-09-15 实测定值:英文 Welder 查「焊工」得 0.614 排第一;法语 Soudeur 只有 0.337、焊工掉到第 121,
且前几名全挤在 0.33 一带(等于没信号)。0.45 落在两者中间,英文帖基本不会被误判成弱。"""

TRANSLATE_PROMPT_TPL = """Translate this job title to English. If it is already English, repeat it unchanged.
Answer with the translated title only, no quotes, no explanation.

Job title: {title}

English:"""
"""翻标题的提示词(只翻标题:正文长且多是福利套话,翻它不划算;标题才是检索的主信号)。"""

TRANSLATE_TOKENS = 32
"""翻标题的生成上限(一个职位名而已)。"""

TITLE_EN_MAX = 120
"""翻回来的标题超过这个长度就当模型跑题,弃用译文、留原标题。"""

JOB_TEXT_TPL = "{title}. {body}"
"""岗位进嵌入的文本(标题在前 —— 标题是最强信号,正文截断后接在后面)。"""

BODY_MAX_LEN = 1200
"""岗位正文进嵌入的截断长度:开头一般是职责,后面多是福利与申请说明,留着反而稀释。"""

PROMPT_BODY_MAX = 2000
"""岗位正文进判定提示词的截断长度(比嵌入那份宽:模型要读细节,但不能把整帖塞进去)。

2026-09-16 **v5 试过 4000,已回退**(Frank「试一下」):动机是实测弃权的 47 条正文中位 4,151 字,
其中 10 条的职责段落在 2000 字之后被截掉(帖子开头多是公司介绍、语言要求、合同类型)。
结果:弃权 47 → 33、多判出 14 条(抽看质量尚可,只 1 条明显错),但**对金标从 93% 掉到 87%** ——
10 条原本判对的被改掉,其中 3 条明显变差(ASIC 数字设计架构师 电子工程师→机械工程师;
技术支持专员 用户支持→电子工程师;透析助理 护理助手→其他技术职业)。
病因与 v3 加规则翻车同源:**喂进去的东西一多,标题信号被稀释,注意力漂走**。
按「宁可留空不瞎猜」回退 —— 分类要喂 TEER 与省提名信号,判错比留空伤得重。
下一步该试的是**定点补料**(只在 2000 字外检测到职责段时把那一段接上),不是整段放宽。"""

# =========================================================================
# 6. 判定提示词与校验
# =========================================================================

PROMPT_TPL = """You classify Canadian job postings into the official National Occupational Classification (NOC 2021).

Rules:
- Choose exactly ONE code from the candidate list below, copied exactly.
- Judge by the actual work described, not by the employer's industry.
- Supervisory titles (supervisor, foreman, forewoman, lead hand, team leader, manager) belong to a
  supervisor or manager code, not to the code for the workers being supervised.
- If no candidate matches the work described, answer NONE.
- Answer with the five-digit code only, or NONE. No other words.

Candidates:
{cands}

Job title: {title}
Job posting:
{body}

Answer:"""
"""判定提示词:候选表 + 岗位。三条硬约束 —— 只能从候选里选、按实际干的活判(不按雇主行业)、
拿不准答 NONE。答案只要一个码,便于校验。"""

CAND_LINE_TPL = "{code} {title} — {duties}"
"""候选表的一行:码 + 官方类名 + 职责摘要(模型靠职责分辨相近的码)。"""

CAND_DUTIES_MAX = 2
"""候选行里放几条职责(提示词长度与分辨力的折中)。"""

CAND_JOIN = "\n"
"""候选行之间的分隔。"""

ANSWER_NONE = "NONE"
"""模型弃权的答案词(判不出就留空,不硬塞 —— 宪法「清洗宁可留空不瞎猜」)。"""

CODE_RE = re.compile(r"\b(\d{5})\b")
"""从答复里抠五位码(模型偶尔会多说一个词,抠出来再验是否在候选里)。"""

ST_OK = "ok"
"""记录状态:判出了码(且在候选表里)。"""

ST_FAIL = "fail"
"""记录状态:弃权、答非候选、空答复或盒子出错(note 记由头)。"""

METHOD_MODEL = "model"
"""判法:候选检索 + 模型选择(将来规则层搬进本域后,那层记 rule)。"""

CLASSIFY_V = 6
"""判定口径版本号(先例:译文 TRANS_V)。换模型 / 改提示词 / 改候选数 → 加一,旧版模型记录整批作废重跑;
读记录时版本不对当没判过。
v2(2026-09-15):提示词加「领班/主管类标题归主管码」一条 —— 首跑 Extrusion Assistant Foremen 的真码
(塑料橡胶制造业主管)已经在候选里,模型仍选了普工码;这是 NOC 的通用口径,不是为这一条帖打补丁。
v3(2026-09-15):首轮 211 条人工复核后加四条,对着实测出来的三类错:
  · 级别错(junior 供应链专员判成供应链主管)→ 加「junior/assistant/coordinator 不是主管码」;
  · 职能错(卖云服务判成业务系统专员、做信用风险模型判成数据库管理员)→ 加「按干的事分类不按用的工具」
    与「销售就是销售,产品再技术也一样」;
  · 字面错(标题明写 Mechanical Engineering 判成土木)→ 加「标题点名了职业就选那个职业」。
复核结论:10 条明显错里 8 条真码就在候选表里 —— 瓶颈已从检索转到判定层,所以这一版只动提示词。
v4(2026-09-15,**回退 v3 的四条,提示词逐字回到 v2**):v3 对金标实测 80%,比 v2 的 93% 差。
拆开看:改对 1 条、仍错 9 条(其中 4 条换了码还是错,「云和 AI 销售」从业务系统专员变成网络安全专家,更远)、
18 条原本判对的被改掉(微生物生态学研究生 → 化学家、金属厂杂工 → 化工厂杂工),弃权从 47 涨到 52。
结论:**规则越加越糊** —— 四条规则同时上,模型在候选里的注意力被带偏,收益一条、代价一片。
以后要调口径,一次只加一条,每次对金标算分;没有金标就别凭感觉改。"""

NOTE_EMPTY = "empty answer"
"""由头:模型回了空。"""

NOTE_OFF_LIST = "off-list code"
"""由头:模型给的码不在候选表里(防它自己编码)。"""

NOTE_ABSTAIN = "abstain"
"""由头:模型明确答 NONE(这是允许的结果,不是错误)。"""

# =========================================================================
# 7. 试点抽样(人工核对一轮准确率用;不是数据链的一部分)
# =========================================================================

PILOT_N = 200
"""试点抽多少条(Frank 人工核对的量级)。"""

PILOT_SEED = 20260915
"""抽样随机种子:定死 —— 同一份 mart 重跑抽到同一批,复核结果能对上。"""

PILOT_MIN_PER_ORIGIN = 5
"""每个渠道至少抽几条(小渠道 HireAC / CareerBeacon 也要有样本,否则按比例会被抽空)。"""

PILOT_HEADERS = ("externalId", "origin", "city", "title", "noc", "nocTitle", "status", "note", "body",
                 "candidates")
"""核对表的列(第一行表头)。2026-09-15 Frank「加上 job describe 呢」补 body 列:
只有标题时「Coordinator」这类根本没法人工判对错 —— 复核要看模型看到的同一份料。"""

PILOT_BODY_MAX = 500
"""核对表里正文摘要的长度:开头一般就是职责,够人工判「这活是什么」;整段进表会把表撑得没法看。"""

WS_RE = re.compile(r"\s+")
"""连续空白归一成一个空格(正文里的换行与制表符进 TSV 会串行串列)。"""

TSV_SEP = "\t"
"""核对表列分隔(TSV:Excel 直开,标题里的逗号不会串列)。"""

LINE_SEP = "\n"
"""核对表行分隔。"""

CAND_SCORE_SEP = " "
"""核对表里候选码之间的分隔(相似度不进表:记录里只留候选码 —— 复核要回答的是「真码在不在候选里」,
在=判定层的锅,不在=检索层的锅,相似度数值帮不上这个判断)。"""

TAB_REPL = " "
"""标题里可能混进的制表符替换成空格(否则串列)。"""

# =========================================================================
# 8. 打印模板
# =========================================================================

PRINT_IN_TPL = "IN jobs : {jobs}\nIN noc  : {noc}"
"""开工报路径。"""

PRINT_TARGETS_TPL = "未分类在招岗 {todo} 条 · 已判缓存 {cache} 条 · 本轮 {n} 条(上限 {limit},判定模型 {model})"
"""报本轮候选与预算。"""

PRINT_CORPUS_TPL = "NOC 语料 {docs} 条 → 嵌入完成({embed},{secs} 秒)"
"""报语料嵌入完成。"""

PRINT_WEAK_TPL = "检索太弱 {n} 条(最高分 < {floor}),翻标题后重查"
"""报有多少条走了「翻标题重查」那条补救路(法语帖占大头)。"""

PRINT_JOBS_EMBED_TPL = "岗位嵌入 {n} 条完成({secs} 秒);下面换判定模型,逐条选码"
"""报岗位嵌入完成(两相先后跑完,避免嵌入与判定交替换模型)。"""

PRINT_DONE_TPL = "本轮 ✓ 判出 {ok} · ○ 弃权 {abstain} · ✗ 失败 {fail},累计已判 {total} 条 → {out}"
"""收尾报数。"""

PRINT_ABORT_TPL = "✗ 盒子连不上({note}),本轮中止;已判的照常落盘,没判的不记失败,下一轮重试"
"""盒子掉线的整轮中止提示。"""

PRINT_PILOT_TPL = "试点 {n} 条:判出 {ok} · 弃权 {abstain} · 失败 {fail} → {out}"
"""试点收尾报数(准确率要人工核对表回填,机器不自评)。"""

PRINT_PILOT_ORIGIN_TPL = "  {origin}: 抽 {n} 条,判出 {ok} 条"
"""试点按渠道分行报数。"""

PRINT_SCORE_TPL = "对金标 {n} 条(跳过存疑 {skip} 条):判对 {hit} · 判错 {miss} · 这轮没判 {none} → 准确率 {pct}%"
"""算分收尾报数。"""

PRINT_SCORE_ROW_TPL = "  ✗ {title} | 判成 {got} · 可接受 {accept}"
"""算分时逐条打印判错的行。"""

PRINT_NO_GOLD_TPL = "✗ 没有金标文件({path}),先人工核对一轮再算分"
"""缺金标时的提示。"""
