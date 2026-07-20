"""手动跑一轮 ETL(#119 简化拍板,Frank:「管理台不赚钱先放,给我脚本直接执行能看进度」)。

用法:
    python etl/run_now.py                # 默认全链:jobbank → pnp → ee → news → ircc → build(build 含灌库)
    python etl/run_now.py jobbank        # 只跑指定役;可多个按序:python etl/run_now.py jobbank build

步骤与 docker 役同一套脚本(sources/<役>/META 单一来源),所有进度实时打印;
与后台 docker 轮并行跑也安全(posting_id 去重、同日目录幂等、seed 增量对账)。
build 的灌库步自动从 cms/.env 借 SEED_TOKEN,默认灌生产(SEED_URL 可用环境变量覆盖)。
"""
import importlib
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "etl"))

DEFAULT = ["jobbank", "pnp", "ee", "news", "ircc", "build"]


def load_env() -> None:
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    envf = ROOT / "cms" / ".env"
    if envf.exists() and "SEED_TOKEN" not in os.environ:
        for ln in envf.read_text(encoding="utf-8").splitlines():
            if ln.startswith("SEED_TOKEN="):
                os.environ["SEED_TOKEN"] = ln.split("=", 1)[1].strip()
    os.environ.setdefault("SEED_URL", "https://pnp-cms.onrender.com/seed")


def main() -> None:
    if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
        sys.stdout.reconfigure(encoding="utf-8")
    roles = sys.argv[1:] or DEFAULT
    load_env()
    t0 = time.time()
    for role in roles:
        try:
            meta = importlib.import_module(f"sources.{role}").META
        except ModuleNotFoundError:
            print(f"✗ 未知役 {role}(可选:jobbank/pnp/ee/news/ircc/build/backup)", flush=True)
            continue
        print(f"\n===== {role}({len(meta['steps'])} 步)=====", flush=True)
        for step in meta["steps"]:
            print("→", " ".join(step), flush=True)
            rc = subprocess.run(step, cwd=ROOT).returncode
            if rc != 0:
                print(f"✗ {role} 步骤失败 rc={rc} —— 本役中止,继续下一役", flush=True)
                break
        else:
            print(f"✓ {role} 完成", flush=True)
    print(f"\n===== 全部结束,用时 {time.time() - t0:.0f}s =====", flush=True)


if __name__ == "__main__":
    main()
