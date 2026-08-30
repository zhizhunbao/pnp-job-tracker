"""过渡壳(2026-08-30 load 域收编,正身 etl/load/functions.py 的 backup_db)。

容器里 backup 役旧进程的 steps 仍指本路径,重启前必须可执行;役册已改指
etl/load/main.py --only backup,收尾统一重启后删本壳。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _log import err, say
from load.functions import backup_db
from load.scheme import BackupIn

if __name__ == "__main__":
    try:
        backup_db(BackupIn(say=say))
    except Exception as e:  # noqa: BLE001
        err("backup_db", e)
        sys.exit(1)
