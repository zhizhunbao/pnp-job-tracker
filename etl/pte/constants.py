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
    "id,isImportant,text": "RS",
    "id,isImportant,text,title": "RTS",
    "id,text,title": "WE?",
    "id,summary,text,title": "SWT",
    "content,description,id,title": "EMAIL",
    "id,isFrequent,isImportant,text": "WFD",
}
"""ynwac 组签名 → 标准题型码(签名是题型稳定身份,19 组签名互异实测确认)。
确证依据 same-source-analysis §1(2026-09-01 抽读):RTS/EMAIL 确证;WE? 存疑留问号。
arr13(id,isImportant,text)2026-09-02 由投票 API 定为 RS:votes 按 RS/WFD 分型,arr18 已是 WFD
(带 isFrequent),库内唯一剩下的句库组只能对 RS(RS 投票 id ≤ 73 落在其 1..186 内)。"""

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

W_TYPES = ("WFD", "RS")
"""进词表的题型码(句库:WFD + RS;2026-09-02 arr13 定为 RS 后「RS/WFD?」码退役)。"""

P_W_DONE_TPL = "✓ 词表:{sentences} 句 → {words} 词({path})"
"""日志:词表收口。"""

# =========================================================================
# 12. 媒体资产收口(Core 题型筛选下载 + 题目↔媒体映射)
# =========================================================================
# 2026-09-01 Frank「继续」:媒体只为 PTE Core 备考研究服务 —— 新下载按 Core 题型
# 白名单筛(RL/SGD/WE 是 Academic 独有、TIPS 是文章,不下);已落盘的历史文件不删
# (raw 不回收)。映射 = 题 id ↔ 媒体 URL ↔ 本地文件,file=null 留痕未落盘
# (ynwac 音频 401 付费墙实撞 / 下载失败 / 非 Core 不下),不静默折成「没有」。

CORE_TYPES = frozenset((
    "RA", "RS", "DI", "RTS", "ASQ",
    "SWT", "EMAIL",
    "RWFIB", "RMCM", "ROP", "RFIB", "RMCS",
    "SST", "LMCM", "LFIB", "HCS", "LMCS", "SMW", "HIW", "WFD",
))
"""PTE Core 官方题型码白名单(四行 = Speaking/Writing/Reading/Listening 考试结构序;
RL/SGD/WE 为 Academic 独有、TIPS/? 非题,均不在此)。"""

PB_IMG_RE = re.compile(r"https?://[^\s\"']+/wp-content/uploads/[^\s\"']+?\.(?:png|jpe?g|gif|webp)",
                       re.IGNORECASE)
"""content 里的公开图片直链(DI 图 = 题干本体;形照 MP3_RE,查询串自然截断)。"""

PB_THUMB_RE = re.compile(r"-\d+x\d+\.(?:png|jpe?g|gif|webp)$", re.IGNORECASE)
"""WP 缩略图尺寸变体后缀(-300x200.jpg 等副本;只下原图,变体弃 —— 一图多尺寸不算多图)。"""

OUT_PB_IMG_DIR = RAW_PTE / "ptebank" / "images"
"""图片资产 data/raw/pte/ptebank/images/(Core 帖的图;链接会腐,趁开放落盘)。"""

P_PB_IMG_TPL = "  图片资产:新下 {got} · 已存 {skip} · 失败 {fail} · 共 {total}(Core 筛后)→ {dir}"
"""日志:图片下载收口(失败计数留痕,不静默)。"""

P_PB_IMG_EMPTY = "  图片资产:Core 帖内无图片直链 —— 跳过"
"""日志:筛后没有图片 URL(留痕)。"""

OUT_MEDIA = PROCESSED_PTE / "media.json"
"""媒体映射产物:meta + 一媒体一行(题 id/题型/种类/URL/本地文件)。"""

M_K_KIND = "kind"
"""映射行:媒体种类(image/audio)。"""

M_K_URL = "url"
"""映射行:媒体源地址(绝对)。"""

M_K_FILE = "file"
"""映射行:本地文件(相对 data/raw/pte/ 的 POSIX 路径;null = 未落盘)。对法 = URL basename:
同名不同 URL 会指同一文件、内容以先下者为准(2026-09-01 实测 285 文件仅 8 个被多 URL 认领,
研究用途可忍;要精确需内容寻址改名,连既存 251 音频一起迁,暂不做)。"""

KIND_IMAGE = "image"
"""媒体种类:图片。"""

KIND_AUDIO = "audio"
"""媒体种类:音频。"""

P_MEDIA_DONE_TPL = "✓ 媒体映射:{rows} 行(已落盘 {have} · 未落盘 {miss})→ {path}"
"""日志:映射收口(未落盘计数当场可见)。"""

OUT_YN_AUDIO_DIR = RAW_PTE / "ynwac" / "audio"
"""ynwac 听力 mp3 资产 data/raw/pte/ynwac/audio/(文件名 = SST 题 id)。2026-09-02 浏览器实测
定案:播放器是不进 DOM 的裸 Audio,currentSrc = 主站公开静态 `/sst/{id}.mp3`(匿名可下,
无需登录);库内 audioUrl 的 `/audio/canada_news_*.mp3` 与 api.ynwac.com 同路径(401/500)
都是死路,仅作历史留痕。SPA 对不存在的文件回 200 text/html 壳页 —— 下载必须验 content-type。"""

YN_AUDIO_TPL = "/sst/{id}.mp3"
"""SST 音频的主站相对路径模板(id = 题 id;2026-09-02 实测 1..8 在线,9..20 回壳页)。"""

CT_AUDIO_PREFIX = "audio/"
"""音频响应 content-type 前缀(守卫:壳页 200 text/html 不许落成 mp3)。"""

HDR_CONTENT_TYPE = "Content-Type"
"""响应头:内容类型(音频守卫读取)。"""

