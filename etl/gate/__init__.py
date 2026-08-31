"""
gate 域:etl 的自查闸 —— 形制十规、基线管理、写法债报告、跨进程锁的真件自查。

2026-08-31 批K 立域(Frank「我觉得也需要设计成域」):根上三件开发工具
(check_shape.py / report_ruff.py / test_jobbank_lock.py)全溶五件,入口收成
etl/gate/main.py 一个门,形制基线 etl_shape_baseline.json 随域搬进本目录(闸的账本
跟着闸走)。溶完**用新门自查**:`python etl/gate/main.py --only shape`。

**本域无 META** —— 闸不是役:auto_update 只收声明了 META/METAS 且 role 匹配的域役,
无 META 即不进任何角色容器;闸由 .githooks/pre-push 与人手动跑。
依赖方向:gate → 被测域(锁自查要 import load/paths/jobbank 的真件),各域从不引 gate ——
它与 sched 同在域层之上,形制闸的域间禁 import 对这两域放行(判据见 constants.ABOVE)。
"""
