#!/bin/bash
# R3 worker supervisor:一容器四进程(jobbank/pnp/ee/build 各跑一个 auto_update 循环)。
# 不设 SCRAPE_INTERVAL → 各源用自己 META 的 interval(2h/周/月/2h),与 compose 多容器行为一致。
# 任一进程退出 → 整容器退出,交给 Render 自动重启(简单可靠,进程级自愈不自己造)。
# 注意:`wait -n` 是 bash 特性,shebang 必须 bash(debian slim 自带)。
set -e
export PYTHONUNBUFFERED=1
export SINCE_DAYS="${SINCE_DAYS:-3}"

for S in jobbank pnp ee build; do
  SOURCE="$S" python etl/auto_update.py &
done

wait -n   # 任一子进程结束(正常不会)→ 退出触发容器重启
exit 1
