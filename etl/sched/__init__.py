"""
sched 域:ETL 调度器 —— 守护循环(常驻,容器 CMD)+ 手动一轮(开发机点名跑)。

2026-08-31 批K 立域(Frank「我觉得也需要设计成域」):根上 auto_update.py + run_now.py
两件管理层脚本全溶五件,入口收成 etl/sched/main.py 一个门(默认链 = 守护循环,
`--only now` = 手动一轮)。域即役的调度契约 source_manifest.json 随域搬进本目录
(它是「谁该多新鲜」的声明,归调度器管;唯一消费者 = pnp 域的新鲜度哨兵)。

**本域无 META** —— 调度器自己不被自己调度:auto_update 只收声明了 META/METAS 且
role 匹配的域役,无 META 即不进任何角色容器。本域反过来是那个「收」的人。
依赖方向:sched → 各域(发现 META、起子进程、进程内直调 load 的 seed/alerts 触发),
各域从不引 sched —— 它在域层之上,不是域的邻居(形制闸的域间禁 import 因此对本域
与 gate 域放行,判据见 gate/constants.py 的 ABOVE)。
"""
