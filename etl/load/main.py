"""
load 域唯一入口(一域一门;2026-08-30 立域,company 全溶门形)。

2026-08-31 批F(Frank「sources build 最后就清掉了」):本域收编 build 役 —— 默认链 =
跨源汇装链(持 Job Bank 仓锁:清洗打标→08→09→10/11→employers→upload),役册退役;
本域 __init__ 用 METAS 挂**两役**(build:after=jobbank 2h 兜底 seed=True;backup:日更),
auto_update 按 METAS 各自计时,入口同门不同 --only。
一律从仓库根执行:
    python etl/load/main.py                 # 默认链 = build 跨源汇装(整链持锁)
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
from load.functions import backup_db, check_deploy, run_build_chain, upload_mart
from load.scheme import BackupIn, BuildChainIn, DeployIn, UploadIn


def run_build() -> None:
    """build 役默认链工具面(整链持锁;进度打点注 log.functions.say)。"""
    run_build_chain(BuildChainIn(say=say))


def run_upload() -> None:
    """upload 工具面(进度打点注 log.functions.say)。"""
    upload_mart(UploadIn(say=say))


def run_backup() -> None:
    """backup 工具面(同上)。"""
    backup_db(BackupIn(say=say))


def run_deploy() -> None:
    """deploy 工具面(同上;不一致时步骤内 sys.exit(1),SystemExit 穿透门的 except)。"""
    check_deploy(DeployIn(say=say))


SCHEDULED = [("build_chain", run_build)]
"""默认链(build 役调度真相):跨源汇装一根绳,整链持 Job Bank 仓锁;一步失败
sys.exit(rc) 中止本轮(原 run_locked 同款语义)。backup 役走 --only backup 单点。"""

TOOLS = {
    "build_chain": run_build,
    "upload": run_upload,
    "backup": run_backup,
    "deploy": run_deploy,
}
"""全部可 --only 点名的步:
  build_chain  跨源汇装链(= 默认链;单跑调试用)
  upload  data/mart/*.json 逐表 gzip POST 到 cms(超限表分片 + meta 提交语义)
  backup  pg_dump 生产库 → backups/,清理超龄旧份
  deploy  部署哨兵:origin/main SHA vs 线上 /api/version(一致 exit 0 / 不一致 exit 1)
"""


def main() -> int:
    """跑默认链(build 汇装)或 --only 点名的单步;返回进程退出码。"""
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
        picked = SCHEDULED
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
