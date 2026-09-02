"""pte.constants — 词表(SOURCE / bundle 发现 / JS 字面量→JSON 规范化记号 / 题型签名 / IN·OUT 路径)。

2026-09-01 立域。ynwac 整库是前端 bundle 里的 webpack 数据模块(`const r=[{…}]`),
每类一模块;抓取只需 httpx 直取公开静态文件(登录只锁 AI 评分,题目本体零鉴权)。
解析 = 字符串感知地把 JS 对象字面量(无引号键 / `!0`·`!1` 布尔 / 单双反引号)规范化成 JSON。
constants 叶零 import 的方言,唯一特批 = paths(IN/OUT 路径经它解析)。
"""
import re

from paths.constants import PROCESSED_PTE, RAW_PTE

# =========================================================================
# 1. SOURCE 与 bundle 发现(禁猜 hash:从首页 HTML 现抽 main.<hash>.js)
# =========================================================================

INDEX_URL = "https://ynwac.com/zh"
"""ynwac 首页(抽 bundle 地址的起点)。"""

SITE_ORIGIN = "https://ynwac.com"
"""站点源(拼 bundle 绝对地址)。"""

BUNDLE_RE = re.compile(r"/static/js/main\.[0-9a-f]+\.js")
"""首页 HTML 里的主 bundle 相对路径(hash 每次部署变,现抽不写死)。"""

HTTP_TIMEOUT_S = 60.0
"""bundle 4.7MB,超时给宽。"""

# =========================================================================
# 2. 数据模块定位(webpack `const r=[…]` 数组,bracket 配平抽取)
# =========================================================================

ARRAY_HEAD_RE = re.compile(r"const r=(\[)")
"""题库数据模块签名:`n.d(t,{d:()=>r});const r=[…]`,组 1 = 起始 `[`。"""

MIN_ARRAY_LEN = 20
"""数组文本短于此当空模块跳过(bundle 里有 `[]`/`[0]` 之类噪音)。"""

BRACKET_OPEN = "["
"""数组开括号(配平计数)。"""

BRACKET_CLOSE = "]"
"""数组闭括号。"""

BACKSLASH = "\\"
"""转义引导符(字符串内 \\X 整体跳过)。"""

QUOTE_CHARS = ("\"", "'", "`")
"""JS 三种字符串定界符(扫描时进出字符串态)。"""

# =========================================================================
# 3. JS 字面量 → JSON 规范化(字符串感知,纯数据假设)
# =========================================================================

DQUOTE = "\""
"""JSON 唯一合法定界符(单/反引号归一到它)。"""

ESCAPE_DQUOTE = "\\\""
"""内容里的裸双引号 → 转义双引号。"""

VALID_ESCAPE_NEXT = frozenset("\"\\/bfnrtu")
"""JSON 合法转义的次字符集;不在其中的 \\X 把反斜杠自身转义成字面量(保真不炸解析)。"""

ESCAPED_BACKSLASH = "\\\\"
"""字面量反斜杠的 JSON 写法(非法转义序列的兜底)。"""

BANG = "!"
"""`!0`/`!1` 布尔的引导符。"""

BOOL_TRUE_DIGIT = "0"
"""`!0` = true 的数字位。"""

BOOL_FALSE_DIGIT = "1"
"""`!1` = false 的数字位。"""

NOT_FOUND = -1
"""bracket 配平找不到闭括号的哨兵返回。"""

TRUE_LIT = "true"
"""JSON 真。"""

FALSE_LIT = "false"
"""JSON 假。"""

CTRL_ESCAPES = (("\n", "\\n"), ("\r", "\\r"), ("\t", "\\t"))
"""字符串内裸控制字符 → JSON 转义(JSON 串禁裸控制字符)。"""

KEY_QUOTE_RE = re.compile(r"([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)")
"""无引号标识符键 → 加引号(`{`/`,` 之后、`:` 之前的裸键)。"""

KEY_QUOTE_SUB = r'\1"\2"\3'
"""键加引号替换式。"""

TRAILING_COMMA_RE = re.compile(r",(\s*[}\]])")
"""结尾多余逗号(JSON 不容)。"""

