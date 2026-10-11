"""load.constants — 灌库层词表(seed/alerts 触发 / mart 上传分片 / pg_dump 备份)。

2026-08-30 立域(Frank 拍板,名从宪法分层 raw→clean→mart→load;不叫 payload ——
按会变的后端命名违切界律,且 backup 走 pg_dump 根本不经 Payload)。
"""

ENV_SEED_URL = "SEED_URL"
"""seed 端点环境键(例 https://offer2pr.com/api/seed)。"""

DEFAULT_SEED_URL = "http://host.docker.internal:3000/api/seed"
"""seed 端点默认值(compose 同机模式)。"""

ENV_SEED_TOKEN = "SEED_TOKEN"
"""seed 鉴权 token 环境键(生产必设,E2-02;本地 dev 可空)。"""

HDR_SEED_TOKEN = "x-seed-token"
"""seed/alerts/mart 三端点共用的鉴权头名。"""

SEED_TIMEOUT_S = 600
"""seed 超时:放弃线不是期望值(2026-08-14 生产偶发慢轮连续 4 轮超 180s,600s 内能完;
卡太紧 = 白跑一轮再重灌)。"""

ALERTS_TIMEOUT_S = 300
"""alerts 触发超时。"""

API_SEED_SUFFIX = "/api/seed"
"""seed 正门尾巴(2026-08-29 迁 /api/seed)。"""

OLD_SEED_SUFFIX = "/seed"
"""旧壳尾巴(过渡期两种都认,反推站点根)。"""

ALERTS_PATH = "/api/alerts/run"
"""邮件提醒端点(E5-03:seed 成功后触发匹配版 alerts,同 token 鉴权)。"""

K_OK = "ok"
"""端点响应体的成功键(2xx 且 ok:true 才算成功 —— 502 返回 HTML,只看状态码会记假成功)。"""

MART_UPLOAD_TIMEOUT_S = 120
"""mart 单表上传超时。"""

MART_PATH_TPL = "{base}/api/mart/{name}"
"""mart 上传端点(一表一名;E7-04 交接层)。"""

HDR_CONTENT_TYPE = "Content-Type"
"""内容类型头名。"""

CT_GZIP = "application/gzip"
"""gzip 上传的内容类型。"""

SHARD_BYTES = 6 * 1024 * 1024
"""超过就按行数分片:cms 是 512MB 实例,整文件 parse 27k 行 jobs(64MB)会 OOM
(2026-07-16 实撞);seed 侧逐片 parse→入库→释放。"""

PART_NAME_TPL = "{stem}__part{k}"
"""分片名(片序 0..N-1)。"""

META_NAME_TPL = "{stem}__meta"
"""片数声明名(= 提交语义:半程失败旧 meta 仍指旧的完整片集,seed 不会读到半新半旧)。"""

K_PARTS = "parts"
"""meta 声明体的片数键。"""

MART_GLOB = "*.json"
"""mart 目录里的表文件样式。"""

PART_LABEL_TPL = "{name} [{k}/{n}]"
"""分片上传的进度标签。"""

META_LABEL_TPL = "{name} meta(parts={n})"
"""meta 上传的进度标签。"""

UPLOAD_OK_TPL = "✓ {label}  ({kb} KB → gz {gz_kb} KB)"
"""单表上传成功行。"""

UPLOAD_FAIL_TPL = "✗ {label}: {status} {body}"
"""单表上传失败行(任一表失败整步失败,防 /tmp 半新半旧)。"""

UPLOAD_SKIP_MSG = "SEED_URL 未配置,跳过上传(本地/同机模式,seed 读本地 mart)"
"""无密钥模式不动作。"""

UPLOAD_EMPTY_MSG = "data/mart/ 为空,无可上传"
"""空 mart 防线(算失败)。"""

UPLOAD_DONE_TPL = "上传完成:{n} 张表 → {base}/api/mart/"
"""上传收口行。"""

ERR_BODY_TPL = "{name}: {detail}"
"""网络错转数据时的 body 摘要形(异常类名 + 详情)。"""

ENV_BACKUP_URI = "BACKUP_DATABASE_URI"
"""备份库连接串环境键(compose 从根 .env 注入(批N 起 compose 住仓库根))。"""

ENV_DB_URI = "DATABASE_URI"
"""备份库连接串兜底键。"""

ENV_KEEP_DAYS = "BACKUP_KEEP_DAYS"
"""备份保留天数环境键。"""

KEEP_DAYS_DEFAULT = "14"
"""默认保留 14 天。"""

BACKUPS_DIR = "backups"
"""备份落盘目录(仓库根下)。"""

DUMP_CMD = ("pg_dump", "--no-owner", "--no-privileges")
"""备份命令(容器里 postgres 镜像自带客户端)。"""

SQL_GZ_SUFFIX = ".sql.gz"
"""备份文件后缀(名 = 当日 ISO 日期)。"""

SQL_GZ_GLOB = "*.sql.gz"
"""清理旧备份的样式。"""

