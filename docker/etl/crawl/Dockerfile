# 方式 = crawl:爬「自由文本/政府页」(PNP 省级 OINP/SINP/AAIP、政策原文)。
# 需要 headless 浏览器过 JS/风控 → python + Playwright(chromium)。镜像重,只给真需要的源用。
# httpx 优先、命中风控才用浏览器;过不了的验证码记日志跳过(见 docs/source-framework.md D3)。
# 源码与 data/ 由 compose bind-mount 注入(working_dir=/repo),镜像不 COPY 源码。
FROM python:3.12-slim
RUN pip install --no-cache-dir playwright "httpx>=0.27" "beautifulsoup4>=4.12" "lxml>=5.0" "loguru>=0.7" \
 && playwright install --with-deps chromium
CMD ["python", "etl/auto_update.py"]
