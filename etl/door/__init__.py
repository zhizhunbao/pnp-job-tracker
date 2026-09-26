"""
door 域:域门(etl/<域>/main.py)跑一串步的公共件(基础设施叶,2026-09-26 立)。

回答的问题:「一个域的门怎么按序跑一串 (步名, 函数)」—— 谁失败了留痕记下、其余步照跑、最后报成败(返回码)。
边界:只管「跑步骤的顺序与成败记账」;选哪些步(默认链 / --only 点名)留在各门,步里干什么是各域自己的事,
何时跑哪个域是 sched 的事(进程级,本叶是门内的函数级)。依赖只指向 log 叶(报行);没有业务 import 它的东西,
换掉它业务一个字不用改 = 基础设施叶(gate 的 INFRA 名单登记)。
沿革:2026-09-26 /fe Frank「一步失败不再拖停整轮」先在 pnp、statcan 两门各写一份 run_steps;同日 Frank「推广」
→ 搬进本叶(纯移动:哪些步跑、返回码怎么算一字不改),各域门改为 `return run_steps(todo)`。
没迁的门(2026-09-26 推广批,仍是「一步失败即中止」):
  sched  常驻守护进程自配 loguru sink,门叶引 log.functions 会在进程内重配 sink(log 叶头注的禁令);
  load   一步包整条汇装链(持 Job Bank 仓锁 → 上传 → 灌库),链内失败 sys.exit(rc) 另有语义;
  mart   score → mart → rankings → stats 严格上下游;jobbank 列表 → 解析 → 详情 → 详情解析(两域另有子工在改);
  careerbeacon / gcjobs / hireac / jobboom / jobillico  store 步按枚举表算当前态 —— 枚举步半途失败还接着 store,
         没枚举到的帖会被当成下架(破坏性下游);
  pte    十九步各源 → pte-mart → 灌库,源步半途失败留下的残缺数据会被 pte-mart 带进库。
正门 = from door.functions import run_steps(件套以包名被引,与 log / names 同形)。
本 __init__ 零 import:sched 域发现会 exec 每个 etl/*/__init__,基础设施叶无 META。

@author Frank
@time 2026-09-26 16:09:33
"""