TRAILING_COMMA_SUB = r"\1"
"""去尾逗号替换式。"""

# =========================================================================
# 4. 题型标注(best-effort:按标志键给人话标签;拿不准留空,原样签名不丢)
# =========================================================================

K_ID = "id"
"""题目主键(几乎每类都有)。"""

K_ANSWER = "answer"
"""ASQ 答案键。"""

K_QUESTION = "question"
"""问题文本键。"""

K_IMAGE_URL = "imageUrl"
"""DI 图片键。"""

K_DUOMO_LINK = "duomoLink"
"""RA 的 duoink.co 交叉链接键(各平台同源信号)。"""

K_PARAGRAPHS = "paragraphs"
"""ROP 乱序段落键。"""

K_SUMMARY = "summary"
"""SWT 摘要键。"""

K_DISPLAY_TEXT = "displayText"
"""SST/听力朗读文本键。"""

K_AUDIO_URL = "audioUrl"
"""听力音频键。"""

K_OPTIONS = "options"
"""选择题选项键。"""

K_CORRECT_ANSWERS = "correctAnswers"
"""多选正确项键(复数 = 多选)。"""

K_TRANSCRIPT_WITH_BLANK = "transcriptWithBlank"
"""听力填空的挖空文稿键。"""

K_BLANKS = "blanks"
"""阅读填空的空位键。"""

K_TEXT = "text"
"""通用正文键(WFD/词表类)。"""

LABEL_ASQ = "ASQ · Answer Short Question"
"""标签:回答简短问题(口语)。"""

LABEL_DI = "DI · Describe Image"
"""标签:看图说话(口语)。"""

LABEL_RA = "RA · Read Aloud"
"""标签:朗读(口语)。"""

LABEL_ROP = "ROP · Re-order Paragraphs"
"""标签:段落排序(阅读)。"""

LABEL_SWT = "SWT · Summarize Written Text"
"""标签:写作缩写(写作)。"""

LABEL_L_FIB = "L-FIB · Listening Fill in the Blanks"
"""标签:听力填空。"""

LABEL_MCM = "MCM · Multiple-Choice Multiple"
"""标签:多选(选项 + 多正确项)。"""

LABEL_MCS = "MCS · Multiple-Choice Single"
"""标签:单选(选项 + 单正确项)。"""

LABEL_SST = "SST · Summarize Spoken Text"
"""标签:听力缩写(音频 + 朗读文本)。"""

LABEL_R_FIB = "R-FIB · Reading Fill in the Blanks"
"""标签:阅读填空(有 blanks 无音频)。"""

LABEL_WFD = "WFD/word-list · text-only"
"""标签:纯文本类(听写/词表,仅 id+text)。"""

LABEL_UNKNOWN = ""
"""拿不准:留空,靠 signature + array_index 人工核。"""

LABEL_RULES = (
    ((K_DUOMO_LINK,), LABEL_RA),
    ((K_IMAGE_URL,), LABEL_DI),
    ((K_PARAGRAPHS,), LABEL_ROP),
    ((K_SUMMARY,), LABEL_SWT),
    ((K_DISPLAY_TEXT,), LABEL_SST),
    ((K_TRANSCRIPT_WITH_BLANK,), LABEL_L_FIB),
    ((K_AUDIO_URL,), LABEL_SST),
    ((K_OPTIONS, K_CORRECT_ANSWERS), LABEL_MCM),
    ((K_OPTIONS, K_QUESTION), LABEL_MCS),
    ((K_BLANKS,), LABEL_R_FIB),
    ((K_ANSWER, K_QUESTION), LABEL_ASQ),
    ((K_TEXT,), LABEL_WFD),
)
"""题型标注规则表(优先序,最具体在前):首题含齐某组标志键 → 该标签;全不中 → LABEL_UNKNOWN。
数据化避开长 if 链(mccabe 复杂度)。听力(audioUrl)先于阅读选择判 —— 有音频即听力域。"""

# =========================================================================
# 5. IN / OUT 路径(经 paths 解析;私有研究目录)
# =========================================================================

