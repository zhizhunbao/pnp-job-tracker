"""
sched 域常量 —— 调度词汇表(守护循环节奏 / 环境键 / 子进程环境 / 报文模板 /
手动一轮的默认角色序;照 company 三件套样张,段横幅三行框 + N. 编号,与
functions.py / scheme.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/路径)。
唯一特批 import = `paths`(functions 顶层只许函数,标记目录路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役,
决策记录连人带日期原样折进所属常量的 docstring —— 一条不删。
零字符串令:functions 里除空串与语法位外,一切字面量住这;环境键一律 ENV_ 词族、
META 契约键一律 K_ 词族、文案模板一律 *_TPL。
"""
import paths

# =========================================================================
# 1. 单元发现(域 META/METAS 扫描)
# =========================================================================

ETL_DIR = paths.ROOT / "etl"
"""域目录根:发现单元时按 `etl/<域>/__init__.py` 逐个扫过去。"""

INIT_GLOB = "*/__init__.py"
"""域声明文件的样式(一级子目录下的 __init__)。"""

NOT_DOMAIN = ("__pycache__",)
"""这些一级目录不是「域」,发现单元时跳过(clean=横切清洗层;其余非域)。
2026-08-31 批K 溶解时两支合一:旧 auto_update 跳 clean + __pycache__,旧 run_now 只跳
clean —— __pycache__ 里没有 .py 的 __init__,两支的发现结果本来就逐单元相等。"""

UNDERSCORE = "_"
"""下划线开头的一级目录一律不当域(旧 _steps/_log 时代的沿袭)。"""

DOM_MOD_TPL = "_dom_{dom}"
"""临时模块名(域 __init__ 单文件加载用,不进 sys.modules 常驻)。"""

ATTR_METAS = "METAS"
"""一域多役的声明属性名(load 首例:build + backup)。"""

ATTR_META = "META"
"""一域一役的声明属性名(绝大多数域)。"""

K_ROLE = "role"
"""META 键:挂哪个角色容器(= SOURCE 环境变量的值)。"""

K_NAME = "name"
"""META 键:单元名(缺省 = 域名)。"""

K_INTERVAL = "interval"
"""META 键:本单元一轮的间隔秒。"""

K_SEED = "seed"
"""META 键:本轮成功后要不要灌库。"""

K_AFTER = "after"
"""META 键:上游单元名清单(消费者模式,盯上游 .done 标记的 mtime)。"""

K_PING = "ping"
"""META 键:本单元持不持心跳权(每角色只授一只)。"""

K_ONLY = "only"
"""META 键:入口同门不同 --only(METAS 一域多役用;空串 = 走默认链)。"""

DEFAULT_INTERVAL_S = 7200
"""META 没写 interval 时的兜底节奏(2h)。"""

STEP_PY = "python"
"""步骤 argv[0]:容器里 python 即本环境解释器(域门一律 `python etl/<域>/main.py`)。"""

DOM_MAIN_TPL = "etl/{dom}/main.py"
"""域唯一入口(一域一门;「跑哪些步」是域自己的事,调度器不关心步骤清单)。"""

ARG_ONLY = "--only"
"""单点某役/某步的参数名(METAS 多役靠它区分:build 默认链 / backup 单点)。"""

META_FAIL_TPL = "✗ 读域 {dom} 的 META 失败({name}: {detail}),跳过该域"
"""某域 __init__ 坏了只丢该域,不拖垮容器(手动一轮同样留痕 —— 永不吞异常令)。"""

# =========================================================================
# 2. 守护循环(常驻调度)
# =========================================================================

ENV_SOURCE = "SOURCE"
"""角色环境键:本容器要跑的单元 = 所有声明 role == SOURCE 的域役。"""

DEFAULT_SOURCE = "jobbank"
"""SOURCE 缺省角色。"""

ENV_SEED_URL = "SEED_URL"
"""seed 端点环境键(只用于开场报行;真正读它的是 load.functions)。"""

