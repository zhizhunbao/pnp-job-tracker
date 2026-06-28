# 方式 = crawl:爬「有墙/JS 渲染」的政府页(联邦 EE 类别 canada.ca/Akamai、PNP 政策原文等)。
# python + Playwright(chromium)。两挡,按墙的硬度选:
#   · 软墙(httpx 403 但真浏览器能过,如 canada.ca):BROWSER_HEADLESS=1 → **无头**,轻、无需显示器。
#   · 硬墙(必须有头+人点验证码):不设 BROWSER_HEADLESS → 入口脚本起 Xvfb 虚拟显示 → **有头**。
# 持久 profile = /repo/etl/crawl/.browser-profile(bind-mount;cf_clearance 等跨轮复用,解一次后续免验)。
# 真过不去的挑战:browser_fetch 轮询等 120s 超时跳过、保留上次 json(不阻塞、不崩)。
# 入口不用 xvfb-run(它会吞日志);改「需有头才后台起 Xvfb + 设 DISPLAY,再 exec python」,日志正常。
# 源码与 data/ 由 compose bind-mount 注入(working_dir=/repo),镜像不 COPY 源码。
FROM python:3.12-slim
RUN pip install --no-cache-dir playwright "httpx>=0.27" "beautifulsoup4>=4.12" "lxml>=5.0" "loguru>=0.7" \
 && playwright install --with-deps chromium \
 && apt-get update && apt-get install -y --no-install-recommends xvfb && rm -rf /var/lib/apt/lists/*
CMD ["sh", "-c", "if [ \"$BROWSER_HEADLESS\" != \"1\" ]; then Xvfb :99 -screen 0 1280x1024x24 -nolisten tcp >/dev/null 2>&1 & export DISPLAY=:99; sleep 1; fi; exec python etl/auto_update.py"]