OUT_RAW_DIR = RAW_PTE / "ynwac"
"""ynwac 原始层目录 data/raw/pte/ynwac/(bundle 快照 + images/ + votes;2026-09-01 Frank:
一源一目录,与 ptebank/ 对称,raw/pte/ 根上不散件)。"""

OUT_BANK = PROCESSED_PTE / "ynwac-bank.json"
"""解析后的整库 data/processed/pte/(组织层:按题型分组 + 每组 signature/count/题目)。"""

OUT_IMG_DIR = OUT_RAW_DIR / "images"
"""DI 看图题的图片资产 data/raw/pte/ynwac/images/(公开可下:ynwac.com/images/<n>.jpg)。
听力 mp3 不在此 —— api.ynwac.com/audio/ 需登录态(401),transcript 已在库内。"""

URL_SLASH = "/"
"""URL 路径分隔(抽 basename 落盘名)。"""

P_ASSETS_TPL = "  图片资产:新下 {got} · 已存 {skip} · 共 {total} → {dir}"
"""日志:图片下载收口。"""

P_ASSETS_EMPTY = "  图片资产:库内无 imageUrl(DI 组缺失?)—— 跳过"
"""日志:库里没有图片 URL(异常留痕)。"""

# =========================================================================
# 7. 机经雷达(diff:本轮 vs 上轮 → 新题/消失题;照 crawl manifest-prev/changes)
# =========================================================================

OUT_PREV = PROCESSED_PTE / "ynwac-bank-prev.json"
"""上一轮库(diff 基准;写新库前先把旧库挪到这)。"""

OUT_CHANGES = PROCESSED_PTE / "ynwac-changes.json"
"""本轮变更(新题/消失题;机经雷达信号 —— ynwac 上新题 = 这里冒出来)。"""

K_TITLE = "title"
"""题目标题键(snippet 首选)。"""

K_CONTENT = "content"
"""题目正文键(snippet 次选)。"""

SNIPPET_KEYS = ("title", "text", "content", "question")
"""新题提示文本的取键顺序(第一个非空的截断)。"""

SNIPPET_LEN = 60
"""新题提示文本截断长度。"""

CH_K_FETCHED = "fetched"
"""变更 meta:本轮日期。"""

CH_K_TYPES = "types"
"""变更:按题型分的变更清单。"""

CH_K_LABEL = "label"
"""变更项:题型标签。"""

CH_K_SIGNATURE = "signature"
"""变更项:字段签名(题型稳定身份键)。"""

CH_K_ADDED = "added"
"""变更项:新题清单({id, hint})。"""

CH_K_GONE = "gone"
"""变更项:消失题 id 清单。"""

CH_K_ID = "id"
"""变更项题目键:id。"""

CH_K_HINT = "hint"
"""变更项题目键:提示文本。"""

P_FIRST_ROUND = "  (首轮建档,无基准 —— 下轮起报新题)"
"""日志:diff 无基准(首轮)。"""

P_NO_CHANGE = "  ✓ 无新题(全库与上轮一致)"
"""日志:无变更。"""

P_RADAR_TPL = "  📋 {label}:新题 +{added} / 消失 -{gone}"
"""日志:一题型变更(机经雷达命中)。"""

P_RADAR_ADD_TPL = "     + #{id} {hint}"
"""日志:一道新题。"""

# =========================================================================
# 8. 考过投票 + 考试记录(登录门控 API;token 走 env,你部署的容器自动抓)
# =========================================================================

ENV_TOKEN = "YNWAC_TOKEN"
"""ynwac 登录 token 的环境变量名(值放 .env,不进代码不进库;空 = 跳过本步不报错)。
取法:登录 ynwac → 控制台 localStorage.getItem('auth_token');JWT 会过期,过期重取更新 .env。"""

VOTE_API = "https://api.ynwac.com"
"""投票/评论 API 基址(登录门控,匿名 401)。"""

HDR_AUTH = "Authorization"
"""鉴权头名。"""

AUTH_TPL = "Bearer {token}"
"""Bearer 头值模板。"""