P_YN_AUDIO_TPL = "  ynwac 音频:新下 {got} · 已存 {skip} · 失败 {fail} · 共 {total} → {dir}"
"""日志:音频下载收口(失败 = 网络错或非音频响应,计数留痕不静默)。"""

P_YN_AUDIO_EMPTY = "  ynwac 音频:库内无 audioUrl —— 跳过"
"""日志:库里没有音频 URL(异常留痕)。"""

# =========================================================================
# 13. duoink 第三源(上游池主;登录态浏览器读渲染态 —— Vuex 内存表 + 题页正文)
# =========================================================================
# 2026-09-02 Frank「接一下 duoink」。实撞定案:① 路由守卫查 localStorage._lk,无 = 报
# Invalid login session(不是反自动化,browser-guard.js 只是老浏览器兼容检查);② 后端
# LeanCloud 云函数(Exps.GetEntryList/GetEntry),响应加密、客户端解密 —— 解密不碰(权限闸
# 拦下且该拦),走渲染态:列表页 Vuex 内存态 $store.state.entryList[PART].items 带全量元数据
# (ObjectId/sn/题面 te/等级 l/热度 f/话题 tp/时间),题页正文在 CONTENT…START 之间;
# ③ 音频全是 TTS 现合成(随机 speaker),非真录音,不抓;DI 图在 cdn.duoink.co 公开可下。
# 登录态住统一 profile(crawl PROFILE_DIR,Frank 亲手扫码);无 playwright 的机器跳过不报错。

DK_SOURCE = "https://duoink.co"
"""duoink 站点源(产物 meta 出处 + 拼绝对地址)。"""

DK_LIST_TPL = "/pte/entry-list/part/{part}"
"""题型列表页路径(part = 站内题型键)。"""

DK_ENTRY_TPL = "/pte/entry/part/{part}/{id}"
"""单题页路径(id = LeanCloud ObjectId;ynwac 的 duomoLink 也是这个形)。"""

DK_PARTS = ("RA", "RS", "DI", "ASQ", "RTS", "SWT", "WEM", "FIB_RW", "MA_R", "RP", "FIB_R", "SA_R",
            "SST", "MA_L", "FIB_LW", "HCS", "SA_L", "SMW", "HIW", "WFD")
"""抓取的站内题型键(Core 20 型;INTRO 非题、RL/SGD/WE 为 Academic 独有,不抓)。"""

DK_PART_TYPE = {
    "RA": "RA", "RS": "RS", "DI": "DI", "ASQ": "ASQ", "RTS": "RTS", "SWT": "SWT", "WEM": "EMAIL",
    "FIB_RW": "RWFIB", "MA_R": "RMCM", "RP": "ROP", "FIB_R": "RFIB", "SA_R": "RMCS",
    "SST": "SST", "MA_L": "LMCM", "FIB_LW": "LFIB", "HCS": "HCS", "SA_L": "LMCS", "SMW": "SMW",
    "HIW": "HIW", "WFD": "WFD",
}
"""站内题型键 → 标准题型码(与 §10 索引同一套码)。"""

DK_TEXT_PARTS = frozenset(("WFD", "RS"))
"""题面全文就在列表 te 格的题型(听写/复述句 = 一句话;音频是 TTS 不抓)—— 不进题页。"""

DK_PART_TOKEN = "__PART__"
"""JS 片段里的题型占位(字符串替换,避免 format 撞 JS 花括号)。"""

DK_STORE_JS = ("() => { const s = document.querySelector('#app').__vue__.$store.state.entryList;"
               " const e = s['__PART__']; return e && Array.isArray(e.items) ? JSON.parse(JSON.stringify(e.items)) : []; }")
"""读 Vuex 内存态列表(Vue 2 根实例挂 __vue__)。JSON 往返一次:store 里的 Date 会被 playwright
转成 python datetime 而写不进 json,往返后成 ISO 字符串(实撞 2026-09-02);值不洗只转形。"""

DK_SHOW_JS = ("() => { const els = [...document.querySelectorAll('*')].filter(e => /CLICK TO SHOW/i.test(e.innerText || '')"
              " && ![...e.children].some(c => /CLICK TO SHOW/i.test(c.innerText || ''))); for (const e of els) { e.click(); }"
              " return els.length; }")
"""展开题页里折叠的 transcript/答案:点「含 CLICK TO SHOW 的最深元素」并返回点开数(2026-09-02 实撞:
折叠头不是叶节点,按叶点永远点不到;ASQ/DI/SST 的本体全在折叠里)。上层循环到返回 0 为止。"""

DK_SHOW_ROUNDS_MAX = 4
"""展开循环上限(一轮点开可能露出下一层折叠;实测两轮到底)。"""

DK_ENTRY_JS = ("() => ({ text: document.body.innerText, html: document.documentElement.outerHTML,"
               " title: document.title, imgs: [...document.querySelectorAll('img')]"
               ".map(i => i.currentSrc || i.src || '').filter(s => s.length > 0 && !s.startsWith('data:')) })")
"""题页倒出:整页文本 + 渲染后完整 HTML(raw 缓存,照 crawl 域 html_cache 思路 —— 解析规则变了离线重切,
不再碰网站)+ 图片地址(头像等在 python 侧按标记剔除)。"""

DK_J_HTML = "html"
"""DK_ENTRY_JS 返回对象:渲染后 HTML 格。"""

DK_J_TITLE = "title"
"""DK_ENTRY_JS 返回对象:页标题格(manifest 页行用)。"""

DK_CRAWL_SLUG = "duoink-pte"
"""题页原文进 crawl 层的 slug(data/crawl/duoink-pte/html_cache/,与 Codex 首爬同目录一份真相)。
2026-09-02 Frank 拍板数据链 crawl → raw → processed → mart:HTML 住 crawl,抽出的 json 住 raw。"""

DK_TEXT_START = "CONTENT"
"""题页正文起点标记(CONTENT/COMMENTS/MINE/NOTES 页签行)。"""

