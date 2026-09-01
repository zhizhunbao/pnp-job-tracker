"""
gate 域常量 —— 自查闸的词汇表(形制十规的名单与正则 / 基线路径 / 写法债报告的规则集
与 md 骨架 / 锁自查档位;照 company 三件套样张,段横幅三行框 + N. 编号,与
functions.py / scheme.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,基线与报告路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役,
决策记录连人带日期原样折进所属常量的 docstring —— 一条不删。
"""
import re

import paths

# =========================================================================
# 1. 形制扫描(十规)
# =========================================================================

REPO_ROOT = paths.ROOT
"""仓库根(跑 ruff 的工作目录)。"""

ETL_DIR = REPO_ROOT / "etl"
"""被扫的根(域目录都在它下面)。"""

DOMAINS = ["aip", "ats", "citations", "company", "crawl", "dli", "ee", "employers", "fcip",
           "fetch", "fsa", "gate", "ircc", "jobbank", "lmia", "load", "log", "mart", "news",
           "noc", "paths", "pnp", "rcip", "sched", "wages"]
"""被扫的域清单(新立域在此登记,不登记 = 不被查 = 白写)。
gate/sched 2026-08-31 批K 立域(Frank「我觉得也需要设计成域」:根上五件管理层脚本
全溶两域,etl/ 根 .py 清零)—— 自查闸自己也进名单,溶完用新门自查。
mart 2026-08-31 批H 立域(Frank「可以」:08-11 跨源汇装四步 + grades 收编,回答「mart 怎么建」)
jobbank/ats 2026-08-31 批F 立域(Frank「jobbank 肯定是需要一个域的」,推翻「抓岗留根」旧判)
pilot 2026-08-31 批E 拆三域 rcip/fcip/aip 退役(Frank「拆成三个 很少有人有法语」)
noc_facts → noc(2026-08-31 Frank「noc 就叫 noc」:根上 noc.py/noc_buckets.py 两库并入,
双重身份同 fetch/crawl:既被扫也可被依赖)
ops 2026-08-31 批D 拆散退役(Frank「ops 不算域」:哨兵/审计归各查的域,工具归根);
citations 同批新立(字段级来源注册表,role=pnp)
fetch/crawl 2026-08-30 零字符串溶完即入册(INFRA 身份不变:域可引;双重身份 = 既被扫也可被依赖)
crawl 2026-08-30 批A 升格基础设施(判据:被十几个 build 当地基读缓存 ——「换掉它
业务一个字不用改」;正门 from crawl.cache import …,path-hack 黑通道批B 拆光)"""

INFRA = {"paths", "fetch", "log", "noc", "crawl", "names"}
"""基础设施叶:域可引(判据「换掉它业务一个字不用改」)。
names 2026-08-31 收拢批入册:公司名归一唯一尺子(aip 打标 / lmia 聚合键 / mart join 判
「同一家雇主」必须同一把,原先四份复制 → 探针取证后收一),与 noc 同款判定叶。
grades 2026-08-31 批H 摘出:随 mart 立域收编为域内私件(唯一消费者 build_mart),
不再是根上被谁都能引的基础设施叶。
noc_buckets 2026-08-31 随「noc 就叫 noc」并入 noc/ 域,模块名退役摘出白名单;
_steps 2026-08-31 批D 随 ops 退役消费者清零删除(全溶域门一律直调)。"""

ABOVE = {"gate", "sched"}
"""**域层之上**的两域,①号规(域间禁 import)对它们放行(2026-08-31 批K 立)。
判据 = 依赖方向单边且永不反向:sched 要发现每个域的 META、要进程内直调 load 的
seed/alerts 触发;gate 要 import 被测域来跑锁自查 —— 而任何域都不许 import 它们两个。
它们不是域的邻居,是链的顶层;拿「域间禁 import」去卡调度器与闸,卡的是自己的地基。
⚠ 放行只放①号规:五件套白名单、零字符串、显式循环等其余九规一条不减。"""

DOMAIN_FILES = ("__init__.py", "main.py", "constants.py", "scheme.py", "functions.py",
                "variables.py")
