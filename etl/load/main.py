"""
load 域唯一入口(一域一门;2026-08-30 立域,company 全溶门形)。

本域无默认链:upload 由 build 役末步点名(mart 之后 seed 之前),backup 由 backup 役
点名 —— 两个旧役册各自计时,这里只当被点名的工具面。
一律从仓库根执行:
    python etl/load/main.py --only upload   # mart → gzip 分片 POST cms
    python etl/load/main.py --only backup   # pg_dump → backups/
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from load.functions import backup_db, upload_mart
from load.scheme import BackupIn, UploadIn


def run_upload() -> None:
    """upload 工具面(进度打点注 log.functions.say)。"""
    upload_mart(UploadIn(say=say))


def run_backup() -> None:
    """backup 工具面(同上)。"""
    backup_db(BackupIn(say=say))


SCHEDULED = []
"""无默认链(本域步骤全由旧役册按各自节奏点名)。"""

TOOLS = {
    "upload": run_upload,
    "backup": run_backup,
}
"""全部可 --only 点名的步。"""


def main() -> int:
    """跑 --only 点名的单步;无参 = 无默认链,提示用法。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        picked = []
        for k, f in TOOLS.items():
            if args[1] in k:
                picked.append((k, f))
        if len(picked) == 0:
            say(f"✗ --only {args[1]} 没命中(可选:{'/'.join(TOOLS)})")
            return 1
    else:
        say(f"本域无默认链,用 --only 点名(可选:{'/'.join(TOOLS)})")
        return 1
    for name, fn in picked:
        say(f"→ {name}")
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            err(name, e)
            return 1
    say(f"✓ 本域 {len(picked)} 步全过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
