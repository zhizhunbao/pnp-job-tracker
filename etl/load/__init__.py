"""
load 域:灌库层(宪法分层 raw → clean → mart → load 的 load;2026-08-30 Frank 拍板立域)。

管「数据怎么进出我们的库」:跨源汇装链(build 役,2026-08-31 批F 自 sources/build 收编,
Frank「sources build 最后就清掉了」)、seed/alerts 触发(auto_update 进程内直调)、
mart 分片上传(汇装链尾步)、pg_dump 备份(backup 役)。将来经 Payload 直接操作库的
REST 客户端也归这 —— 名字不叫 payload:按会变的后端命名违切界律,且备份走 pg_dump
不经 Payload。红线:批量数据仍走 raw→mart→seed,直接 CRUD 只给运维/修数/懒查询场景。

METAS = 本域挂**两役**(2026-08-31 批F 首例:一域多役,auto_update 逐条注册,
入口同门不同 --only)—— build 与 backup 节奏不同(2h 兜底 vs 日更)且都以本域为家,
比造假域或留役册干净:
  build   跨源汇装 + 灌库:after=jobbank(反应式,jobbank 每轮抓完触发)+ 2h 兜底;
          seed=True(链跑完 GET /seed);interval 写现役生效值(原役册 7200 被 compose
          SCRAPE_INTERVAL=3600 压过,单轨后 META 即真相)
  backup  pg_dump 生产库 → backups/(E7-01;日更,保留 N 天)
两役 ping=True:各自角色的唯一单元(旧役册单元 ping 恒 True 的沿袭)。
"""
METAS = [
    {
        "name": "build",
        "role": "build",
        "method": "httpx",
        "interval": 3600,
        "seed": True,
        "after": ["jobbank"],
        "ping": True,
        "only": "",
    },
    {
        "name": "backup",
        "role": "backup",
        "method": "httpx",
        "interval": 86400,
        "seed": False,
        "ping": True,
        "only": "backup",
    },
]
