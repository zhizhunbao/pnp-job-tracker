"""log.constants — 日志域词表(错误行模板 / sink 格式)。

2026-08-30 目录化(Frank:基建叶也抽成域,去 _ 前缀)——原 etl/_log.py 拆件。
"""

ERR_TPL = "✗ {where} {name}: {detail}"
"""吞而不哑的错误行(永不吞异常令,2026-08-30 Frank):不打断流程的 catch 也必须打;
✗ 前缀 = 调度层升 ERROR 级的信号。where=出事对象(url/域名/文件/时刻串)。"""

SINK_FORMAT = "{message}"
"""sink 只打消息本身:域是子进程,auto_update 截获 stdout 逐行再套「时间|级别|源」前缀,
这里再带时间戳就双前缀了;手动跑时也是干净一行。"""
