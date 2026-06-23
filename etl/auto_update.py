"""
auto_update — 容器内的源更新编排器。一个容器跑一个 SOURCE,循环执行该源的步骤,
每轮 sleep SCRAPE_INTERVAL 再来。任一步报错只记日志,不退出容器。

多源设计:抓取按源拆(各写各的 raw),但「跨源清洗 + 评分 + mart + seed」是全局的、
只能跑一份 → 单独一个 SOURCE=build 角色负责。各抓取容器只刷新 raw,build 容器定期
把全部源重建进 mart 并灌库(幂等、最终一致,谁都不抢 mart/seed)。

  SOURCE=jobbank  抓 Job Bank(05/05b)→ 刷 raw/jobbank/
  SOURCE=ats      抓 ATS 第一方(04/04b)→ 刷 ATS raw/processed
  SOURCE=build    跨源清洗(04c/04d/05c)→ 评分(08)→ mart(09)→ GET /seed

加新源:在 SOURCES 里登记其步骤,再在 docker-compose.yml 复制一个 service 改 SOURCE。

环境变量:
  SOURCE            跑哪个源(默认 jobbank)
  SCRAPE_INTERVAL   两轮间隔秒(默认 7200 = 2h)
  SINCE_DAYS        jobbank 增量天数(默认 3)
  SEED_URL          build 角色灌库地址(默认 http://host.docker.internal:3000/seed)
"""
import os
import subprocess
import time
from datetime import datetime

import httpx

SOURCE = os.environ.get("SOURCE", "jobbank")
INTERVAL = int(os.environ.get("SCRAPE_INTERVAL", "7200"))
SINCE_DAYS = os.environ.get("SINCE_DAYS", "3")
SEED_URL = os.environ.get("SEED_URL", "http://host.docker.internal:3000/seed")

# 每个源 = 一串有序步骤(cwd=仓库根,compose working_dir=/repo)。
# 抓取源只刷 raw;build 做全局清洗+评分+mart(读全部源)。
SOURCES = {
    "jobbank": [
        ["python", "etl/05_scrape_jobbank.py", "--all-occupations", "--prov", "ALL", "--since-days", SINCE_DAYS],
        ["python", "etl/05b_scrape_jobbank_details.py"],
    ],
    "ats": [
        ["python", "etl/04_scrape_ats_jobs.py"],
        ["python", "etl/clean/04b_extract_ats_salary.py"],
    ],
    "build": [
        ["python", "etl/clean/04c_clean_ats_locations.py"],
        ["python", "etl/clean/04d_clean_salary.py"],
        ["python", "etl/clean/05c_flag_aip.py"],
        ["python", "etl/08_score.py"],
        ["python", "etl/09_build_mart.py"],
    ],
}


def log(msg: str) -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] [{SOURCE}] {msg}", flush=True)


def run_once() -> bool:
    for step in SOURCES[SOURCE]:
        log(f"→ {' '.join(step)}")
        if subprocess.run(step).returncode != 0:
            log("✗ 步骤失败,本轮中止,等下一轮重试")
            return False
    # 只有 build 角色灌库(增量,不带 reset → mart 全量累积,seenIds 含全部岗,不会误关旧岗)
    if SOURCE == "build":
        try:
            resp = httpx.get(SEED_URL, timeout=600)
            log(f"✓ seed {resp.status_code}: {resp.text[:200]}")
        except Exception as e:  # noqa: BLE001
            log(f"✗ seed 失败({type(e).__name__}: {e})—— mart 已落盘,cms 起来后下轮补")
            return False
    return True


def main() -> None:
    if SOURCE not in SOURCES:
        log(f"✗ 未知 SOURCE,可选: {', '.join(SOURCES)};退出")
        raise SystemExit(1)
    log(f"启动:每 {INTERVAL}s 一轮" + (f",seed → {SEED_URL}" if SOURCE == "build" else ""))
    while True:
        log("===== 开始一轮 =====")
        ok = run_once()
        log(f"===== {'完成' if ok else '未完整完成'},{INTERVAL}s 后再来 =====")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
