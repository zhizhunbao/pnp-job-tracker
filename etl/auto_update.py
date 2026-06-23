"""
auto_update — 纯调度器(不含任何源特定逻辑)。

读环境变量 SOURCE → 加载 etl/sources/<SOURCE>/META → 循环跑它的 steps,
按 SCRAPE_INTERVAL(缺省取 META 的 interval)定时;META["seed"] 为真才在跑完后灌库。
任一步报错只记日志、不退出容器。

「抓什么内容、跑哪些步、多久一次」全在 etl/sources/<源>/ 里声明(见 docs/source-framework.md)。
环境变量:SOURCE(默认 jobbank)/ SCRAPE_INTERVAL / SEED_URL
"""
import importlib
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))  # 让 `import sources.*` 可用(etl/ 进 path)
import sources  # noqa: E402

SOURCE = os.environ.get("SOURCE", "jobbank")
SEED_URL = os.environ.get("SEED_URL", "http://host.docker.internal:3000/seed")


def log(msg: str) -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] [{SOURCE}] {msg}", flush=True)


def run_once(meta: dict) -> bool:
    for step in meta["steps"]:
        log(f"→ {' '.join(step)}")
        if subprocess.run(step).returncode != 0:
            log("✗ 步骤失败,本轮中止,等下一轮重试")
            return False
    if meta.get("seed"):  # 仅 build 角色:增量 seed(mart 全量累积,不会误关旧岗)
        try:
            r = httpx.get(SEED_URL, timeout=600)
            log(f"✓ seed {r.status_code}: {r.text[:200]}")
        except Exception as e:  # noqa: BLE001
            log(f"✗ seed 失败({type(e).__name__}: {e})—— mart 已落盘,cms 起来后下轮补")
            return False
    return True


def main() -> None:
    if SOURCE not in sources.NAMES:
        log(f"✗ 未知 SOURCE,可选: {', '.join(sources.NAMES)};退出")
        raise SystemExit(1)
    meta = importlib.import_module(f"sources.{SOURCE}").META
    interval = int(os.environ.get("SCRAPE_INTERVAL", meta.get("interval", 7200)))
    log(f"启动:每 {interval}s 一轮" + (f",seed → {SEED_URL}" if meta.get("seed") else ""))
    while True:
        log("===== 开始一轮 =====")
        ok = run_once(meta)
        log(f"===== {'完成' if ok else '未完整完成'},{interval}s 后再来 =====")
        time.sleep(interval)


if __name__ == "__main__":
    main()
