# ETL 日更编排器镜像(httpx 抓法):轻量 Python + 流水线依赖,不装浏览器。
# jobbank/ats/build 三个 service 共用本镜像,靠 compose 的 SOURCE 环境变量区分跑哪条链。
# 源码与 data/ 由 compose bind-mount 注入(working_dir=/repo),镜像本身不 COPY 源码 ——
# 改 etl 脚本无需重建镜像,改的是挂载进去的文件。
FROM python:3.12-slim
RUN pip install --no-cache-dir "httpx>=0.27" "beautifulsoup4>=4.12" "pymupdf>=1.24" "lxml>=5.0"
CMD ["python", "etl/auto_update.py"]