DEFAULT_SEED_URL = "http://host.docker.internal:3000/api/seed"
"""seed 端点缺省值(compose 同机模式)。
SEED_TOKEN 2026-08-30 随 seed HTTP 段收编 load 域(load.functions 直读 env;
E2-02 鉴权语义不变),调度层不再碰 token。"""

ROUNDS_DIR = paths.DATA / ".rounds"
"""各单元「本轮完成」标记(mtime)—— 下游靠它判断「有新轮次」,如 build after=jobbank。"""

DONE_NAME_TPL = "{name}.done"
"""单元标记文件名。"""

ROUND_STAMP_TPL = "{t:.0f}"
"""标记文件的内容(整秒时间戳;真正被读的是 mtime,内容只为人看)。"""

POLL_S = 30
"""轮询间隔(秒):消费者盯上游标记 + 多单元到点检查共用。"""

FAIL_RETRY_S = 3600
"""失败轮短重试(2026-08-30 立):周更役炸一下不再赔一周 —— 起因:Windows 卷
间歇 Errno 22 + 「失败照睡满周期」把 16/64 源拖成 15-25 天陈账;成功才睡满 interval。"""

DAEMON_SINK_FORMAT = "{time:YYYY-MM-DD HH:mm:ss} | {level: <5} | {extra[source]} | {message}"
"""统一格式:时间 | 级别 | 源 | 消息(容器日志无 TTY,不上色)。"""

K_SOURCE = "source"
"""loguru extra 的源字段名(sink 格式里的 {extra[source]});门开场 configure 一次兜底,
逐单元再 bind 覆盖。"""

NO_UNIT_TPL = "✗ 角色 {role} 没有任何单元(没有域声明 role={role},看 etl/*/__init__.py);退出"
"""空角色 = 配置错,当场退出(exit 1),不空转。"""

U_MODE_CONSUMER_TPL = "消费者(上游 {after},兜底 {interval}s)"
"""开场清单里消费者单元的节奏说法。"""

U_MODE_EVERY_TPL = "每 {interval}s"
"""开场清单里定时单元的节奏说法。"""

U_LINE_TPL = "单元 {name}:{mode}"
"""开场清单一行(每单元一行,独立计时互不牵连)。"""

U_SEED_SUFFIX_TPL = ",seed → {url}"
"""开场清单里灌库单元的尾巴。"""

ROUND_START_TPL = "===== {name}:开始一轮 ====="
"""一轮开始的分隔行。"""

ROUND_DONE_TPL = "===== {name}:完成 ====="
"""一轮全部步骤成功的收口行。"""

ROUND_RETRY_TPL = "===== {name}:未完整完成,{wait}s 后重试 ====="
"""一轮有步骤失败的收口行(等待 = min(FAIL_RETRY_S, interval))。"""

# =========================================================================
# 3. 单步执行(子进程 + loguru 前缀截获)
# =========================================================================

STEP_RUN_TPL = "→ {cmd}"
"""逐步报行(旧 auto_update 与旧 run_now 同一种说法,溶解后共用一条模板)。"""

CMD_SEP = " "
"""步骤 argv 打印拼接符。"""

ENV_UNBUFFERED = "PYTHONUNBUFFERED"
"""子进程环境键:关缓冲,stdout 才逐行实时回来。"""

VAL_ONE = "1"
"""开关型环境变量的开值。"""

ENV_IOENCODING = "PYTHONIOENCODING"
"""子进程环境键:强制 utf-8 输出(Windows 控制台默认 cp1252,吐中文当场炸)。"""

ENC_UTF8 = "utf-8"
"""子进程 stdout 解码编码,同时也是 PYTHONIOENCODING 的值。"""

ERRORS_REPLACE = "replace"
"""子进程输出解码容错档(解不出的字节不炸,换 U+FFFD)。"""

NEWLINE = "\n"
"""逐行截获时剥掉的行尾。"""

