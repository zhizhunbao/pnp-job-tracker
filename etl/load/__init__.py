"""
load 域:灌库层(宪法分层 raw → clean → mart → load 的 load;2026-08-30 Frank 拍板立域)。

管「数据怎么进出我们的库」:seed/alerts 触发(auto_update 进程内直调)、mart 分片上传
(build 役末步)、pg_dump 备份(backup 役)。将来经 Payload 直接操作库的 REST 客户端
也归这 —— 名字不叫 payload:按会变的后端命名违切界律,且备份走 pg_dump 不经 Payload。
红线:批量数据仍走 raw→mart→seed,直接 CRUD 只给运维/修数/懒查询场景。

无 META(不自带役):upload/backup 由旧役册 sources/build、sources/backup 各自计时点名;
本 __init__ 零 import(auto_update 域发现会 import 每个 etl/*/__init__,轻门防噪)。
"""
