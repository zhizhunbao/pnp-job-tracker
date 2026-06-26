"""
auto_update — 纯调度器(不含任何源特定逻辑)。

读环境变量 SOURCE → 加载 etl/sources/<SOURCE>/META → 循环跑它的 steps,
按 SCRAPE_INTERVAL(缺省取 META 的 interval)定时;META["seed"] 为真才在跑完后灌库。
任一步报错只记日志、不退出容器。

日志:用 loguru 统一格式「时间 | 级别 | 源 | 消息」。**子进程(各 step 脚本)的 stdout 逐行截获后
也套同一前缀**,所以容器日志每一行格式一致(脚本本身仍是普通 print,不依赖 loguru)。

「抓什么内容、跑哪些步、多久一次」全在 etl/sources/<源>/ 里声明(见 docs/source-framework.md)。
环境变量:SOURCE(默认 jobbank)/ SCRAPE_INTERVAL / SEED_URL
"""
import importlib
import os
import subprocess
import sys
import time
from pathlib import Path

import httpx
from loguru import logger

sys.path.insert(0, str(Path(__file__).resolve().parent))  # 让 `import sources.*` 可用(etl/ 进 path)
import sources  # noqa: E402

SOURCE = os.environ.get("SOURCE", "jobbank")
SEED_URL = os.environ.get("SEED_URL", "http://host.docker.internal:3000/seed")

# 统一格式:时间 | 级别 | 源 | 消息(容器日志无 TTY,不上色)
logger.remove()
logger.add(sys.stderr, colorize=False,
           format="{time:YYYY-MM-DD HH:mm:ss} | {level: <5} | {extra[source]} | {message}")
log = logger.bind(source=SOURCE)


def run_step(step: list[str]) -> bool:
    """跑一个 step,逐行截获其 stdout/stderr → 套统一 loguru 前缀打印。"""
    log.info("→ " + " ".join(step))
    env = {**os.environ, "PYTHONUNBUFFERED": "1", "PYTHONIOENCODING": "utf-8"}  # 子进程实时逐行 + utf-8 输出
    proc = subprocess.Popen(step, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, encoding="utf-8", errors="replace", bufsize=1, env=env)
    for line in proc.stdout:                        # 子进程每行 → 统一前缀(去掉行尾换行)
        line = line.rstrip("\n")
        if line.strip():
            log.log("ERROR" if line.lstrip().startswith(("✗", "!")) else "INFO", line)
    return proc.wait() == 0


def run_once(meta: dict) -> bool:
    for step in meta["steps"]:
        if not run_step(step):
            log.error("✗ 步骤失败,本轮中止,等下一轮重试")
            return False
    if meta.get("seed"):  # 仅 build 角色:增量 seed(mart 全量累积,不会误关旧岗)
        try:
            r = httpx.get(SEED_URL, timeout=600)
            log.info(f"✓ seed {r.status_code}: {r.text[:200]}")
        except Exception as e:  # noqa: BLE001
            log.error(f"✗ seed 失败({type(e).__name__}: {e})—— mart 已落盘,cms 起来后下轮补")
            return False
    return True


def main() -> None:
    if SOURCE not in sources.NAMES:
        log.error(f"✗ 未知 SOURCE,可选: {', '.join(sources.NAMES)};退出")
        raise SystemExit(1)
    meta = importlib.import_module(f"sources.{SOURCE}").META
    interval = int(os.environ.get("SCRAPE_INTERVAL", meta.get("interval", 7200)))
    log.info(f"启动:每 {interval}s 一轮" + (f",seed → {SEED_URL}" if meta.get("seed") else ""))
    while True:
        log.info("===== 开始一轮 =====")
        ok = run_once(meta)
        log.info(f"===== {'完成' if ok else '未完整完成'},{interval}s 后再来 =====")
        time.sleep(interval)


if __name__ == "__main__":
    main()