TAGS_TPL = "/api/tags/question?questionType={code}&questionId={id}"
"""一题的标签/考过数据端点。"""

COUNT_TPL = "/api/comments/question/{id}/count?questionType={code}"
"""一题的评论计数端点。"""

COMMENTS_TPL = "/api/comments/question/{id}?questionType={code}&page=0&size=50&sortBy=createdAt&sortDir=desc"
"""一题的评论列表端点(考试记录;单页 50 条足够)。"""

VOTE_CODES = ("RA", "RS", "DI", "RTS", "ASQ", "SWT", "WE", "EW", "WFD", "RO", "ROP",
              "FIBR", "RFIB", "FIBL", "LFIB", "FIBRW", "RWFIB", "SST", "SS", "SSC",
              "RMCMS", "RMSMA", "RMCS", "RMCM", "LMCS", "LMCM", "MCS", "MCM", "MSC",
              "HIW", "SMW", "ES", "SW")
"""候选题型代码(路由大写 + 已见缩写 + 常见变体);无效的自探测跳过 —— API 真代码与路由不一一对应。"""

VOTE_MAX_ID = 500
"""每题型 id 上探上限(防越界;实际靠连续 miss 收尾)。"""

VOTE_MISS_MAX = 3
"""连续几次空/错即判本题型到头。"""

VOTE_DELAY_S = 0.12
"""每题请求间隔(礼貌,不打爆对方)。"""

HTTP_OK = 200
"""正常。"""

HTTP_UNAUTH = 401
"""token 过期/无效(整步中止,提示重取)。"""

MARK_EXPIRED = "__expired"
"""vote_get 出参标记:401 过期。"""

MARK_MISS = "__miss"
"""vote_get 出参标记:非 200 非 401(当空题)。"""

DATA_KEY = "data"
"""ynwac API 标准壳的数据字段名({result,message,data,error})。"""

COUNT_FIELD = "count"
"""tags 响应 data.count = 考过投票数(「考过 N 人」的 N);**判真伪的关键字段** ——
真题非 null(如 67),不存在的 id 返回 null(实测 id=999)。之前误判 data 整体是否 null → 撞到上限。"""

OUT_VOTES = OUT_RAW_DIR / "votes.json"
"""考过投票 + 评论**原始** API 响应(raw 层;votes 步落这,merge/clean 步的输入)。
登录门控数据,私有研究不入库。手动 bookmarklet 下载的那份也该挪来这。"""

V_K_FETCHED = "fetched"
"""votes meta:抓取日期。"""

V_K_TYPES = "types"
"""votes:按题型代码分的题清单。"""

V_K_TOTAL = "total"
"""votes meta:总题数。"""

V_K_ID = "id"
"""votes 题行:题号。"""

V_K_TAGS = "tags"
"""votes 题行:标签/考过原始数据(data 字段直存,不二次解析)。"""

V_K_COUNT = "commentCount"
"""votes 题行:评论数。"""

V_K_COMMENTS = "comments"
"""votes 题行:评论原始清单。"""

P_VOTES_NO_TOKEN = "  votes:未配 YNWAC_TOKEN → 跳过(不报错;配 token 后自动抓)"
"""日志:无 token 跳过。"""

P_VOTES_EXPIRED = "  ✗ votes:YNWAC_TOKEN 过期/无效(401)→ 本步中止;重取 auth_token 更新 .env"
"""日志:token 失效。"""

P_VOTES_CODE_TPL = "  ✓ {code}: {n} 题"
"""日志:一题型抓完。"""

P_VOTES_DONE_TPL = "✓ 考过投票+评论:{types} 题型 · {total} 题 → {path}"
"""日志:收口。"""

RAW_BUNDLE_TPL = "main-{hash}.js"
"""bundle 快照文件名(hash 来自 bundle URL,同一版只存一份)。"""

BUNDLE_HASH_RE = re.compile(r"main\.([0-9a-f]+)\.js")
"""从 bundle URL 抽 hash(快照命名)。"""

JSON_INDENT = 2
"""产物缩进(研究材料,可读优先)。"""

