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

ENV_PING_TPL = "HEALTHCHECK_PING_{role}"
"""监控心跳环境键(E7-01):本轮全部成功且本单元持 ping 权 → ping healthchecks.io
(env 缺省不 ping)。批2 拆多单元后 ping 权收紧:每角色只授一只(META["ping"]=True),
防「兄弟单元的 ping 遮住本单元失败」—— pnp 角色授给 pnp 域(链尾 freshness 绿 =
数据真新鲜,B3-1 语义保真;2026-08-31 批D ops 拆散后 ping 权随 freshness 迁 pnp)。"""

PING_TIMEOUT_S = 10
"""心跳请求放弃线。"""

PING_OK_MSG = "✓ healthcheck ping"
"""心跳成功行。"""

PING_FAIL_TPL = "✗ healthcheck ping 失败({name})"
"""心跳失败行(只留痕,不影响本轮成败)。"""

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

FRESH_P_SUMMARY_TPL = "✗ {n}/{total} 个源超期或无戳,本轮扣 ping 转红"
"""保鲜闸收口行(先逐行打超期,再打本行;ping 被扣下 → healthchecks 转红报警)。"""

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