DK_TEXT_END = "START"
"""题页正文终点标记(练习开始钮)。"""

DK_AVATAR_MARKS = ("avatar", "cdn-avt")
"""图片地址里的头像标记(评论区头像/TTS 头像不是题图)。"""

DK_WAIT_UNTIL = "networkidle"
"""页面导航等待条件(SPA 数据到齐再读 store)。"""

DK_NAV_TIMEOUT_MS = 60000
"""导航超时(SPA 首屏含 chunk 加载,给宽)。"""

DK_PAGE_WAIT_S = 4.0
"""列表页 networkidle 后再等(Vuex 灌表有尾巴)。"""

DK_ENTRY_WAIT_S = 3.0
"""题页 networkidle 后再等(正文渲染)。"""

DK_SHOW_WAIT_S = 1.0
"""点开 CLICK TO SHOW 后等渲染。"""

DK_ENTRY_DELAY_S = 8.0
"""题页间隔(礼貌;千级题页跑数小时,幂等可断续)。2026-09-02 两次上调:1.0 → 3.0(每 10 秒一页跑到
~500 页触发极验,249 页被验证页顶替);3.0 → 8.0(13 秒一页仍每 ~50 页弹一次,人工滑不过来)。"""

DK_BODY_TEXT_JS = "() => document.body.innerText"
"""读整页文本(验证壳判定用)。"""

DK_BLOCK_MARK = "need verification"
"""验证壳页判词(duoink 极验拦截后正文 = 「User need verification | RETRY BACK」)。"""

DK_BLOCK_WAIT_S = 600
"""验证壳等人工处理的上限(秒;照 crawl 域 CHALLENGE 形:有头窗里 Frank 手动滑,脚本轮询)。"""

DK_BLOCK_POLL_S = 5.0
"""等人工处理时的轮询间隔。"""

DK_BLOCK_ABORT_MAX = 3
"""连续验证超时次数上限(达到即中止题页步,不再硬撞;下次 --only dk-entries 幂等续跑)。"""

P_DK_BLOCK_WAIT = "  duoink ⏳ 验证码拦截:请在浏览器窗口手动完成验证(最多等 10 分钟)…"
"""日志:遇验证壳等人工。"""

P_DK_BLOCK_OK = "  duoink ✅ 验证通过,继续"
"""日志:人工验证后恢复。"""

P_DK_BLOCK_TIMEOUT = "  duoink ⚠️ 验证未在超时内完成,该题计失败(不存档)"
"""日志:等人工超时(验证页绝不当正文存档)。"""

P_DK_BLOCK_ABORT = "duoink 连续验证超时 {n} 次 —— 中止题页步(幂等,处理完验证后再 --only dk-entries 续跑)"
"""中止文案(不硬撞极验)。"""

DK_K_ID = "id"
"""列表项:LeanCloud ObjectId(题 id;与 CH_K_ID 同值,索引/雷达按它对)。"""

DK_K_SN = "sn"
"""列表项:站内序号(#10624 那个)。"""

DK_K_TEXT = "te"
"""列表项:题面/标题文本(WFD/RS 即全句;其余题型此格为空,标题在 tt / 问句在 q)。"""

DK_TITLE_KEYS = ("te", "tt", "q")
"""索引标题的取值顺序(全句 → 标题 → 问句;实测 2026-09-02:RA/DI/FIB 走 tt,ASQ 走 q)。"""

DK_K_LEVEL = "l"
"""列表项:难度等级 1-5。"""

DK_K_FREQ = "f"
"""列表项:热度 0-3(3 = hot)。"""

DK_K_TOPICS = "tp"
"""列表项:话题标签清单。"""

DK_FREQ_HOT = 3
"""热度值 3 = 站内「hot」(索引里记为 frequent 押题信号)。"""

DK_J_TEXT = "text"
"""DK_ENTRY_JS 返回对象:整页文本格。"""

DK_J_IMGS = "imgs"
"""DK_ENTRY_JS 返回对象:图片地址清单格。"""

DK_ENTRY_FILE_TPL = "{id}.json"
"""题页产物落盘名(id = ObjectId)。"""

DK_R_PART = "part"
"""题页产物:站内题型键。"""

DK_R_CONTENT = "content"
"""题页产物:CONTENT…START 之间的正文(含题干/选项/答案展开);标记缺失时整页留痕。"""

DK_R_IMAGES = "images"
"""题页产物:题图地址清单(已剔头像)。"""

OUT_DK_RAW_DIR = RAW_PTE / "duoink"
"""raw 落盘目录 data/raw/pte/duoink/(列表 + 题页 + 图)。"""

DK_RAW_LIST_TPL = "list-{part}.json"
"""一个题型的列表原样落盘名。"""

OUT_DK_ENTRIES_DIR = OUT_DK_RAW_DIR / "entries"
"""题页产物目录(一题一文件 <id>.json,存在即跳过 —— 断续续跑)。"""

OUT_DK_IMG_DIR = OUT_DK_RAW_DIR / "images"
"""题图资产目录(DI 等;文件名 = URL basename)。"""

OUT_DK_BANK = PROCESSED_PTE / "duoink-bank.json"
"""组织后的整库(照 ynwac bank 形:meta + 按题型分组;组签名 = 标准题型码)。"""

OUT_DK_PREV = PROCESSED_PTE / "duoink-bank-prev.json"
"""上一轮库(diff 基准)。"""

OUT_DK_CHANGES = PROCESSED_PTE / "duoink-changes.json"
"""本轮变更(新题/消失题;机经雷达第三源 —— 上游池的新题最早在这冒头)。"""

SRC_DUOINK = "duoink"
"""索引 source 值:duoink(上游池主)。"""

P_DK_NO_BROWSER = "  duoink:playwright 不可用 —— 跳过(渲染态抓取只在装了浏览器的机器跑)"
"""日志:无浏览器跳过(容器缺 playwright 是预期形态,不当红)。"""