# =========================================================================
# 6. 产出 meta 键与日志模板(wire 键 K_ 词族;零字符串令靠 *_TPL)
# =========================================================================

OUT_K_SOURCE = "source"
"""产物 meta:出处 URL。"""

OUT_K_BUNDLE = "bundle"
"""产物 meta:bundle 地址。"""

OUT_K_FETCHED = "fetched"
"""产物 meta:抓取日期。"""

OUT_K_TOTAL = "total_questions"
"""产物 meta:总题数。"""

OUT_K_GROUPS = "groups"
"""产物:题型分组清单。"""

OUT_K_LABEL = "label"
"""分组:题型标签。"""

OUT_K_SIGNATURE = "signature"
"""分组:字段签名(排序键名 join)。"""

OUT_K_ARRAY_INDEX = "array_index"
"""分组:bundle 内数组序号(标签留空时人工核用)。"""

OUT_K_COUNT = "count"
"""分组:本组题数。"""

OUT_K_QUESTIONS = "questions"
"""分组:题目清单(原样对象)。"""

SIG_JOIN = ","
"""签名键名连接符。"""

P_BUNDLE_TPL = "  bundle {url}({n} 字节)"
"""日志:命中 bundle。"""

P_ARRAY_OK_TPL = "  [{idx:>2}] {label} n={n} sig={sig}"
"""日志:一组解析成功。"""

P_ARRAY_FAIL_TPL = "  [{idx:>2}] 解析失败(跳过,留痕不丢): {name}: {detail}"
"""日志:一组解析失败(逐数组隔离,no silent cap)。"""

P_DONE_TPL = "✓ ynwac 对照库:{groups} 组 · {total} 题 → {path}(失败 {fail} 组)"
"""日志:收口。"""

P_GUARD_TPL = "解析出的题数 {total} 少于下限 {floor} —— bundle 结构可能变了,本轮作废(不静默入库)"
"""零基线防线文案(题数异常当场红)。"""

MIN_TOTAL_FLOOR = 400
"""题数下限(实测 ~857;跌破 = bundle 结构变,当场红。防线地基,不静默)。"""

# =========================================================================
# 9. ptebank 第二源(WordPress REST 整库;音频重,补 ynwac 文本重)
# =========================================================================
# 2026-09-01 平台地图探测拍板(same-source-analysis §7):ptebank.com 是第二个全开机经库 ——
# wp-json 零鉴权分页 JSON,题面在 content.rendered,mp3 公开挂 /wp-content/uploads/。
# 分布偏听力/口语(SST/RL/SGD 含音频),与 ynwac 互补;同属第三方商业库,研究不入库不上线。

PB_SOURCE = "https://www.ptebank.com"
"""ptebank 站点源(产物 meta 出处)。"""

PB_API = "https://www.ptebank.com/wp-json/wp/v2"
"""WordPress REST 基址(匿名可达,实测 X-WP-Total=634)。"""

PB_POSTS_TPL = "/posts?per_page={per}&page={page}&_fields=id,date,modified,link,title,content,categories"
"""帖子分页端点(_fields 收窄到本域真读的格;响应头 X-WP-TotalPages 定页数)。"""

PB_CATS_TPL = "/categories?per_page={per}"
"""分类端点(category = 题型;一页装得下,实测 25 个)。"""

PB_PER_PAGE = 100
"""每页帖数(WP 上限 100;634 帖 = 7 页)。"""

PB_DELAY_S = 0.5
"""页间隔(礼貌,不打爆对方)。"""

HDR_WP_TOTAL_PAGES = "X-WP-TotalPages"
"""WP 分页总页数响应头(权威计数;缺失 = API 结构变,当场抛不静默)。"""

MP3_RE = re.compile(r"https?://[^\s\"']+\.mp3")
"""content 里的公开 mp3 直链(听力题音频 = 题干本体的一部分)。"""

PB_MIN_TOTAL_FLOOR = 400
"""帖数下限(实测 634;跌破 = API/站点结构变,当场红。防线地基,不静默)。"""

