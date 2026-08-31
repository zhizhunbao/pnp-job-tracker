"""
load 域唯一入口(一域一门;2026-08-30 立域,company 全溶门形)。

本域无默认链:upload 由 build 役末步点名(mart 之后 seed 之前),backup 由 backup 役
点名 —— 两个旧役册各自计时,这里只当被点名的工具面。
一律从仓库根执行:
    python etl/load/main.py --only upload   # mart → gzip 分片 POST cms
    python etl/load/main.py --only backup   # pg_dump → backups/
    python etl/load/main.py --only deploy   # origin/main SHA vs 线上 /api/version

控制台强制 UTF-8(照 news/main.py 门形):Windows 控制台默认 cp1252,吐中文直接
UnicodeEncodeError —— 挂 cron 时 deploy 哨兵的报警信息发不出来才是真事故
(2026-08-31 批D 收 check_deploy 时随行,原脚本的模块级 reconfigure 移到门上,
functions 顶层只许函数)。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")

from log.functions import err, say
from load.functions import backup_db, check_deploy, upload_mart
from load.scheme import BackupIn, DeployIn, UploadIn


def run_upload() -> None:
    """upload 工具面(进度打点注 log.functions.say)。"""
    upload_mart(UploadIn(say=say))


def run_backup() -> None:
    """backup 工具面(同上)。"""
    backup_db(BackupIn(say=say))


def run_deploy() -> None:
    """deploy 工具面(同上;不一致时步骤内 sys.exit(1),SystemExit 穿透门的 except)。"""
    check_deploy(DeployIn(say=say))


SCHEDULED = []
"""无默认链(本域步骤全由旧役册按各自节奏点名)。"""

TOOLS = {
    "upload": run_upload,
    "backup": run_backup,
    "deploy": run_deploy,
}
"""全部可 --only 点名的步:
  upload  data/mart/*.json 逐表 gzip POST 到 cms(超限表分片 + meta 提交语义)
  backup  pg_dump 生产库 → backups/,清理超龄旧份
  deploy  部署哨兵:origin/main SHA vs 线上 /api/version(一致 exit 0 / 不一致 exit 1)
"""


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
