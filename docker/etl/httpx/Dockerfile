# 方式 = httpx:抓「有固定 DOM 的结构化列表/详情页」(Job Bank、ATS careers)。
# 轻 python + HTML 解析库(bs4/lxml/pymupdf),不装浏览器。
# build/clean 角色也复用本镜像(它们只需 python + 这些库 + httpx)。
# 源码与 data/ 由 compose bind-mount 注入(working_dir=/repo),镜像不 COPY 源码。
FROM python:3.12-slim
# backup 源要 pg_dump(E7-01);E7-04 起生产库=Render PG 18,pg_dump 必须 ≥ 服务器版本 → 走 PGDG 源装 18(发行版自带 17 会拒 dump)
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(. /etc/os-release && echo $VERSION_CODENAME)-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y --no-install-recommends postgresql-client-18 \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir "httpx>=0.27" "beautifulsoup4>=4.12" "pymupdf>=1.24" "lxml>=5.0" "loguru>=0.7" "openpyxl>=3.1"  # openpyxl: build_lmia 解析 ESDC 季度 XLSX(E6-02)
CMD ["python", "etl/auto_update.py"]