P_DK_LIST_TPL = "  duoink 列表 {part}:{n} 条"
"""日志:一个题型列表读完。"""

P_DK_LOGIN_LOST = "duoink 全部题型列表为空 —— 登录态丢失(localStorage._lk),请在统一 profile 重新扫码"
"""登录态防线文案(全空 = 没登录,当场红不静默建空库)。"""

P_DK_LISTS_DONE_TPL = "✓ duoink 列表:{parts} 题型 · {total} 条 → {dir}"
"""日志:列表步收口。"""

P_DK_ENTRIES_TPL = "  duoink 题页:新抓 {got} · 已存 {skip} · 失败 {fail} · 图 {imgs} → {dir}"
"""日志:题页步收口(失败留痕)。"""

P_DK_DONE_TPL = "✓ duoink 第三源:{groups} 组 · {total} 题 → {path}"
"""日志:装库收口。"""

# =========================================================================
# 14. 「最近考了」组织层(三源考场回忆信号 → 每题 seen/seen_n/freq/votes + 分源分型窗口盘点)
# =========================================================================
# 2026-09-02 Frank「最主要的是每个来源哪些题最近考了」。信号各源各形,统一成四格:
# seen = 最近一次考场回忆日期(null = 该源没有这题的记录);seen_n = 我们持有的带日期回忆条数;
# freq = duoink Core 热度 0-3(仅 duoink);votes = ynwac「考过」票数(仅 ynwac)。
# 源形:duoink 列表 e(recent seen)+ f_c;ynwac votes.json 评论「[考试记录] 日期:YYYY-MM-DD」+ tags.count;
# ptebank timeline.json 月更存档引用日期。猩际无(有防护未收录)。
# 2026-09-03 猩际接入(§15):votes 第二来源 = 猩际 exam_count(「考过 (413)」那个数);预测清单
# 成员进索引 frequent 旗(与 duoink hot 同格);seen/freq 猩际仍 null(考试记录评论要逐题拉,未开)。

YN_VOTE_TYPE = {
    "RA": "RA", "RS": "RS", "DI": "DI", "RTS": "RTS", "ASQ": "ASQ", "SWT": "SWT", "WE": "WE?",
    "WFD": "WFD", "RO": "ROP", "FIBR": "RFIB", "FIBL": "LFIB", "FIBRW": "RWFIB", "SST": "SST",
    "RMSMA": "RMCM",
}
"""ynwac 投票 API 题型代码 → 标准题型码(与 YN_SIG_TYPE 同码,按 (源,型,id) 对上索引行)。"""

EXAM_DATE_RE = re.compile(r"考试记录[^0-9]{0,10}(\d{4}-\d{2}-\d{2})")
"""ynwac 评论里的考试记录日期(格式「[考试记录] 日期:2026-08-29」,分隔符全半角不定)。"""

V_T_COUNT = "count"
"""votes.json 一题 tags 格里的「考过」票数键。"""

V_C_CONTENT = "content"
"""votes.json 一题 comments 格:既是评论清单键,也是每条评论的正文键(API 原形)。"""

V_C_REPLIES = "replies"
"""votes.json 每条评论的回复清单键(回复里也会带考试记录)。"""

DK_K_SEEN = "e"
"""duoink 列表项:最近一次考场回忆时间(Codex 命名 recent_seen_at;1633 题全有,最新到抓取当日)。"""

DK_K_FREQ_CORE = "f_c"
"""duoink 列表项:Core 热度 0-3(f 是混合热度;Core 模式看这个)。"""

RECENT_WINDOWS_D = (30, 90, 180)
"""盘点窗口(天):最近 N 天内有回忆记录的题数。"""

DATE_LEN = 10
"""ISO 日期前缀长度(YYYY-MM-DD;时间戳截前 10 位)。"""

DAYS_BAD = 10 ** 6
"""坏日期串的天数哨值(落在所有窗口之外 = 不静默算进任何窗口)。"""

OUT_RECENT = PROCESSED_PTE / "recent.json"
"""「最近考了」产物:meta + 分源分型盘点 + 一题一行(索引行 + 四格)。"""

R_K_SEEN = "seen"
"""行:最近考场回忆日期(YYYY-MM-DD 或 null)。"""

R_K_SEEN_N = "seen_n"
"""行:持有的带日期回忆条数。"""

R_K_FREQ = "freq"
"""行:duoink Core 热度 0-3(其他源 null)。"""

R_K_VOTES = "votes"
"""行:ynwac 考过票数(其他源 null)。2026-09-03 起猩际 exam_count 也进这格(同语义:考生点「考过」的票数)。"""

R_K_SUMMARY = "summary"
"""产物:{源: {型: {total, seen, last, d30, d90, d180}}} 盘点。"""

R_S_TOTAL = "total"
"""盘点格:该源该型题数。"""

R_S_SEEN = "seen"
"""盘点格:有回忆日期的题数。"""

R_S_LAST = "last"
"""盘点格:该源该型最近一次回忆日期。"""

R_S_WIN_TPL = "d{days}"
"""盘点格名模板:最近 N 天内有回忆的题数(d30/d90/d180)。"""

P_RECENT_DONE_TPL = "✓ 最近考了:{rows} 行 · 有日期 {seen} · 30 天内 {d30} → {path}"
"""日志:收口。"""
"""日志:词表收口。"""

