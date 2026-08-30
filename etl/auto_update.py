"""
auto_update — 纯调度器(不含任何源特定逻辑)。

2026-08-29 批2(域即役,一域一门)升级为**混合多单元**:
读环境变量 SOURCE(=角色名)→ 本容器要跑的单元 =
  ① 旧役册 etl/sources/<SOURCE>/META(管线角色 jobbank/ats/build/backup 仍住这);
  ② 所有声明 META["role"] == SOURCE 的域(etl/<域>/__init__.py,入口一律 etl/<域>/main.py)。
每个单元各有自己的 interval/seed/after,循环里独立计时,互不牵连。
任一步报错只记日志、不退出容器;一单元失败不影响别的单元。

日志:loguru 统一格式「时间 | 级别 | 源 | 消息」;子进程 stdout 逐行截获套同一前缀。
环境变量:SOURCE(默认 jobbank)/ SCRAPE_INTERVAL(只覆盖旧役册单元)/ SEED_URL
"""
import importlib
import importlib.util
import os
import subprocess
import sys
import time
from pathlib import Path

import httpx
from loguru import logger

sys.path.insert(0, str(Path(__file__).resolve().parent))  # 让 `import sources.*` 可用(etl/ 进 path)
import sources

SOURCE = os.environ.get("SOURCE", "jobbank")
SEED_URL = os.environ.get("SEED_URL", "http://host.docker.internal:3000/api/seed")
SEED_TOKEN = os.environ.get("SEED_TOKEN", "")  # 生产必设(seed 端点鉴权,E2-02);本地 dev 可空
ROUNDS = Path(__file__).resolve().parent.parent / "data" / ".rounds"  # 各单元「本轮完成」标记(mtime)
POLL = 30  # 轮询间隔(秒):消费者盯上游标记 + 多单元到点检查共用
FAIL_RETRY = 3600  # 失败轮短重试(2026-08-30 立):周更役炸一下不再赔一周 —— 起因:Windows 卷
                   # 间歇 Errno 22 + 「失败照睡满周期」把 16/64 源拖成 15-25 天陈账;成功才睡满 interval
ETL_DIR = Path(__file__).resolve().parent

# 这些一级目录不是「域」,发现单元时跳过(sources=旧役册;clean=横切清洗层;其余非域)
NOT_DOMAIN = {"sources", "clean", "__pycache__"}


def mark_done(name: str) -> None:
    """单元跑完一轮 → 更新自己的标记(下游靠它的 mtime 判断「有新轮次」,如 build after=jobbank)。"""
    ROUNDS.mkdir(parents=True, exist_ok=True)
    (ROUNDS / f"{name}.done").write_text(f"{time.time():.0f}")


def newest_upstream(after: list[str]) -> float:
    """上游各单元标记里最新的 mtime(都没有则 0)。"""
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


