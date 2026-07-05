# 方式 = httpx:抓「有固定 DOM 的结构化列表/详情页」(Job Bank、ATS careers)。
# 轻 python + HTML 解析库(bs4/lxml/pymupdf),不装浏览器。
# build/clean 角色也复用本镜像(它们只需 python + 这些库 + httpx)。
# 源码与 data/ 由 compose bind-mount 注入(working_dir=/repo),镜像不 COPY 源码。
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*  # backup 源要 pg_dump(E7-01)
RUN pip install --no-cache-dir "httpx>=0.27" "beautifulsoup4>=4.12" "pymupdf>=1.24" "lxml>=5.0" "loguru>=0.7"
CMD ["python", "etl/auto_update.py"]
