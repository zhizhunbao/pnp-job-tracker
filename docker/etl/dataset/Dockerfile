# 方式 = dataset:下载「开放数据文件」(ESDC 工资 CSV、GeoNames 邮编、AIP 名单)。
# 只需 httpx 下文件 + 标准库(csv 等)解析,最轻。
# 源码与 data/ 由 compose bind-mount 注入(working_dir=/repo),镜像不 COPY 源码。
FROM python:3.12-slim
RUN pip install --no-cache-dir "httpx>=0.27" "loguru>=0.7"
CMD ["python", "etl/auto_update.py"]