"""⑩号规的白名单:域目录(含子目录)里只许住这六个名字的 .py。
判据(2026-08-31 批K Frank「新 session 一来没有检查,到时候又弄乱了」「别加白名单,
都需要检查的」):**域 = 五件套,生而合规;野文件 = 乱的入口**。九个抽屉都装不下 =
那东西不属于这个域。照 (frontend) 白名单三文件先例做成机器闸,**硬红,无例外登记表** ——
要加名过 Frank(改的是这行常量,不是给某个目录开后门)。
批K 原「只扫 .py:数据契约件不在射程」的豁免 2026-08-31 批O 作废(Frank「有 .json 文件
怎么没检查出来」):两件契约 json 已退役(source_manifest 进各域 META,形制基线缺文件=零),
⑩号规扩到**全部受 git 管的文件**,非 .py 词汇见 DOMAIN_EXTRA_FILES。"""

DOMAIN_EXTRA_FILES = ("Dockerfile",)
"""⑩号规的非 .py 词汇:域目录里唯一许住的非 Python 文件名(2026-08-31 批N「一域一容器」,
crawl 域自带浏览器重镜像)。运行时垃圾(crawl/.browser-profile、__pycache__)不受 git 管,
git ls-files 枚举下自然免检;域里再落任何杂 json/杂件当场硬红。"""

GIT_LSFILES = ("git", "ls-files", "--", ".")
"""⑩号规全文件面的枚举命令(在 ETL_DIR 下执行,只看受 git 管的文件)。"""

PY_GLOB = "*.py"
"""域内被扫文件的样式(.py 面走 rglob:没提交的野 .py 也要抓)。"""

PY_SUFFIX = ".py"
"""全文件面里让位给 .py 面的后缀(同一文件不报两遍)。"""

PYCACHE = "__pycache__"
"""扫描时跳过的字节码目录。"""

MAIN_NAME = "main.py"
"""域唯一入口的文件名(③号规:只有它许带 __main__)。"""

FUNCTIONS_NAME = "functions.py"
"""域内行为件的文件名(⑤⑥⑦⑧号规只查它)。"""

IMPORT_RE = re.compile(r"^(?:from|import)\s+([A-Za-z_][A-Za-z0-9_]*)", re.M)
"""①号规:行首 import/from 的首段模块名。"""

INOUT_RE = re.compile(r"^(?:IN|OUT)_[A-Z0-9_]*\s*=", re.M)
"""②号规:IN_/OUT_ 显式路径常量声明。"""

MAIN_RE = re.compile(r"^if __name__", re.M)
"""③号规:可执行入口。"""

PRINT_RE = re.compile(r"^\s*print\(", re.M)
"""④号规:裸 print(域内出口唯一 = log.functions.say/err)。"""

UNDERSCORE_FN_RE = re.compile(r"^(?:async +)?def +_", re.M)
"""⑤号规:下划线前缀的顶层函数。"""

TOP_CONST_RE = re.compile(r"^[A-Z][A-Z0-9_]* *=", re.M)
"""⑥号规:functions 顶层常量。"""

CONST_STRIP = " ="
"""⑥号规报违规时从命中片段尾部剥掉的空格与等号(只留常量名)。"""

STEP_PREFIX = ("build_", "scrape_", "enrich_")
"""②号规只查这三种前缀的步骤模块(宪法既有:IN_/OUT_ 住模块头,运行时打印)。"""

KEY_CALLS = {"get", "setdefault", "pop"}
"""字典取值方法名:第一参在 to_* 体内算「行键」,豁免零字符串令。"""

EXEMPT_VALUES = {"", "w"}
"""零字符串令的值级豁免:空串与写模式(语法位)。"""

TO_PREFIX = "to_"
"""行构造器前缀:只有它体内的行键/字面量键豁免(方言律⑩)。"""

FRAG_LEN = 24
"""报违规时字符串片段的截断长度。"""

ENC_UTF8 = "utf-8"
"""读文件与写基线/报告的编码。"""

ERRORS_REPLACE = "replace"
"""读文件的解码容错档(解不出的字节不炸)。"""

NEWLINE = "\n"
"""行号换算与报告拼接用的换行符。"""

CROSS_IMPORT_TPL = "{rel}: 域间 import「{name}」(只许基础设施叶子与本域)"
"""①号规违规行。INFRA 优先:fetch 2026-08-30 起双重身份(被扫的域 + 可被依赖的基础设施叶)。"""

