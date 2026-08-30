"""backup 源(E7-01):每日 pg_dump 生产库(Supabase)→ backups/,保留 14 天。

R3 修订:无 VPS cron,家里构建机=运维盒 —— 与其它源同用 auto_update 调度。
需要 env:BACKUP_DATABASE_URI(compose 从 docker/.env 注入 Supabase 连接串);未设=跳过。
容器镜像需带 pg_dump 客户端(httpx 镜像基于 python—compose 里此源复用 postgres 镜像或装 postgresql-client)。
"""
META = {
    "method": "httpx",
    "interval": 86400,        # 日更
    "seed": False,
    "steps": [
        ["python", "etl/load/main.py", "--only", "backup"],   # 2026-08-30 收编 load 域(旧壳过渡,收尾重启后删)
    ],
}