DAY_S = 86400
"""一天的秒数(保留窗计算)。"""

BACKUP_SKIP_MSG = "BACKUP_DATABASE_URI/DATABASE_URI 未设 → 跳过备份(本地模式)"
"""无密钥模式不动作。"""

BACKUP_OUT_TPL = "OUT: {out}"
"""备份目标行。"""

BACKUP_FAIL_TPL = "! pg_dump 失败: {detail}"
"""备份失败行。"""

BACKUP_DONE_TPL = "备份完成: {name} ({kb} KB)"
"""备份成功行。"""

BACKUP_PRUNE_TPL = "清理超过 {days} 天的旧备份: {n} 个"
"""旧备份清理行。"""

SCHEME_SEP = "://"
"""URL 协议分隔(从 SEED_URL 反推站点根)。"""

ERRORS_REPLACE = "replace"
"""子进程 stderr 解码容错档。"""

ENC_UTF8 = "utf-8"
"""子进程 stdout 解码编码(Windows 上 text=True 默认走 cp1252,必须显式指定)。"""

DEPLOY_SITE = "https://offer2pr.com"
"""生产站点根(部署哨兵比对的对象)。"""

DEPLOY_VERSION_URL = f"{DEPLOY_SITE}/api/version"
"""线上版本端点(报的是当前构建的提交 SHA)。"""

DEPLOY_TIMEOUT_S = 20
"""哨兵的网络/子进程放弃线。"""

K_COMMIT = "commit"
"""/api/version 响应体里的提交 SHA 键。"""

SHA_SHOW_LEN = 12
"""SHA 比对与打印的前缀长度。"""

LS_REMOTE_CMD = ("git", "ls-remote", "origin", "refs/heads/main")
"""取 origin/main 的 SHA。不用本地 HEAD —— 本地可能有没推的提交,那不该算「该上线的版本」。"""

GIT_FETCH_CMD = ("git", "fetch", "--quiet", "origin")
"""比差集前先把远端对象拉全(拉不到就退回只比 SHA)。"""

GIT_LOG_CMD = ("git", "log", "--format=%h\t%s")
"""差集提交清单(短 SHA + 制表符 + 标题)。"""

GIT_RANGE_TPL = "{live}..{want}"
"""差集区间(线上..origin/main)。"""

TAB = "\t"
"""git log 输出的列分隔。"""

COMMIT_ROW_TPL = "{h} {m}"
"""差集里一条提交的说法(短 SHA + 标题)。"""

SKIP_MARKERS = ("[skip render]", "[skip ci]", "[skip cd]", "[no ci]")
"""Render 只在 head 提交消息不含 skip 标记时才构建 —— 项目惯例:纯文档/纯数据提交一律带
[skip render]。于是「线上 SHA 落后」有两种完全不同的含义,混为一谈的代价是哨兵天天喊狼来了、
喊到没人信,正好毁掉它 2026-07-21 那次事故(六提交白躺一天)换来的价值:
  · 差集里有**不带 skip** 的提交 → 真没上线,要报警
  · 差集**全是带 skip** 的提交   → 本来就不该构建,线上是对的"""

ARG_QUIET = "--quiet"
"""手动开关:只在异常时输出(挂 cron 用)。"""

DEPLOY_NO_REMOTE_MSG = "[部署哨兵] 取不到 origin/main(网络或 git remote 问题),本轮跳过"
"""拿不到基准不算故障,别误报。"""

DEPLOY_NO_LIVE_TPL = "[部署哨兵] ⚠ {url} 无响应 —— 站点可能挂了,或该端点尚未部署"
"""线上版本端点无响应。"""

DEPLOY_OK_TPL = "[部署哨兵] ✓ 线上 == origin/main ({sha})"
"""线上就是最新提交。"""

DEPLOY_SKIP_ONLY_TPL = ("[部署哨兵] ✓ 线上 {live} 落后 origin/main {want},"
                        "但差的提交**全带 skip 标记**(纯文档/纯数据),本来就不该构建 —— 正常")
"""差集全是 skip 标记提交 —— 不报警。"""

DEPLOY_BEHIND_TPL = (
    "[部署哨兵] ⚠ 线上不是最新提交 —— **代码推上去了但没上线**\n"
    "    origin/main : {want}\n"
    "    线上正在跑  : {live}\n"
    "    先查 Render → pnp-cms → Events 有没有 `Build blocked`\n"
    "    (最常见原因:构建分钟耗尽 + spend limit 拦住自动补买)\n"
    "    在此之前,任何「改了怎么没生效」都不必当代码 bug 查。"
)
"""真没上线的报警块(2026-07-21 事故的解药:症状六个,根因只有一个)。"""

DEPLOY_PENDING_HEAD_TPL = "    该上线却没上线的提交({n} 个):"
"""差集清单抬头。"""

DEPLOY_PENDING_ROW_TPL = "      · {row}"
"""差集清单明细行。"""

DEPLOY_PENDING_SHOW_MAX = 8
"""差集清单最多展开条数。"""