NO_INOUT_TPL = "{rel}: 缺 IN_/OUT_ 显式路径常量"
"""②号规违规行(存量走基线)。"""

EXTRA_MAIN_TPL = "{rel}: 步骤模块带 __main__(一域一门,该收成 run())"
"""③号规违规行(存量走基线)。"""

BARE_PRINT_TPL = "{rel}:{lineno} 裸 print(域内出口唯一 = log.functions.say/err)"
"""④号规违规行。"""

UNDERSCORE_FN_TPL = ("{rel}:{lineno} 下划线前缀函数"
                     "(2026-08-30 Frank:私有靠单消费者事实,不靠名字装饰)")
"""⑤号规违规行。"""

TOP_CONST_TPL = ("{rel}: functions 顶层常量「{name}」"
                 "(归 constants;2026-08-30 Frank 否决段首常量,Ruff 无此规则故住本闸)")
"""⑥号规违规行。"""

STRING_LIT_TPL = "{rel}:{lineno} functions 体内字符串「{frag}」(零字符串令,提名进 constants)"
"""⑦号规违规行。"""

BANNED_SYNTAX_TPL = "{rel}:{lineno} {label}(显式循环令/一参令,2026-08-30)"
"""⑧⑨号规违规行。"""

STRAY_FILE_TPL = ("{rel}: 域文件名不在五件套白名单"
                  "(2026-08-31 批K Frank:域=五件套,生而合规;野文件=乱的入口)")
"""⑩号规违规行(硬红,不进基线)。"""

LBL_LAMBDA = "lambda"
"""⑧号规的说法:匿名函数。"""

LBL_LISTCOMP = "列表推导"
"""⑧号规的说法:列表推导式。"""

LBL_SETCOMP = "集合推导"
"""⑧号规的说法:集合推导式。"""

LBL_DICTCOMP = "字典推导"
"""⑧号规的说法:字典推导式。"""

LBL_GENEXP = "生成器表达式"
"""⑧号规的说法:genexp。"""

DEFAULT_ARG_TPL = "函数 {name} 带默认值参数(可选参数禁,cms 同律)"
"""⑨号规的说法:一参令的默认值那一半。"""

NESTED_FN_TPL = "内嵌函数 {name}(出户成顶层,cms tsx 同律)"
"""⑨号规的说法:内嵌函数禁令。"""

# =========================================================================
# 2. 基线管理(prune:只紧不松)
# =========================================================================

BASELINE = ETL_DIR / "gate" / "etl_shape_baseline.json"
"""②③两条软规的存量基线:新增违规即红;修掉存量后跑 `--only prune` 收紧 —— 只紧不松
(同 cms suppressions 惯例)。2026-08-31 批D 自 ops/ 迁根,批K 随 gate 立域搬进本目录。
批O(Frank「有 .json 怎么没检查出来」):存量清零后**文件退役** —— 缺文件 = 零基线,
prune 只在还有存量时落盘(有债才有账本;账本自己也别当杂 json 赖在域里)。"""

BASELINE_INDENT = 1
"""基线 JSON 的缩进(逐行可读,diff 友好)。"""

PRUNE_REJECT_MSG = "✗ prune 拒绝:基线只紧不松,先修掉新增违规:"
"""收紧前发现新增违规(拒绝写盘)。"""

PRUNE_ROW_TPL = "  - {row}"
"""拒绝清单的明细行。"""

PRUNE_OK_TPL = "✓ 基线收紧:{before} → {after}"
"""收紧成功行。"""

HARD_ROW_TPL = "✗ {row}"
"""硬红一行(域间 import / 裸 print / functions 方言 / 野文件)。"""

FRESH_ROW_TPL = "✗ 新增形制违规: {row}"
"""基线外新增的软规违规一行。"""

FIXED_TPL = "ℹ 有 {n} 条基线违规已修,跑 --prune 收紧"
"""存量修掉了的提示行。"""

PASS_TPL = "✓ 形制自查过闸(基线存量 {n} 条滚动中)"
"""过闸行。"""

# =========================================================================
# 3. 写法债报告(对齐 cms lint:report)
# =========================================================================

REPORTS_DIR = paths.ROOT / "reports"
"""报告统一屋(cms lint-report 同惯例,已进 .gitignore —— 报告是耗材,不进库)。"""