OUT_PB_RAW_DIR = RAW_PTE / "ptebank"
"""wp-json 原始响应快照目录 data/raw/pte/ptebank/(抓到先落 raw,出处留痕)。"""

PB_RAW_POSTS_TPL = "posts-p{page}.json"
"""一页帖子原始响应的落盘名。"""

PB_RAW_CATS = "categories.json"
"""分类原始响应的落盘名。"""

OUT_PB_BANK = PROCESSED_PTE / "ptebank-bank.json"
"""组织后的整库(照 ynwac bank 形:meta + 按题型分组;组键 = category slug 集)。"""

OUT_PB_PREV = PROCESSED_PTE / "ptebank-bank-prev.json"
"""上一轮库(diff 基准)。"""

OUT_PB_CHANGES = PROCESSED_PTE / "ptebank-changes.json"
"""本轮变更(新帖/消失帖;机经雷达第二源)。"""

PB_K_DATE = "date"
"""WP 帖行:发布时刻。"""

PB_K_MODIFIED = "modified"
"""WP 帖行:最后修改时刻(题面更新信号)。"""

PB_K_LINK = "link"
"""WP 帖行:页面地址。"""

PB_K_TITLE = "title"
"""WP 帖行:标题壳({rendered});row 里展平成纯文本同名键。"""

PB_K_CONTENT = "content"
"""WP 帖行:正文壳({rendered});row 里展平成 HTML 文本同名键。"""

PB_K_CATS = "categories"
"""WP 帖行:分类 id 清单。"""

PB_K_RENDERED = "rendered"
"""WP 渲染壳的文本格。"""

PB_K_NAME = "name"
"""WP 分类行:人话名(组 label 用)。"""

PB_K_SLUG = "slug"
"""WP 分类行:稳定短名(组 signature 用)。"""

PB_R_CATS = "cats"
"""row 出格:本帖分类 slug 清单(id 已换译)。"""

PB_R_AUDIO = "audio"
"""row 出格:正文里的公开 mp3 直链清单(去重排序)。"""

PB_LABEL_JOIN = "+"
"""组 label 的多分类名连接符。"""

P_PB_PAGE_TPL = "  posts 页 {page}/{pages}:{n} 帖"
"""日志:一页抓完。"""

P_PB_GUARD_TPL = "ptebank 帖数 {total} 低于下限 {floor} —— API/站点结构可能变了,本轮作废(不静默入库)"
"""零基线防线文案(帖数异常当场红)。"""

P_PB_DONE_TPL = "✓ ptebank 第二源:{groups} 组 · {total} 帖 → {path}"
"""日志:收口。"""

OUT_PB_AUDIO_DIR = RAW_PTE / "ptebank" / "audio"
"""听力 mp3 资产 data/raw/pte/ptebank/audio/(公开挂 /wp-content/uploads/,音频=听力题干本体;
链接会腐 —— WP 改版/搬 CDN 即失,趁开放落盘)。"""

PB_ASSET_DELAY_S = 0.2
"""音频下载间隔(礼貌;700+ 文件不打爆对方)。"""

P_PB_AUDIO_TPL = "  音频资产:新下 {got} · 已存 {skip} · 失败 {fail} · 共 {total} → {dir}"
"""日志:音频下载收口(失败计数留痕,不静默)。"""

P_PB_AUDIO_EMPTY = "  音频资产:库内无 audio 直链(ptebank 库缺失?)—— 跳过"
"""日志:库里没有音频 URL(异常留痕)。"""

# =========================================================================
# 10. 双源统一索引(组织层:两库 → 标准题型表下的一题一行)
# =========================================================================
# 2026-09-01 Frank 拍板「先组织和收集数据」:收集=双源雷达周更(已自动),组织=本段。
# 标准题型码照 PTE 官方缩写(RA/RS/DI/RL/ASQ/RTS/SGD/SWT/WE/EMAIL/RWFIB/RFIB/RMCS/RMCM/
# ROP/SST/LFIB/LMCS/LMCM/WFD);拿不准的映射值带 ? 留痕不硬标(arr13 句库、arr15 短文)。

SRC_YNWAC = "ynwac"
"""索引 source 值:ynwac(华人圈,文本重)。"""

