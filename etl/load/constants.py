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
"""备份库连接串环境键(compose 从 docker/.env 注入)。"""

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
