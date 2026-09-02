# 方式 = crawl:爬「有墙/JS 渲染」的政府页(联邦 EE 类别 canada.ca/Akamai、PNP 政策原文等)。
# python + Playwright(chromium)。**全有头**(2026-09-01 Frank:无头基本被封,BROWSER_HEADLESS 开关废除):
#   入口恒起 Xvfb :99 虚拟显示 → 有头 chromium,验证框可人点。
#   (原两挡:软墙无头轻/硬墙有头;无头曾对 canada.ca/Akamai+stealth 直通,但整体封杀率高,统一有头。)
# 持久 profile = /repo/etl/crawl/.browser-profile(bind-mount;cf_clearance 等跨轮复用,解一次后续免验)。
# 真过不去的挑战:browser_fetch 轮询等 120s 超时跳过、保留上次 json(不阻塞、不崩)。
# 入口不用 xvfb-run(它会吞日志);改「后台起 Xvfb + 设 DISPLAY,再 exec python」,日志正常。
# 源码与 data/ 由 compose bind-mount 注入(working_dir=/repo),镜像不 COPY 源码。
FROM python:3.12-slim
# pydantic 2026-08-31 补装:08-30 全域采用 pydantic 边界校验时只加了通用镜像(etl/Dockerfile),
# 本镜像漏配 → crawl 容器每轮 import 即折(ModuleNotFoundError 实撞,日志扫查逮到)
RUN pip install --no-cache-dir playwright "httpx>=0.27" "beautifulsoup4>=4.12" "lxml>=5.0" "loguru>=0.7" "pydantic>=2.7" \
 && playwright install --with-deps chromium \
 && apt-get update && apt-get install -y --no-install-recommends xvfb && rm -rf /var/lib/apt/lists/*
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x1024x24 -nolisten tcp >/dev/null 2>&1 & export DISPLAY=:99; sleep 1; exec python etl/sched/main.py"]