DEPLOY_PENDING_ROW_LEN = 110
"""差集清单单行截断长度(只影响打印)。"""

# =========================================================================
# 5. 跨源汇装链(build 役;2026-08-31 批F 自 sources/build 役册收编,sources 清仓)
# =========================================================================

BUILD_CHAIN_CMDS = (
    ("python", "etl/jobbank/main.py", "--only", "apprentice"),
    ("python", "etl/jobbank/main.py", "--only", "expired"),
    ("python", "etl/mart/main.py", "--only", "locations"),
    ("python", "etl/mart/main.py", "--only", "salary"),
    ("python", "etl/aip/main.py", "--only", "flag"),
    ("python", "etl/rcip/main.py", "--only", "communities"),
    ("python", "etl/fcip/main.py", "--only", "communities"),
    ("python", "etl/mart/main.py", "--only", "pilot_flag"),
    ("python", "etl/jobbank/main.py", "--only", "noc_sanity"),
    ("python", "etl/mart/main.py"),
    ("python", "etl/employers/main.py"),
)
"""build 役(非抓取源,灌库唯一角色)的跨源汇装链:清洗打标 → 评分 → mart → 榜单/统计 →
雇主池;链尾 upload 在 run_build_chain 里直调(原役册末步 `load/main.py --only upload`
的子进程自调,收编后同进程直调,语义不变)。原 sources/build/__init__.py 的逐步注释
逐字折此(2026-08-31 批F);**批J**(同日,clean/ 目录退役)把五个清洗步换成各自归户后的
域门 `--only` 点名 —— **顺序逐位未动,产物逐字节相同**,换的只是谁来跑:
  jobbank --only apprentice B1-3:官方标「不要经验/带训」+ 学徒标题 → apprentice_friendly。
                        原 clean/05e_flag_apprentice.py,批J 归户 jobbank 域
  jobbank --only expired #124 批C:死岗验尸(周节奏,7 天内跑过=秒退;判死帖 mart 剔除出表);
                        2026-08-31 批D ops 拆散归根,批H 归户 jobbank 域(件即
                        jobbank/verify_jobbank_expired.py,经本域门点名)
  mart --only locations / mart --only salary   跨源清洗(ATS/JB 同一套):地点与薪资。
                        原 clean/04c_clean_ats_locations.py / clean/04d_clean_salary.py,
                        批J 归户 mart 域(判据:跨源,不归任何单源域)
  aip --only flag        AIP 打标(2026-08-31 批H 归户 aip 域,原 clean/05c;跨役走域门)
  rcip/fcip communities E6-11:试点社区名单(读 fed-rcip crawl 缓存,改版保旧不拦役);
                        批C 溶进 pilot 域、批E 拆三域一步变两步,顺序不动仍在打标之前
  mart --only pilot_flag E6-11:城市×省 → jobs.pilot/pilotCommunity(一字段一关注点)。
                        原 clean/05f_flag_pilot.py,批J 归户 mart 域
  jobbank --only noc_sanity #47:标题↔NOC 失配护栏(泛词标题×TEER0/1×低薪 → NOC 置空转未分类)。
                        原 clean/05d_noc_sanity.py,批J 归户 jobbank 域。
                        🔴 必须排在 salary 之后:它的判据里有「低薪」,读的是那步算出的
                        salaryAnnual —— 链序即语义,挪位就是改判定
  (官网富化已拆独立 enrich 角色,2026-07-16「分开来跑」拍板:每轮 10-17 分钟拖垮 seed 时效;
  本链只消费它落好的 company_enrich.json(09 合并),不再现抓)
  mart/main             评分 → mart → 榜单(E5-02 读 mart 纯聚合)→ 地区统计(E5-04 同)。
                        2026-08-31 批H:旧 08/09/10/11 四行迁 mart 域收成一门四步,
                        门内顺序 = 原链顺序,一步失败中止(exit 非零 → 本链中止,语义不变)
  employers/main        雇主池两表(雇主板批一,2026-08-30:读 mart+LMIA+postings 纯聚合,须在 upload 前)
整链持 Job Bank 仓锁(原 run_locked 同款:锁不拆成加锁/解锁两步 —— 任一步异常时调度层
会立即中止,解锁步没机会执行;内核文件锁随进程退出自动释放)。"""

BUILD_CMD_SEP = " "
"""步骤 argv 打印拼接符。"""

BUILD_LOCK_WAIT_TPL = "LOCK Job Bank store: {path} (waiting if producer is writing)"
"""持锁前报行(生产者在写就等)。"""

BUILD_LOCK_OK = "LOCK acquired: build round sees one stable postings.json"
"""持锁成功报行。"""

BUILD_STEP_TPL = "→ {cmd}"
"""逐步报行。"""

BUILD_FAIL_TPL = "✗ build step failed ({rc}); lock will be released"
"""步骤失败报行(exit 非零中止本轮,锁随进程释放)。"""

BUILD_LOCK_DONE = "LOCK released: jobbank may publish its next parsed snapshot"
"""收口报行。"""