ERR_PREFIXES = ("✗", "!")
"""子进程行首告警前缀:命中则该行升 ERROR 级 —— 全域共用的错误通道。"""

LVL_ERROR = "ERROR"
"""loguru 级名:告警行。"""

LVL_INFO = "INFO"
"""loguru 级名:普通行。"""

SOURCE_UNIT_TPL = "{role}·{name}"
"""多单元混流时的日志前缀(2026-08-30 批A:每行可归属;单单元角色不变样)。"""

STEP_FAIL_MSG = "✗ 步骤失败,本轮中止,等下一轮重试"
"""一步失败即中止本轮的留痕行。"""

# =========================================================================
# 4. 轮次收尾(seed / alerts / ping)
# =========================================================================

SEED_OK_TPL = "✓ seed {status}: {body}"
"""灌库成功行。"""

SEED_FAIL_TPL = "✗ seed {status}: {body} —— mart 已落盘,下轮补(cms 没起也算这类)"
"""灌库失败行(HTTP 细节 2026-08-30 收编 load 域:600s 放弃线 / ok:true 真实判定 /
两种尾巴反推 alerts,决策记录随迁 load.constants;load.functions 纯返回不打日志 ——
日志面与心跳判定留本域)。"""

ALERTS_OK_TPL = "✓ alerts {status}: {body}"
"""邮件提醒触发成功行(E5-03:seed 成功后触发匹配版 alerts,同一 token 鉴权)。"""

ALERTS_FAIL_TPL = "✗ alerts {status}: {body} —— 不影响本轮"
"""邮件提醒触发失败行(失败不影响本轮,下轮补)。"""

QUEUE_OK_TPL = "✓ queue {status}: {body}"
"""智能投递触发成功行(2026-10-08;seed 成功、alerts 之后触发,同一 token 鉴权)。"""

QUEUE_FAIL_TPL = "✗ queue {status}: {body} —— 不影响本轮"
"""智能投递触发失败行(失败不影响本轮,下轮补)。"""

ENV_PING_TPL = "HEALTHCHECK_PING_{role}"
"""监控心跳环境键(E7-01):本轮全部成功且本单元持 ping 权 → ping healthchecks.io
(env 缺省不 ping)。批2 拆多单元后 ping 权收紧:每角色只授一只(META["ping"]=True),
防「兄弟单元的 ping 遮住本单元失败」—— pnp 角色授给 pnp 域(链尾 freshness 绿 =
数据真新鲜,B3-1 语义保真;2026-08-31 批D ops 拆散后 ping 权随 freshness 迁 pnp)。
2026-09-15 方案 3(Frank「3,那 10 个源也查一下」):角色心跳只凭本轮成败,不再过保鲜闸;保鲜另走 ENV_PING_FRESH。
2026-09-26 晚一单元一容器(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):每个单元自己就是一个角色,
ping 权人人有;本键没配的单元改由 ENV_HC_API_KEY 按角色名自动建检查项(见 functions.ping_url_of),配了的照旧用它。"""

ENV_HC_API_KEY = "HEALTHCHECKS_API_KEY"
"""healthchecks 项目 API 密钥(读写档)的环境键(2026-09-26 晚立;根 .env 由 Frank 亲手放,「别发在聊天里」)。
有它时,没配 ENV_PING_TPL 的单元开跑即按角色名建 / 取自己的检查项 —— 新开一个单元不用再手工建检查项、抄地址进 .env。"""

ENV_HC_API_URL = "HEALTHCHECKS_API_URL"
"""healthchecks API 根的环境键(缺省 = 托管版 HC_API_DEFAULT;自建版填它自己的根)。"""

HC_API_DEFAULT = "https://healthchecks.io"
"""托管版 API 根。"""

HC_CHECKS_PATH = "/api/v3/checks/"
"""建 / 取检查项的端点(POST;带 unique=["name"] 时同名已存在就更新并返回它,不重建)。"""

HC_HDR_KEY = "X-Api-Key"
"""API 密钥的请求头名(官方文档原名)。"""