SRC_PTEBANK = "ptebank"
"""索引 source 值:ptebank(印澳圈,音频重)。"""

YN_SIG_TYPE = {
    "answer,id,question": "ASQ",
    "id,imageId,imageUrl,question": "DI",
    "blanks,id,text,title": "RWFIB",
    "answerDescription,blanks,content,contentTranslation,id,title,words,wordsTranslation": "RWFIB",
    "blanks,content,contentTranslation,id,isImportant,title": "RFIB",
    "audioUrl,content,displayText,id,title,transcript": "SST",
    "audioUrl,content,correctAnswers,explanation,id,options,question,title,transcript": "LMCM",
    "audioUrl,content,correctAnswer,explanation,id,options,question,title,transcript": "LMCS",
    "audioUrl,content,correctAnswer,explanation,id,options,title,transcriptWithBlank": "LFIB",
    "content,duomoLink,id,isImportant,title": "RA",
    "content,correctAnswers,explanation,id,options,question,title": "RMCM",
    "content,correctAnswer,explanation,id,options,question,title": "RMCS",
    "answer,correctOrder,description,id,paragraphs,title": "ROP",
    "id,isImportant,text": "RS/WFD?",
    "id,isImportant,text,title": "RTS",
    "id,text,title": "WE?",
    "id,summary,text,title": "SWT",
    "content,description,id,title": "EMAIL",
    "id,isFrequent,isImportant,text": "WFD",
}
"""ynwac 组签名 → 标准题型码(签名是题型稳定身份,19 组签名互异实测确认)。
确证依据 same-source-analysis §1(2026-09-01 抽读):RTS/EMAIL 确证;RS/WFD?、WE? 存疑留问号。"""

PB_SLUG_TYPE = {
    "ra": "RA", "rs": "RS", "di": "DI", "rl": "RL", "audio-rl": "RL",
    "asq": "ASQ", "sgd": "SGD", "audio-sgd": "SGD", "swt": "SWT", "we": "WE",
    "fibr": "RFIB", "ro": "ROP", "sst": "SST", "audio-sst": "SST", "close-sst": "SST",
    "wfd": "WFD", "fibl": "LFIB", "hiw": "HIW", "smw": "SMW",
    "mcl": "LMCS", "mcsa": "RMCS", "mcma": "RMCM", "hcs": "HCS",
}
"""ptebank 分类 slug → 标准题型码(audio-*/close-* 变体归并本型;exam-tips 不在此表 ——
纯 tips 帖归 TYPE_TIPS,tips+题型混标帖取题型)。"""

PB_SLUG_TIPS = "exam-tips"
"""ptebank 备考文章分类 slug(月更机经存档在此;非题型)。"""

TYPE_TIPS = "TIPS"
"""非题帖的题型码(ptebank 月更机经存档/备考文章;时间轴研究素材,不算题)。"""

TYPE_UNKNOWN = "?"
"""映射表没接住的题型码(留痕待人工补表,不硬塞)。"""

OUT_INDEX = PROCESSED_PTE / "index.json"
"""双源统一索引(组织层产物:meta + 一题一行 + 按题型计数)。"""

IDX_K_TYPE = "type"
"""索引行:标准题型码。"""

IDX_K_SOURCE = "source"
"""索引行:来源(ynwac/ptebank)。"""

IDX_K_FLAGS = "flags"
"""索引行:押题信号清单(important/frequent —— ynwac 人工策展层)。"""

IDX_K_AUDIO = "audio"
"""索引行:有无音频资产(布尔)。"""

IDX_K_ROWS = "rows"
"""索引产物:全部题行。"""

IDX_K_COUNTS = "counts"
"""索引产物:按题型 × 来源计数(盘点表)。"""

FLAG_IMPORTANT = "important"
"""押题信号:ynwac isImportant(重点)。"""

FLAG_FREQUENT = "frequent"
"""押题信号:ynwac isFrequent(高频)。"""

K_IS_IMPORTANT = "isImportant"
"""ynwac 题行的重点标记键。"""