# =========================================================================
# 15. 猩际(ptexj / APEUni)第四源(登录态浏览器页内 fetch 明文 API —— 预测清单 + 考过票数)
# =========================================================================
# 2026-09-03 Frank「照 duoink 的形开一步,考过票数和预测清单接进最近考了」。探索定案
# (data/processed/pte/ptexj-practice-crawl-analysis.md):① 题干两层都拿不到 —— API `item` 是 e1
# 密文,渲染态逐词画 canvas;不解密不 OCR,本源只当信号源不当题面源。② 明文可得:tags_v2 的
# predict_core「Core 预测」清单、single_num_v2 的 exam_count(考过票数)/ prev_num / next_num。
# ③ 题号 num 不在明文里 —— 开 /practice/<model> 站点自动跳到预测清单首题 /practice/<model>/<num>,
# 此后沿 next_num 链走完整个清单,每一步请求的 num 就是题 id。④ 请求地址不自拼:从页面自己发出的
# single_num_v2 请求截取(token 等鉴权参数随之带上),只改 num;页内 fetch 复用登录态。
# ⑤ 登录态住统一 profile,且猩际单会话互斥(crawl 登录会踢掉 Chrome 里的同账号)。
# ⑥ 浏览器必须走 crawl 域 get_browser_page,不能像 duoink 那样裸起 launch_persistent_context:猩际主包
# 带 ondevtoolopen 自毁(认出自动化/devtools 就 window.close 跳 about:blank),crawl 域 SCRIPT_PATCH_ROWS
# 在脚本加载前把它拍掉;裸起实撞 2026-09-03 —— 页面秒变 about:blank,single_num_v2 永远发不出。

XJ_SOURCE = "https://www.ptexj.com"
"""猩际站点源(产物 meta 出处 + 拼练习页地址)。"""

XJ_PRACTICE_TPL = "/practice/{model}"
"""题型练习入口路径(站根,不在 /pte 下;开它自动跳到 tag=predict_core 首题)。"""

XJ_MODELS = ("read_alouds", "repeat_sentences", "describe_images", "answer_questions", "respond_situations",
             "core_swts", "write_emails", "fib_wr", "r_mcm", "ro", "fib_rd", "r_mcs", "core_ssts",
             "l_mcm", "l_fib", "l_mcs", "l_smw", "hiws", "wfds")
"""站内题型键(PTE Core 19 型,来自 /pte/index 渲染态导航;HCS 猩际 Core 无)。"""

XJ_MODEL_TYPE = {
    "read_alouds": "RA", "repeat_sentences": "RS", "describe_images": "DI", "answer_questions": "ASQ",
    "respond_situations": "RTS", "core_swts": "SWT", "write_emails": "EMAIL", "fib_wr": "RWFIB",
    "r_mcm": "RMCM", "ro": "ROP", "fib_rd": "RFIB", "r_mcs": "RMCS", "core_ssts": "SST",
    "l_mcm": "LMCM", "l_fib": "LFIB", "l_mcs": "LMCS", "l_smw": "SMW", "hiws": "HIW", "wfds": "WFD",
}
"""站内题型键 → 标准题型码(与 §10 索引 / DK_PART_TYPE 同一套码)。"""

XJ_API_SINGLE = "/api/v1/questions/single_num_v2"
"""单题元数据接口路径(截取页面自发请求的判词;响应 data.item 密文不存,只取明文格)。"""

XJ_P_NUM = "num"
"""单题接口 query 参数:题号(沿链只改这一个参数)。"""

XJ_NUM_RE = re.compile(r"/practice/[a-z_]+/(\d+)")
"""练习页地址里的题号(站点跳转后 /practice/<model>/<num>;没跳 = 该型预测清单为空)。"""

XJ_FETCH_JS = "(url) => fetch(url).then(r => r.json())"
"""页内 fetch 一发(同反爬姿态;鉴权全在 query 的 token 里,不带 cookie —— 接口在 any.ptexj.com 跨域,
CORS 是 * 不许 credentials:'include',带了就 Failed to fetch,2026-09-03 实撞;返回 JSON 值)。"""

XJ_NAV_TIMEOUT_MS = 60000
"""导航超时(SPA 首屏 + 站点自跳)。"""

XJ_WAIT_UNTIL = "domcontentloaded"
"""导航等待档:不用 networkidle —— 练习页有轮询请求,60 秒等不到 idle(2026-09-03 流步首跑实撞超时);
DOM 就绪后靠 XJ_PAGE_WAIT_S 固定等待让站点自跳 + 首批接口发出。"""

XJ_PAGE_WAIT_S = 6.0
"""练习页 DOM 就绪后再等(站点跳到首题 + single_num_v2 / comments/exam 发出;侦察实测 4 秒够,留余量)。"""

XJ_CALL_DELAY_S = 1.0
"""链上两次 fetch 的间隔(礼貌;预测清单合计 ~333 题,一轮约 6 分钟)。"""

XJ_CHAIN_MAX = 2000
"""单题型沿链上限(防 next_num 成环;预测清单实测最大 62)。"""

XJ_A_DATA = "data"
"""接口响应:数据格。"""

XJ_A_ADDITION = "item_addition"
"""接口响应 data:明文附加格(exam_count 等)。"""

XJ_A_EXAM_COUNT = "exam_count"
"""接口响应 item_addition:考过票数(渲染态「考过 (413)」)。"""

XJ_A_NEXT = "next_num"
"""接口响应 data:清单里下一题题号(None = 链尾)。"""

XJ_A_PREV = "prev_num"
"""接口响应 data:上一题题号。"""

XJ_A_COUNT = "count"
"""接口响应 data:该 tag 下题数(链长自校用)。"""

XJ_A_CURRENT = "current_count"
"""接口响应 data:本题在清单里的序(1 起)。"""

XJ_TAG_PREDICT = "predict_core"
"""tags_v2 的「Core 预测」tag(站点开练习页的默认 tag;raw 产物 meta 记它)。"""

XJ_K_TAG = "tag"
"""raw 产物 meta:清单 tag。"""

XJ_K_MODEL = "model"
"""raw 产物 meta:站内题型键。"""

OUT_XJ_RAW_DIR = RAW_PTE / "ptexj"
"""raw 落盘目录 data/raw/pte/ptexj/(09-01 探索的 model-counts 也在此)。"""