HC_API_TIMEOUT_S = 20
"""API 请求放弃线。"""

HC_OK_CODES = (200, 201)
"""建 / 取检查项成功的状态码(201 = 新建,200 = 同名已存在、已更新)。"""

HC_K_NAME = "name"
"""检查项契约键:名字(= 角色名,唯一键)。"""

HC_K_TAGS = "tags"
"""检查项契约键:标签(空格分隔)。"""

HC_K_DESC = "desc"
"""检查项契约键:说明。"""

HC_K_TIMEOUT = "timeout"
"""检查项契约键:超时秒。"""

HC_K_GRACE = "grace"
"""检查项契约键:宽限秒。"""

HC_K_CHANNELS = "channels"
"""检查项契约键:通知渠道。"""

HC_K_UNIQUE = "unique"
"""检查项契约键:按哪些字段判「同一个检查项」。"""

HC_K_PING_URL = "ping_url"
"""API 回包里 ping 地址的键。"""

HC_CHANNELS_ALL = "*"
"""通知渠道取值:项目里已有的全部渠道(Frank 的邮箱)。"""

HC_TAGS_TPL = "etl {dom}"
"""检查项标签(控制台按域筛)。"""

HC_DESC_TPL = "etl/{dom} 的调度单元 {role}(容器 SOURCE={role}):成功一轮 ping 一次,一轮间隔 {interval} 秒;连续失败半小时起发 /fail,正文是出错的行"
"""检查项说明(控制台与邮件里看得到)。"""

HC_TIMEOUT_MIN_S = 3600
"""超时下限一小时:60 秒 / 5 分钟一轮的队列工人也按一小时算(一小时内有一轮成功就算活着)。"""

HC_GRACE_MIN_S = 14400
"""宽限下限四小时(2026-09-26 晚按容器日志实测定:最长的小时级单元一轮跑 3 小时 —— sites 177 分钟,
两次成功之间最长 4 小时;宽限小于它,好好的单元也会报警)。"""

HC_GRACE_FACTOR = 2
"""宽限 = 两倍间隔(再夹在上下限之间):六小时一轮的单元一轮能跑 7.6 小时(company 实测 458 分钟),两倍才容得下。"""

HC_GRACE_MAX_S = 86400
"""宽限上限一天:日更单元超时一天 + 宽限一天 = 两天没成功就报(对齐保鲜标准「最次日更」+ 一天余量)。"""

HC_REG_OK_TPL = "✓ healthchecks 检查项 {role} 就位(API 建 / 取)"
"""按角色名建 / 取检查项成功(地址不打进日志:带检查项 UUID)。"""

HC_REG_FAIL_TPL = "✗ healthchecks 检查项 {role} 建 / 取失败 {status}: {body} —— 本轮收尾再试"
"""API 回了非成功码(免费档满 20 个检查项时也是这行)。"""

HC_REG_ERR_TPL = "✗ healthchecks 检查项 {role} 建 / 取失败({name})—— 本轮收尾再试"
"""API 请求本身出错(网络等)。"""

HC_REG_BODY_CLIP = 200
"""失败回包进日志的截断长度。"""

HC_FAIL_SUFFIX = "/fail"
"""ping 地址后缀:发它 = 检查项当场转红(官方语义「the job has failed」)。"""

HC_FAIL_AFTER_S = 1800
"""连续失败多久才发 /fail(2026-09-26 晚):偶发的一轮超时不报,连续失败满半小时才报 ——
小时级单元等于第二轮还失败,60 秒一轮的队列工人等于连续失败半小时。成功一轮清零,检查项随下一次成功 ping 转绿。
为什么要发 /fail:新建的检查项在收到第一次 ping 之前一直是灰的、永不报警 —— 一上来就坏着的单元(qs、ee 门槛表)
等不到成功 ping,不发 /fail 就永远没人知道。"""

