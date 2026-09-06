"""
statcan 域:StatCan WDS 表 → raw(2026-09-06 立域)。

回答什么问题:**加拿大官方统计口径的宏观刻度现在是多少**(分省可比、按期序列)——
人口 / 临时居民 / GDP / 失业率四张 WDS 表,一表一文件落 raw/statcan/<pid>.json;
另有两张老表(NPR 占总人口比、分省临时居民存量)自 ircc 域整段搬入,**产物路径不动**
(raw/ircc/npr_share.json 与 raw/ircc/statcan_tr_prov.json,消费端一个字不用改)。

边界(切法 = 「谁家的数据」而不是「谁在用」):ircc 域管 IRCC 开放数据(许可存量/流量、
PGWP、规费、难度指数),本域管 StatCan WDS;两家口径不可混列(StatCan=常住估算,
IRCC=有效许可持有人),分域正好把这条红线摆在目录边界上。
寿命:跟 StatCan WDS 走(免密钥 REST,比任何消费页活得久);谁都不依赖本域函数,
只读本域产物文件(依赖只指向活得更久的那个:mart → 文件)。

META = 域即役的调度声明:role=挂哪个角色容器(SOURCE 环境变量),interval=本域一轮的间隔秒;
入口固定 etl/statcan/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "statcan",         # 一域一容器(docker-compose 的 statcan service)
    "method": "httpx",
    "interval": 86400,         # 日更当兜底(StatCan 按期发布:季度表一季一次、月度表一月一次)
    "seed": False,
    "ping": True,   # 本角色的 healthchecks 心跳由本域发
    "fresh": [      # 保鲜契约(语义见 sched.K_FRESH;两张老表的条目自 ircc 域 META 搬来,路径不变)
        {"glob": "raw/statcan/*.json", "cadence_days": 8},
        {"file": "raw/ircc/npr_share.json", "cadence_days": 8},
        {"file": "raw/ircc/statcan_tr_prov.json", "cadence_days": 8},
    ],
}