XJ_RAW_LIST_TPL = "predict-{model}.json"
"""一个题型的预测清单原样落盘名。"""

OUT_XJ_BANK = PROCESSED_PTE / "ptexj-bank.json"
"""组织后的清单库(照 duoink bank 形:meta + 按题型分组;组签名 = 标准题型码;无题面)。"""

OUT_XJ_PREV = PROCESSED_PTE / "ptexj-bank-prev.json"
"""上一轮库(diff 基准)。"""

OUT_XJ_CHANGES = PROCESSED_PTE / "ptexj-changes.json"
"""本轮变更(预测清单进出的题 —— 押题雷达第四源)。"""

SRC_PTEXJ = "ptexj"
"""索引 source 值:猩际。"""

P_XJ_NO_BROWSER = "  ptexj:playwright 不可用 —— 跳过(登录态抓取只在装了浏览器的机器跑)"
"""日志:无浏览器跳过(容器缺 playwright 是预期形态,不当红)。"""

P_XJ_NO_SEED_TPL = "  ptexj {model}:没跳到题或没截到 single_num_v2(停在 {url},截到 {n} 条)—— 记空"
"""日志:截不到接口地址 / 没跳到首题(留痕并报现场;该型预测清单为空时也走这行;全型皆空由 P_XJ_LOGIN_LOST 升红)。"""

P_XJ_BAD_SHAPE_TPL = "  ptexj {model} #{num}:响应形状不对,链在此断"
"""日志:单步响应缺 data/item_addition(不猜,断链留痕)。"""

P_XJ_LIST_TPL = "  ptexj 预测 {model}:{n} 题(接口报 {count})"
"""日志:一个题型链走完(n ≠ count 即链有洞,人眼可核)。"""

P_XJ_LOGIN_LOST = "ptexj 全部题型预测清单为空 —— 登录态丢失,请在统一 profile 重新登录(猩际单会话互斥)"
"""登录态防线文案(全空 = 没登录,当场红不静默建空库)。"""

P_XJ_LISTS_DONE_TPL = "✓ ptexj 预测清单:{models} 题型 · {total} 题 → {dir}"
"""日志:列表步收口。"""

P_XJ_DONE_TPL = "✓ ptexj 第四源:{groups} 组 · {total} 题(预测 {predicted} · 仅近期考过 {examined})→ {path}"
"""日志:装库收口。"""

# 考试记录流(2026-09-03 Frank「补 seen」侦察定案):`comments/exam` 不带 commentable_id = 全站「确认考过」
# 流(实测 59.8 万条,按提交时间倒序,Core/Academic 混流,条目 commentable.model/num 明文);page_size 硬顶 20;
# 深度实测 1000 页 ≈ 37 天、2000 页 ≈ 85 天。逐题开页拿 comments 也能得同样日期,但 335 次开页 ≈ 45 分钟
# 且暴露极验风险,不取。增量:首轮拉到 XJ_EXAM_DEPTH_D 天前,此后拉到上次最大评论 id 即停。

XJ_API_EXAM = "/api/v1/comments/exam"
"""考试记录流接口路径(截页面自发请求的判词;练习页一开就发,带鉴权参数)。"""

XJ_EXAM_DROP_PARAMS = ("commentable_id", "filter")
"""从截到的地址里去掉的参数:去 commentable_id 成全站流,去 filter(页面发的是 mine = 只看自己)。"""

XJ_P_PAGE = "page"
"""流接口 query:页码(1 起)。"""

XJ_P_PAGE_SIZE = "page_size"
"""流接口 query:每页条数。"""

XJ_EXAM_PAGE_SIZE = 20
"""每页条数(实测传 50/100/200 都只回 20 —— 服务端硬顶)。"""

XJ_EXAM_DEPTH_D = 180
"""首轮回溯深度(天)= RECENT_WINDOWS_D 最宽窗口;更早的记录不进任何盘点格,不拉。"""

XJ_EXAM_KEEP_D = 365
"""raw 流文件保留深度(天;按 created_at 修剪,防文件无限长)。"""

XJ_EXAM_PAGES_MAX = 8000
"""单轮翻页上限(防排序异常翻不到底;180 天实测 ≈ 4000 页)。"""

XJ_EXAM_DELAY_S = 0.5
"""流接口两页间隔(首轮 ≈ 4000 发 ≈ 35 分钟;此后增量每轮 ~200 页)。"""

XJ_EXAM_LOG_EVERY = 200
"""翻页进度播报间隔(页)。"""

XJ_EXAM_STOP_STREAK = 5
"""停机需要连续多少页满足判据(追上上次 id / 早于深度线)。2026-09-03 首跑实撞:流不严格按时间排序,
第 1842 页整页是 2025 年的旧记录,单页判据当场停机,6 月 1–18 日几千条没拉到;连续 5 页 = 100 条才算真到底。"""

XJ_A_COMMENTS = "comments"
"""流响应 data:条目清单;raw 产物里也用它当条目键。"""

XJ_A_PAGE_INFO = "page_info"
"""流响应 data:分页格。"""

XJ_A_TOTAL_PAGES = "total_pages"
"""流响应 page_info:总页数(翻到底判据)。"""

XJ_A_ID = "id"
"""流条目:评论 id(自增;增量停机判据)。"""

XJ_A_CREATED = "created_at"
"""流条目:提交时刻(ISO,前 10 位日期;深度判据)。"""

XJ_A_EXAM_DATE = "exam_date"
"""流条目:考生填的考试日期(YYYY-MM-DD;seen 的来源)。"""

XJ_A_COMMENTABLE = "commentable"
"""流条目:所评题目格(model / num 明文)。"""

XJ_A_MODEL = "model"
"""commentable 格:站内题型键(非 XJ_MODELS 的 = Academic 型,不收)。"""

XJ_A_NUM = "num"
"""commentable 格:题号(= 题 id)。"""

