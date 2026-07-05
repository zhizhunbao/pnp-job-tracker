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
SEED_TOKEN = os.environ.get("SEED_TOKEN", "")  # 生产必设(seed 端点鉴权,E2-02);本地 dev 可空
ROUNDS = Path(__file__).resolve().parent.parent / "data" / ".rounds"  # 各源「本轮完成」标记(mtime)
POLL = 30  # 消费者(如 build)轮询上游标记的间隔(秒)


def mark_done() -> None:
    """本源跑完一轮 → 更新自己的标记(下游靠它的 mtime 判断「有新轮次」)。"""
    ROUNDS.mkdir(parents=True, exist_ok=True)
    (ROUNDS / f"{SOURCE}.done").write_text(f"{time.time():.0f}")


def newest_upstream(after: list[str]) -> float:
    """上游各源标记里最新的 mtime(都没有则 0)。"""
    t = 0.0
    for up in after:
        f = ROUNDS / f"{up}.done"
        if f.exists():
            t = max(t, f.stat().st_mtime)
    return t

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
            r = httpx.get(SEED_URL, timeout=600,
                          headers={"x-seed-token": SEED_TOKEN} if SEED_TOKEN else None)
            log.info(f"✓ seed {r.status_code}: {r.text[:200]}")
        except Exception as e:  # noqa: BLE001
            log.error(f"✗ seed 失败({type(e).__name__}: {e})—— mart 已落盘,cms 起来后下轮补")
            return False
        # 邮件提醒(E5-03):seed 成功后触发匹配版 alerts(同一 token 鉴权;失败不影响本轮,下轮补)
        try:
            alerts_url = SEED_URL.rsplit("/seed", 1)[0] + "/api/alerts/run"
            r = httpx.get(alerts_url, timeout=300,
                          headers={"x-seed-token": SEED_TOKEN} if SEED_TOKEN else None)
            log.info(f"✓ alerts {r.status_code}: {r.text[:200]}")
        except Exception as e:  # noqa: BLE001
            log.error(f"✗ alerts 失败({type(e).__name__}: {e})—— 不影响本轮")
    # 监控心跳(E7-01):本轮全部成功 → ping healthchecks.io(env 缺省=本地开发不 ping)
    ping = os.environ.get(f"HEALTHCHECK_PING_{SOURCE.upper()}", "")
    if ping:
        try:
            httpx.get(ping, timeout=10)
            log.info("✓ healthcheck ping")
        except Exception as e:  # noqa: BLE001
            log.error(f"✗ healthcheck ping 失败({type(e).__name__})")
    return True


def main() -> None:
    if SOURCE not in sources.NAMES:
        log.error(f"✗ 未知 SOURCE,可选: {', '.join(sources.NAMES)};退出")
        raise SystemExit(1)
    meta = importlib.import_module(f"sources.{SOURCE}").META
    interval = int(os.environ.get("SCRAPE_INTERVAL", meta.get("interval", 7200)))
    after = meta.get("after")  # 有 → 消费者模式:等这些上游源跑完才触发(而非独立计时)
    if after:
        log.info(f"消费者模式:上游 {after} 每轮完成后触发(兜底每 {interval}s 至少一次)"
                 + (f",seed → {SEED_URL}" if meta.get("seed") else ""))
    else:
        log.info(f"生产者模式:每 {interval}s 一轮" + (f",seed → {SEED_URL}" if meta.get("seed") else ""))
    while True:
        log.info("===== 开始一轮 =====")
        ok = run_once(meta)
        mark_done()
        log.info(f"===== {'完成' if ok else '未完整完成'} =====")
        if after:  # 等上游出现「比刚消费的更新」的轮次,或兜底 interval 到
            consumed = newest_upstream(after)
            waited = 0
            while newest_upstream(after) <= consumed and waited < interval:
                time.sleep(POLL)
                waited += POLL
            log.info("检测到上游新轮次 → 触发" if waited < interval else f"兜底 {interval}s 到 → 触发")
        else:
            time.sleep(interval)


if __name__ == "__main__":
    main()