K_IS_FREQUENT = "isFrequent"
"""ynwac 题行的高频标记键。"""

K_AUDIO_URL_YN = "audioUrl"
"""ynwac 题行的音频键(判有无音频)。"""

P_INDEX_DONE_TPL = "✓ 统一索引:{rows} 行({types} 题型)→ {path}"
"""日志:索引收口。"""

# =========================================================================
# 11. 组织层分析:时间轴(题目出现史)+ 词表(句库词频,合法元知识)
# =========================================================================
# 2026-09-01 Frank「可以」:事实层产品路线拍板 —— 时间轴与词表都是「关于题的事实」,
# 不含题面表达,可直接消费。时间轴 = 双库题探针 × ptebank 月更存档(2019-2026 带日期);
# 词表 = ynwac 句库(WFD/RS)分词统计。全本地计算,零抓取。

TL_TAG_RE = re.compile(r"<[^>]+>")
"""HTML 标签(归一化剥除)。"""

TL_ENTITY_RE = re.compile(r"&#\d+;|&[a-z]+;")
"""HTML 实体(归一化剥除)。"""

TL_NONWORD_RE = re.compile(r"[^a-z0-9 ]")
"""非字母数字(归一化压平;引号连字符等转录差异全抹)。"""

TL_WS_RE = re.compile(r"\s+")
"""连续空白(归一化收成单空格)。"""

TL_SPACE = " "
"""归一化的空白替换值。"""

TL_BODY_KEYS = ("text", "content", "transcript", "displayText", "summary")
"""题面正文的候选键(取最长的当探针原料;双库通用)。"""

TL_PROBE_LEN = 40
"""长文探针长度(中段截取;§8 实测 40 字符在转录差异下仍能命中)。"""

TL_LONG_MIN = 120
"""归一化正文超此长度走中段探针,否则整句当探针。"""

TL_SHORT_MIN = 15
"""探针最短长度(再短误撞率高,弃)。"""

OUT_TIMELINE = PROCESSED_PTE / "timeline.json"
"""时间轴产物:每道被月更存档引用过的题 → 出现日期清单(首现/末现/次数可派生)。"""

TL_K_DATES = "dates"
"""时间轴行:被引用的存档日期清单(升序)。"""

P_TL_DONE_TPL = "✓ 时间轴:{hit} 题被存档引用(共 {probes} 题探针 × {posts} 篇存档)→ {path}"
"""日志:时间轴收口。"""

W_TOKEN_RE = re.compile(r"[a-z']+")
"""分词(小写字母与撇号;词表用)。"""

W_STOPWORDS = frozenset((
    "the", "a", "an", "of", "to", "in", "on", "at", "for", "and", "or", "but", "is", "are",
    "was", "were", "be", "been", "being", "it", "its", "this", "that", "these", "those",
    "with", "as", "by", "from", "will", "would", "can", "could", "should", "shall", "may",
    "have", "has", "had", "do", "does", "did", "not", "no", "you", "your", "we", "our",
    "they", "their", "he", "she", "his", "her", "i", "my", "me", "us", "them", "there",
    "if", "than", "then", "so", "all", "more", "most", "some", "any", "each", "other",
))
"""词表停用词(功能词不进榜;内容词才是「高频考点」)。"""

W_MIN_LEN = 3
"""入榜词最短长度(单双字母噪音弃)。"""

W_MIN_COUNT = 2
"""入榜词最低出现次数(孤词不成「高频」)。"""

OUT_WORDS = PROCESSED_PTE / "wordfreq.json"
"""词表产物:WFD/RS 句库分词词频(合法元知识 —— 词不是题面,可直接上产品)。"""

W_K_SENTENCES = "sentences"
"""词表 meta:统计的句子总数。"""

W_K_WORDS = "words"
"""词表:{词: 次数}(降序)。"""

W_TYPES = ("WFD", "RS/WFD?", "RS")
"""进词表的题型码(双库句库:ynwac WFD/句库 + ptebank RS)。"""

P_W_DONE_TPL = "✓ 词表:{sentences} 句 → {words} 词({path})"
"""日志:词表收口。"""