OUT_XJ_EXAM = OUT_XJ_RAW_DIR / "exam-comments.json"
"""考试记录流 raw(去用户化:只留评论 id / model / num / exam_date / created_at;增量合并,按 id 去重)。"""

XJ_K_PREDICTED = "predicted"
"""bank 题行:在预测清单里(True → 索引 frequent 旗)。"""

XJ_K_EXAM_DATES = "exam_dates"
"""bank 题行:考试记录日期清单(raw 流里该题全部 exam_date;未来日期在信号层剔)。"""

P_XJ_EXAM_NO_SEED = "ptexj 考试记录流:练习页没发出 comments/exam 请求 —— 登录态丢失或站点改版"
"""流步防线文案(截不到地址 = 拉不了,当场红)。"""

P_XJ_EXAM_PAGE_TPL = "  ptexj 考试记录流:第 {page} 页,已收 {n} 条(Core),最早提交 {oldest}"
"""日志:翻页进度。"""

P_XJ_EXAM_STOP_TPL = "  ptexj 考试记录流:第 {page} 页停 —— {why}"
"""日志:停机原因(追上上次 / 到深度 / 翻到底 / 空页 / 上限)。"""

XJ_STOP_KNOWN = "追上上次已存的评论"
"""停机原因:本页全部 id ≤ 上次最大 id。"""

XJ_STOP_DEPTH = "到回溯深度"
"""停机原因:本页最新提交早于深度线。"""

XJ_STOP_END = "翻到底"
"""停机原因:page ≥ total_pages。"""

XJ_STOP_EMPTY = "空页"
"""停机原因:响应无条目。"""

XJ_STOP_MAX = "翻页上限"
"""停机原因:达到 XJ_EXAM_PAGES_MAX。"""

P_XJ_EXAM_DONE_TPL = "✓ ptexj 考试记录流:新收 {new} 条 · 库存 {total} 条(Core,{keep} 天内)→ {path}"
"""日志:流步收口。"""

# =========================================================================
# 16. mart 出表(pte 域升产品域:题型维度 + 题目事实,一文件 = 一张 DB 表)
# =========================================================================
# 2026-09-03 05:00 Frank 拍板「上」:推翻立域时「研究用途,不建 mart / 不灌库 / 不上线」的板
# (设计稿 docs/design/PTE刷题-20260903.md;判据:机经是考生回忆的公共池,三家都在卖同一池水)。
# 首批四型 RA / RS / WFD / ASQ;题面只取 ynwac(公开 bundle)与 duoink(题页正文),猩际无题面不出行;
# 「最近考了」四格并进题行(一张表够页面一次 SELECT,recent.json 仍是组织层真相);
# 一题一行按源不合并(跨源对题留批三)。列名 camelCase,seed 端 to* 转 snake_case(mart 惯例)。

T_RA = "RA"
"""标准题型码:朗读。"""

T_RS = "RS"
"""标准题型码:复述句子。"""

T_ASQ = "ASQ"
"""标准题型码:简答题。"""

T_WFD = "WFD"
"""标准题型码:听写句子。"""

MART_TYPES = (T_RA, T_RS, T_WFD, T_ASQ)
"""首批出表的标准题型码(Frank 2026-09-03:四型先上,其余 15 型批二后扩)。"""

MART_TYPE_ROWS = (
    {"code": "RA", "section": "Speaking", "seq": 1, "nameZh": "朗读", "nameEn": "Read Aloud",
     "nameKo": "소리 내어 읽기", "audio": False},
    {"code": "RS", "section": "Speaking", "seq": 2, "nameZh": "复述句子", "nameEn": "Repeat Sentence",
     "nameKo": "문장 따라 말하기", "audio": True},
    {"code": "ASQ", "section": "Speaking", "seq": 3, "nameZh": "简答题", "nameEn": "Answer Short Question",
     "nameKo": "짧게 답하기", "audio": True},
    {"code": "WFD", "section": "Listening", "seq": 4, "nameZh": "听写句子", "nameEn": "Write From Dictation",
     "nameKo": "받아쓰기", "audio": True},
)
"""题型维度行(三语名 + 所属 section + 考试序 + 题面是否以音频呈现);官方英文名照 Pearson 题型名。"""

MART_TYPES_FILE = "pte_types.json"
"""mart 表文件名 = DB 表名 pte_types。"""

MART_QUESTIONS_FILE = "pte_questions.json"
"""mart 表文件名 = DB 表名 pte_questions。"""

QID_SEP = ":"
"""题目主键拼法 `源:题型:源内 id`(跨源不合并,主键必须带源;2026-09-03 加题型段 —— ynwac 的 id 按型各自从 1 起,
`源:源内 id` 在 mart 撞了 62 个键,单题页 URL 靠它唯一)。"""

Q_K_QID = "qid"
"""题行:主键 `源:题型:源内 id`。"""

Q_K_NUM = "num"
"""题行:站内题号(duoink sn / ynwac id),页面显示的 #N。"""

Q_K_TEXT = "text"
"""题行:题面全文(WFD/RS 一句话;RA 段落;ASQ 问句)。"""

Q_K_ANSWER = "answer"
"""题行:答案(ASQ 短答;其余 null)。"""

Q_K_AUDIO_URL = "audioUrl"
"""题行:公开音频直链(没有 = null;RS/ASQ/WFD 的 TTS 批三合成)。"""

Q_K_AUDIO_FILE = "audioFile"
"""题行:音频本地文件(data/raw/pte 相对路径;未落盘 null)。"""

Q_K_IMAGE_URL = "imageUrl"
"""题行:题图直链(四型基本无;留列给 DI)。"""

Q_K_PREDICTED = "predicted"
"""题行:押题(源方 hot / frequent / important 任一)。"""

Q_K_SEEN_N = "seenN"
"""题行:持有的带日期回忆条数(recent seen_n)。"""

Q_K_FETCHED = "fetched"
"""题行:出表日期。"""