HC_FAIL_BODY_TPL = "单元 {role} 连续失败 {mins} 分钟(本轮的出错行,最多 {n} 行):\n{lines}"
"""/fail 正文(healthchecks 告警邮件里原样显示 —— 哪个单元、多久、为什么)。"""

HC_FAIL_NO_LINES = "(本轮没有 ✗ 行,见单元 {role} 的容器日志)"
"""/fail 正文里没有 ✗ 行时的占位(例如灌库那步失败只在调度层留痕)。
同晚 compose 服务名加类别前缀(job_ / co_ / fed_ / ops_ …)后服务名不再等于单元名,原句「见容器日志 docker compose logs {role}」
里的命令就不对了,改成只点单元名。"""

HC_FAIL_LINES = 20
"""/fail 正文最多带几行出错行(取本轮最后的那几行)。"""

HC_FAIL_BODY_MAX = 3000
"""/fail 正文截断长度(字符):自建版 PING_BODY_LIMIT 缺省 10000 字节,中文一字三字节,3000 字才放得下;邮件里十几行足够定位。"""

HC_FAIL_SENT_TPL = "✗ healthchecks /fail 已发(连续失败 {mins} 分钟)"
"""/fail 发出去的留痕。"""

SEC_PER_MIN = 60
"""秒 → 分(连续失败时长报分钟)。"""

PING_TIMEOUT_S = 10
"""心跳请求放弃线。"""

PING_OK_MSG = "✓ healthcheck ping"
"""心跳成功行。"""

PING_FAIL_TPL = "✗ healthcheck ping 失败({name})"
"""心跳失败行(只留痕,不影响本轮成败)。"""

ENV_PING_FRESH = "HEALTHCHECK_PING_FRESHNESS"
"""保鲜心跳环境键(2026-09-15 方案 3,Frank「3,那 10 个源也查一下」):全舰队保鲜闸通过才 ping 这个地址。
原来保鲜闸挡在每个角色的心跳前面,任一源超期所有角色一起转红 —— 分不清是哪个角色挂了还是哪份数据旧了
(10 个源超期让 backup / jobbank / pnp / build 四个检查项红了两周,新接的 hireac 成功也发不出心跳)。
现拆开:角色心跳只看本轮成败;保鲜单立一个检查项。只配给 build 服务(每小时一轮),其余角色 env 缺省不跑保鲜闸。"""

PING_FRESH_OK_MSG = "✓ healthcheck ping(保鲜)"
"""保鲜心跳成功行。"""

K_FRESH = "fresh"
"""META 键:保鲜契约(2026-08-31 批O,Frank「source_manifest 也不需要」:中央花名册退役,
谁的产物谁声明「该多新」)。行清单,一行 = {glob 或 file, cadence_days, 可选 key/note};
glob 行铺全量后被 file 行压过(原 defaults/overrides 语义原样)。
原契约 v1 的决策记录随迁(B3-1/B3-2,2026-08-03):cadence_days 是**抓取回写节奏**的宽限,
不是官方发布节奏;glob 默认让新落的抓取产物自动进哨兵(铁律 2「抓完必须入役」的机器面);
超期即红 → 不 ping → 报警 —— ping 从此证明「数据是新的」而不只是「脚本跑完」
(2026-08-03 实撞:pnp 役每小时绿着,MB/NB 的表停在 8 天前;ON 抽选断档三个月没人发现)。"""

FRESH_K_FILE = "file"
"""fresh 行键:相对 data/ 的文件路径(覆盖档)。"""

FRESH_K_GLOB = "glob"
"""fresh 行键:glob 模式(默认档)。"""

FRESH_K_CADENCE = "cadence_days"
"""fresh 行键:保鲜期天数。"""

FRESH_K_KEY = "key"
"""fresh 行键:取「数据是哪天的」用哪个顶层键。"""

FRESH_K_NOTE = "note"
"""fresh 行键:超期时的补充说明。"""

FRESH_KEY_DEFAULT = "fetched"
"""默认取戳键。"""

FRESH_KEY_MTIME = "mtime"
"""特殊取戳键:文件修改时刻兜底。"""