def load_units() -> list[dict]:
    """收集本角色的全部单元:旧役册(若有)+ 声明 role==SOURCE 的域。

    域的 META 只做声明(role/method/interval/seed),入口固定 etl/<域>/main.py ——
    「跑哪些步」是域自己的事(main.py 里),调度器不再关心步骤清单。
    """
    units: list[dict] = []
    if SOURCE in sources.NAMES:
        meta = importlib.import_module(f"sources.{SOURCE}").META
        units.append({
            "name": SOURCE,
            "steps": meta["steps"],
            # SCRAPE_INTERVAL 只覆盖旧役册单元(compose 里 jobbank 等沿用此约定)
            "interval": int(os.environ.get("SCRAPE_INTERVAL", meta.get("interval", 7200))),
            "seed": meta.get("seed", False),
            "after": meta.get("after"),
            "ping": True,  # 旧役册单元 = 角色唯一单元,沿袭旧行为
        })
    for ini in sorted(ETL_DIR.glob("*/__init__.py")):
        dom = ini.parent.name
        if dom in NOT_DOMAIN or dom.startswith("_"):
            continue
        spec = importlib.util.spec_from_file_location(f"_dom_{dom}", ini)
        mod = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(mod)
        except Exception as e:  # noqa: BLE001  # 某域 __init__ 坏了只丢该域,不拖垮容器
            log.error(f"✗ 读域 {dom} 的 META 失败({type(e).__name__}: {e}),跳过该域")
            continue
        meta = getattr(mod, "META", None)
        if isinstance(meta, dict) and meta.get("role") == SOURCE:
            units.append({
                "name": dom,
                "steps": [["python", f"etl/{dom}/main.py"]],
                "interval": int(meta.get("interval", 7200)),
                "seed": meta.get("seed", False),
                "after": meta.get("after"),
                "ping": bool(meta.get("ping", False)),
            })
    return units


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
    """跑一个单元的一轮:顺序执行 steps,一步失败即中止本轮;seed=True 才在成功后灌库。"""
    for step in meta["steps"]:
        if not run_step(step):
            log.error("✗ 步骤失败,本轮中止,等下一轮重试")
            return False
    if meta.get("seed"):  # 仅 build 角色:增量 seed(mart 全量累积,不会误关旧岗)
        try:
            # 批量化后一轮通常 <1 分钟,但生产偶发慢轮(2026-08-14 连续 4 轮超 180s,600s 内能完):
            # 超时设的是「放弃线」不是「期望值」,卡太紧=白跑一轮再重灌,放 600s
            r = httpx.get(SEED_URL, timeout=600,
                          headers={"x-seed-token": SEED_TOKEN} if SEED_TOKEN else None)
            # 成功 = 2xx 且响应体 ok:true,别的一律算失败 —— 老版把任何响应都记「✓ seed 502」,
            # 还带着失败状态去触发 alerts/心跳(E5-03 的自动提醒依赖这个判定,必须真实)
            try:
                ok = r.is_success and r.json().get("ok") is True
            except Exception:  # noqa: BLE001  # 502/500 返回的是 HTML,json() 会炸
                ok = False
            if not ok:
                log.error(f"✗ seed {r.status_code}: {r.text[:200]} —— mart 已落盘,下轮补")
                return False
            log.info(f"✓ seed {r.status_code}: {r.text[:200]}")
        except Exception as e:  # noqa: BLE001
            log.error(f"✗ seed 失败({type(e).__name__}: {e})—— mart 已落盘,cms 起来后下轮补")
            return False
        # 邮件提醒(E5-03):seed 成功后触发匹配版 alerts(同一 token 鉴权;失败不影响本轮,下轮补)
        try:
            # seed 正门 2026-08-29 迁 /api/seed(旧 /seed 双壳过渡);两种尾巴都认,反推出站点根
            if SEED_URL.endswith("/api/seed"):
                alerts_url = SEED_URL[: -len("/api/seed")] + "/api/alerts/run"
            else:
                alerts_url = SEED_URL.rsplit("/seed", 1)[0] + "/api/alerts/run"
            r = httpx.get(alerts_url, timeout=300,
                          headers={"x-seed-token": SEED_TOKEN} if SEED_TOKEN else None)
            if r.is_success:
                log.info(f"✓ alerts {r.status_code}: {r.text[:200]}")
            else:
                log.error(f"✗ alerts {r.status_code}: {r.text[:200]} —— 不影响本轮")
        except Exception as e:  # noqa: BLE001
            log.error(f"✗ alerts 失败({type(e).__name__}: {e})—— 不影响本轮")
    # 监控心跳(E7-01):本轮全部成功且本单元持 ping 权 → ping healthchecks.io(env 缺省不 ping)。
    # 批2 拆多单元后 ping 权收紧:每角色只授一只(META["ping"]=True),防「兄弟单元的 ping
    # 遮住本单元失败」—— pnp 角色授给 ops 哨兵(freshness 绿 = 数据真新鲜,B3-1 语义保真)。
    ping = os.environ.get(f"HEALTHCHECK_PING_{SOURCE.upper()}", "") if meta.get("ping") else ""
    if ping:
        try:
            httpx.get(ping, timeout=10)
            log.info("✓ healthcheck ping")
        except Exception as e:  # noqa: BLE001
            log.error(f"✗ healthcheck ping 失败({type(e).__name__})")
    return True


def main() -> None:
    units = load_units()
    if not units:
        log.error(f"✗ 角色 {SOURCE} 没有任何单元(旧役册与域 META 都没命中);"
                  f"旧役册可选: {', '.join(sources.NAMES)};退出")
        raise SystemExit(1)
    for u in units:
        u["next"] = 0.0  # 0 = 启动即到点(与旧行为一致:容器一起来先跑一轮)
        u["consumed"] = 0.0
        mode = f"消费者(上游 {u['after']},兜底 {u['interval']}s)" if u.get("after") else f"每 {u['interval']}s"
        log.info(f"单元 {u['name']}:{mode}" + (f",seed → {SEED_URL}" if u.get("seed") else ""))
    while True:
        for u in units:
            now = time.time()
            if u.get("after"):
                up = newest_upstream(u["after"])
                due = up > u["consumed"] or now >= u["next"]
                if due:
                    u["consumed"] = up
            else:
                due = now >= u["next"]
            if not due:
                continue
            log.info(f"===== {u['name']}:开始一轮 =====")
            ok = run_once(u)
            mark_done(u["name"])
            wait = u["interval"] if ok else min(FAIL_RETRY, u["interval"])
            u["next"] = time.time() + wait
            log.info(f"===== {u['name']}:{'完成' if ok else f'未完整完成,{wait}s 后重试'} =====")
        time.sleep(POLL)


if __name__ == "__main__":
    main()
