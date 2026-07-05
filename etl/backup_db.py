"""每日库备份(E7-01,R3 修订:无 VPS,家里构建机=运维盒)。

pg_dump 生产库(Supabase)→ backups/YYYY-MM-DD.sql.gz,保留 14 天。
在 docker 网络里跑(backup 源,postgres 容器有 pg_dump 客户端);本机手动跑:
  docker exec pnp-postgres-1 pg_dump "<DATABASE_URI>" | gzip > backups/$(date +%F).sql.gz
DATABASE_URI 未设 → 跳过(与 upload_mart 同语义:本地/无密钥模式不动作)。
恢复演练:gunzip -c backups/<日期>.sql.gz | docker exec -i pnp-postgres-1 psql -U pnp -d <临时库>
"""
from __future__ import annotations

import gzip
import os
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")

BACKUPS = _paths.ROOT / "backups"
KEEP_DAYS = int(os.environ.get("BACKUP_KEEP_DAYS", "14"))
DBURI = os.environ.get("BACKUP_DATABASE_URI") or os.environ.get("DATABASE_URI", "")


def main() -> None:
    if not DBURI:
        print("BACKUP_DATABASE_URI/DATABASE_URI 未设 → 跳过备份(本地模式)")
        return
    BACKUPS.mkdir(exist_ok=True)
    out = BACKUPS / f"{date.today().isoformat()}.sql.gz"
    print(f"OUT: {out}")
    proc = subprocess.run(["pg_dump", "--no-owner", "--no-privileges", DBURI], capture_output=True)
    if proc.returncode != 0:
        print(f"! pg_dump 失败: {proc.stderr.decode(errors='replace')[:300]}")
        raise SystemExit(1)
    out.write_bytes(gzip.compress(proc.stdout))
    print(f"备份完成: {out.name} ({out.stat().st_size // 1024} KB)")
    cutoff = time.time() - KEEP_DAYS * 86400
    removed = 0
    for f in BACKUPS.glob("*.sql.gz"):
        if f.stat().st_mtime < cutoff:
            f.unlink()
            removed += 1
    print(f"清理超过 {KEEP_DAYS} 天的旧备份: {removed} 个")


if __name__ == "__main__":
    main()
