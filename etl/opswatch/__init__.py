"""
opswatch 域:运维页的探活与报警节拍(2026-11-08 立域;Frank「一气呵成弄完运维」)。

回答的问题:「现在各 AI 通道通不通,有没有该报警的事」。线上网站到不了局域网,所以局域网 Ollama 由本域探活,
再把结果报给站点 /api/ops/tick;Claude 与朋友网关由站点自己探,判定规则与发邮件都在站点。

META = 域即役的调度声明:role=挂哪个角色容器(SOURCE 环境变量),interval=本域一轮的间隔秒;
入口固定 etl/opswatch/main.py。
⚠ 本文件保持零 import:build 容器每轮的保鲜闸会逐个 exec 各域 __init__。

@author Frank
@time 2026-11-08 23:59:00
"""

META = {
    "role": "opswatch",
    "method": "httpx",       # 对应 etl/sched/Dockerfile 通用轻镜像
    "interval": 300,         # 五分钟一轮,与 cms lib/ops/watch 的 TICK_S 同值
    "seed": False,           # 不产 mart,不灌库
    "ping": True,            # 本角色唯一单元
}