REPORT_NAME_TPL = "ruff-{stamp}.md"
"""报告文件名(本地时间戳)。"""

STAMP_FMT = "%Y-%m-%d-%H%M"
"""时间戳格式。"""

BARE_RULES = "E4,E7,E9,F,ANN,D1,N,C901,PLR0913,PLR0915,BLE,S110,S112"
"""裸账规则集 = pyproject select 全集(--isolated 跑,连 E402 豁免也不认)。"""

RUFF_GATE_CMD = ("uv", "run", "--with", "ruff", "ruff", "check", "etl")
"""闸视角命令(带 pyproject 全部豁免,守门态)。"""

RUFF_BARE_CMD = ("uv", "run", "--with", "ruff", "ruff", "check", "etl", "--isolated",
                 "--select", BARE_RULES, "--line-length", "120", "--target-version", "py311")
"""裸账视角命令(--isolated 去掉 pyproject 全部豁免)。"""

ARG_STATISTICS = "--statistics"
"""裸账统计档。"""

ARG_OUTPUT_FORMAT = "--output-format"
"""输出格式参数名。"""

VAL_CONCISE = "concise"
"""逐条一行的输出格式。"""

DISSOLVED = ("etl/company/", "etl/crawl/", "etl/dli/", "etl/employers/", "etl/fetch/",
             "etl/gate/", "etl/lmia/", "etl/load/", "etl/log/", "etl/paths/", "etl/pnp/",
             "etl/sched/", "etl/wages/", "etl/news/", "etl/ee/", "etl/ircc/", "etl/noc/",
             "etl/fsa/", "etl/rcip/", "etl/fcip/", "etl/aip/", "etl/citations/")
"""已溶区清单(五件形制已落地的文件面;新域溶完在此登记)。
2026-08-31 批C 登记五域:ee/ircc(子工A)、noc(并 noc.py/noc_buckets.py 两库,
「noc 就叫 noc」)、fsa、pilot(extractors 私件群随域,存量待批E 拆三域时就范);
批D 登记 citations(自 ops/verify_field_source_pages 全溶新立);
批K 登记 gate/sched(根上五件管理层脚本全溶两域,etl/ 根 .py 清零)。"""

TOP_N = 30
"""存量区榜单长度。"""

ETL_PREFIX = "etl"
"""ruff 输出里属于本仓 etl 的行的行首。"""

BACKSLASH = "\\"
"""Windows 路径分隔(报告里一律归一成 /)。"""

SLASH = "/"
"""归一后的路径分隔。"""

COLON = ":"
"""ruff concise 行的字段分隔(文件:行:列: 规则 说明)。"""

FENCE = "```"
"""md 代码块围栏。"""

MD_TITLE_TPL = "# etl ruff 报告 — {stamp}"
"""报告标题。"""

MD_INTRO = "两个视角:闸视角守门(带 pyproject 豁免),裸账视角(--isolated 去掉全部豁免)看存量债。"
"""报告导语。"""

MD_EXEMPT_NOTE = ("豁免清单 = pyproject.toml per-file-ignores,一文件一行只紧不松;"
                  "形制闸另有自研十规(etl/gate/main.py --only shape)。")
"""豁免与形制闸的指路行。"""

MD_SEC1 = "## ① 闸视角"
"""第一段抬头。"""

MD_SEC2 = "## ② 裸账统计(全 etl)"
"""第二段抬头。"""

MD_SEC3_TPL = "## ③ 已溶区余账({n} 条,应只剩挂账的复杂度拆分债)"
"""第三段抬头(多一条 = 新债漏网)。"""

MD_SEC4_TPL = "## ④ 存量区 top {n} 文件(下一步溶解地图)"
"""第四段抬头(= 下一批溶解地图)。"""

MD_TABLE_HEAD = "| 条数 | 文件 |"
"""榜单表头。"""

MD_TABLE_SEP = "|---:|---|"
"""榜单表头分隔行。"""

MD_ROW_TPL = "| {n} | {f} |"
"""榜单一行。"""

# =========================================================================
# 4. 锁自查(build/jobbank 跨进程互斥的真件测试)
# =========================================================================

LOCK_VERBOSITY = 2
"""unittest 运行档:逐条打用例名与结果(旧 `unittest.main()` 默认是一行点号;
进门当闸后逐条可读更有用,断言与用例集一条未动)。"""