DK_TEXT_MARK = "ITEM TEXT"
"""duoink 题页正文里 RA 段落的起点标记。"""

DK_TRANSCRIPT_MARK = "ITEM TRANSCRIPT"
"""duoink 题页正文里 ASQ 问句(转写)的起点标记。"""

DK_ANSWER_MARK = "EXAMPLE ANSWER"
"""duoink 题页正文里 ASQ 示例答案的起点标记。"""

DK_STOP_MARKS = ("CLICK TO HIDE", "CLICK TO SHOW", "ITEM AUDIO", "EXAMPLE ANSWER", "COMMENTS")
"""duoink 正文段的终点标记(任一出现即止)。"""

DK_LINE_SEP = "\n"
"""duoink 题页正文是一词一行(渲染态倒出的 innerText),拼句先按行切。"""

TOKEN_JOIN = " "
"""词元拼句的连接符。"""

PUNCT_TIGHT_RE = re.compile(r"\s+([,.;:!?%)\]'’”])")
"""标点前多出的空格(词元逐行倒出后 `word ,` 要收成 `word,`)。"""

OPEN_TIGHT_RE = re.compile(r"([(\[$“‘])\s+")
"""开括号/开引号后多出的空格。"""

P_MART_DONE_TPL = "✓ pte mart:{types} 题型 · {questions} 题(有音频 {audio} · 押题 {predicted})→ {dir}"
"""日志:出表收口。"""

# =========================================================================
# 17. 批三:跨源同题合并 + piper 合成音频(2026-09-03,设计稿 docs/design/PTE刷题-20260903.md 批三)
# =========================================================================

NORM_TEXT_RE = re.compile(r"[^a-z0-9 ]")
"""跨源同题对账:题面小写后去掉非字母数字(标点/引号/连字符差异不算两题;
2026-09-03 实测 137 组 284 行同题,WFD 92 / ASQ 32 / RA 8 / RS 5)。"""

NORM_SPACE_RE = re.compile(r"\s+")
"""对账键里连续空白压成一个。"""

NORM_DROP = ""
"""对账时被去掉的字符替换成空。"""

MERGE_SRC_ORDER = (SRC_YNWAC, SRC_DUOINK)
"""同题正本优先级:ynwac 有票数与页面题号先当正本;其余源的回忆条数、最近考过日、押题、答案并入正本行。"""

P_MERGE_TPL = "  跨源同题合并:{groups} 组 {rows} 行 → 正本 {kept} 行"
"""日志:合并统计。"""

OUT_TTS_DIR = RAW_PTE / "tts"
"""合成音频落盘目录(data/raw/pte/tts/<qid 冒号换下划线>.mp3;资产进 git,声音模型不进)。"""

OUT_TTS_VOICES_DIR = OUT_TTS_DIR / "voices"
"""piper 声音模型目录(首跑自动从 HF 下 onnx + json;目录内 .gitignore 挡住)。"""

TTS_VOICE = "en_US-ryan-high"
"""piper 声音(Frank 2026-09-03「盒子 TTS」:自合成不烧 API;ryan-high 22.05kHz,一句 0.7 s CPU)。
换声音 = 改这一格 + 删 tts.json 全量重合成(pte_audio.voice 对账)。"""

TTS_MODEL_SUFFIX = ".onnx"
"""声音模型文件后缀。"""

TTS_WAV_SUFFIX = ".wav"
"""piper 直出的 wav 后缀(ffmpeg 在就转 mp3 删 wav)。"""

TTS_MP3_SUFFIX = ".mp3"
"""压缩后的 mp3 后缀(32 kbps 单声道,一句 ~8 KB,RA 段落 ~80 KB)。"""

TTS_FILE_SEP = "_"
"""文件名里替换题键冒号的字符(Windows 文件名不许冒号)。"""

FFMPEG_BIN = "ffmpeg"
"""mp3 编码器(PATH 里找;没有就留 wav,mime 随之)。"""

FFMPEG_IN_ARGS = ("-y", "-loglevel", "error", "-i")
"""ffmpeg 输入段参数(覆盖、只报错)。"""

FFMPEG_OUT_ARGS = ("-codec:a", "libmp3lame", "-b:a", "32k", "-ac", "1")
"""ffmpeg 输出段参数(mp3 32 kbps 单声道)。"""

MIME_MP3 = "audio/mpeg"
"""mp3 的 MIME。"""

MIME_WAV = "audio/wav"
"""wav 的 MIME。"""

OUT_TTS_INDEX = PROCESSED_PTE / "tts.json"
"""合成索引:{rows: [{qid, file, mime, voice}]}(file = data/raw/pte 相对路径);已有的不重合成。"""

TTS_K_ROWS = "rows"
"""合成索引:行清单键。"""

TTS_K_FILE = "file"
"""合成索引:文件相对路径。"""

TTS_K_MIME = "mime"
"""合成索引:MIME。"""

TTS_K_VOICE = "voice"
"""合成索引:声音名。"""

MART_AUDIO_FILE = "pte_audio.json"
"""mart 表文件名 = DB 表名 pte_audio(qid / mime / b64 / voice;生产镜像装不下仓库文件,音频走 seed 进库)。"""

A_K_B64 = "b64"
"""音频行:base64 正文。"""

AUDIO_URL_TPL = "/api/pte/audio/{qid}"
"""题行 audioUrl:站内路由(lib/pte 的 pteAudioRoute 按 qid 从 pte_audio 吐,带 immutable 缓存头)。"""

P_TTS_VOICE_TPL = "  声音 {voice} 就绪 → {dir}"
"""日志:声音模型就绪。"""

P_TTS_DONE_TPL = "✓ pte tts:新合成 {made} · 已有 {have} · 失败 {fail} → {dir}(mp3 编码 {mp3})"
"""日志:合成收口。"""

P_TTS_FAIL_TPL = "  ✗ 合成失败 {qid}"
"""日志:单题失败留痕。"""