FRESH_DATE_FMT = "%Y-%m-%d"
"""戳的日期格式。"""

FRESH_STAMP_LEN = 10
"""戳截断长度(ISO 日期前 10 位)。"""

FRESH_P_MISSING_TPL = "✗ 保鲜 {rel}: 文件不存在(契约里在,盘上没有)"
"""超期行:文件缺席。"""

FRESH_P_NOSTAMP_TPL = "✗ 保鲜 {rel}: 取不到 {key}(无戳的数据不能拿来下结论,见 B3-3)"
"""超期行:无戳。"""

FRESH_P_BADDATE_TPL = "✗ 保鲜 {rel}: {key}={stamp} 不是日期"
"""超期行:戳不是日期(stamp 已 repr 后传入)。"""

FRESH_P_STALE_TPL = "✗ 保鲜 {rel}: {stamp}({age} 天前,限 {cad} 天)"
"""超期行。"""

FRESH_P_STALE_NOTE_TPL = "✗ 保鲜 {rel}: {stamp}({age} 天前,限 {cad} 天) —— {note}"
"""超期行(带契约备注)。"""

FRESH_P_SUMMARY_TPL = "✗ {n}/{total} 个源超期或无戳,保鲜心跳不发(保鲜检查项转红)"
"""保鲜闸收口行(先逐行打超期,再打本行;ping 被扣下 → healthchecks 转红报警)。
原句「本轮扣 ping 转红」;2026-09-15 方案 3 起扣的只是保鲜检查项的心跳,角色心跳照发。"""

FRESH_P_ALL_OK_TPL = "✓ 保鲜 {n} 个源全部在期"
"""保鲜闸通过行(ping 前打一行,证明「数据是新的」有据)。"""

# =========================================================================
# 5. 手动一轮(run_now:管理台不赚钱先放,给脚本直接执行能看进度)
# =========================================================================

DEFAULT_ROLES = ("jobbank", "pnp", "ee", "news", "ircc", "build")
"""手动一轮的默认角色序(build 含灌库,排最后)。"""

CMS_DIR = "cms"
"""借 SEED_TOKEN 的目录(展示层)。"""

ENV_FILE = ".env"
"""借 SEED_TOKEN 的文件名。"""

ENV_SEED_TOKEN = "SEED_TOKEN"
"""灌库鉴权 token 的环境键(手动跑时从 cms/.env 借一次,进程内传给子进程)。"""

TOKEN_LINE_PREFIX = "SEED_TOKEN="
"""cms/.env 里那一行的前缀。"""

KV_SEP = "="
"""env 行的键值分隔。"""

MANUAL_SEED_URL = "https://offer2pr.com/api/seed"
"""手动一轮默认灌生产(2026-08-29 正门迁 /api/seed,旧 onrender 域名只剩 301);
SEED_URL 环境变量可覆盖。"""

MANUAL_SINK_FORMAT = "{message}"
"""手动一轮的 sink:只打消息本身 —— 旧 run_now 是裸 print,溶解后逐行输出一字不差。"""

UNKNOWN_ROLE_TPL = "✗ 未知役/域 {role}(角色/域看 etl/*/__init__.py 的 META/METAS)"
"""点名了不存在的役/域(跳过它,继续下一个)。"""

NOW_HEAD_TPL = "\n===== {role}({names},{n} 步)====="
"""一个役的抬头行(役名 + 命中的单元名 + 步数)。"""

NAME_JOIN = "+"
"""抬头行里多单元名的拼接符。"""

NOW_FAIL_TPL = "✗ {role} 步骤失败 rc={rc} —— 本役中止,继续下一役"
"""手动一轮里某步失败(本役中止,不拖累别的役)。"""

NOW_OK_TPL = "✓ {role} 完成"
"""一个役全部步骤成功。"""

NOW_END_TPL = "\n===== 全部结束,用时 {sec:.0f}s ====="
"""手动一轮收口行。"""
