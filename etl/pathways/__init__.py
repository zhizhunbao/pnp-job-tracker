"""
pathways 域:全国通道对照表(2026-09-28 立域;Frank「合成一个大表,抽选成通用字段,是不是方便之后对比」
「通道需要单独创建域吧」「我是说在 etl/pathways 专门用来洗数据」;立项稿 docs/design/通道表-20260928.md)。

回答的问题:「本站认哪些移民通道,官网各页的事实各属于哪一条」—— 一条通道一行:属于哪省哪个项目、我们的三语直白名、
官方英文原名、官方用哪几组抽选邀请它、门槛表里是哪几条流、配额表里是哪一行、职业清单是哪张、开着还是关了。
边界(立域三问):etl/pnp 管「各省官网公布了什么」(抓取与解析,天天变);本域管「这些事实对到本站哪一条通道」
(人工核定的对照,几年一变)。依赖方向:本域读 pnp 产物做自校,pnp 不认识本域;mart 读本域产物汇装进库。
对照表住 constants(一条通道一段,注释挂官方原句与判读理由);每轮拿它对一遍 raw/pnp 的现值,对不上就停、不写产物
(官网改名当轮就红,不再等人点开弹框才发现),对上了写 processed/pathways/pathways.json,mart 直通进 data/mart/。

META = 域即役的调度声明:role=挂哪个角色容器(SOURCE 环境变量),interval=本域一轮的间隔秒;
入口固定 etl/pathways/main.py,步骤清单在 main.py 里。
⚠ 本文件保持零 import:build 容器每轮的保鲜闸(sched freshness_ok → domain_metas)会逐个 exec 各域 __init__。
不声明 fresh 契约:产物每轮自校过了就重写,自校红时本单元的 ping 已经转红,保鲜闸再报一遍是重复告警。

@author Frank
@time 2026-09-28 14:52:58
"""

META = {
    "role": "pathways",
    "method": "httpx",       # 对应 etl/sched/Dockerfile 通用轻镜像(只读本地 raw/pnp,不发请求)
    "interval": 3600,        # 每小时一轮:pnp 二十个单元都是小时更,官网改名下一轮就对得出来;一轮只读几十个本地 JSON,零网络
    "seed": False,           # 不灌库:产物由 build 角色的 mart 汇装进 data/mart/pathways.json 再统一灌
    "ping": True,            # 本角色唯一单元(自校红 = sys.exit(1) = 扣 ping)
}
