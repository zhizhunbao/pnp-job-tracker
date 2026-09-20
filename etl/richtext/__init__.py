"""
richtext 域:HTML → 带结构的纯文本,基础设施叶(2026-09-20 抽叶,Frank「richtext 五个源全换」)。

回答的问题:「这段 HTML 原本长什么样?」—— 段落落换行、列表加「• 」、节头加「## 」。
判据是 HTML 规范,不是哪家板的习惯,所以不属于任何一个源域(与 names 域「这两个公司名是不是
同一家」、noc 域「这个岗是什么职业」同款判定叶)。正文在页面哪个节点仍是各源域自己的事,
本叶不碰字段、不判业务 ——「换掉它业务一个字不用改」。

立叶前的实情(docs/design/职位正文结构下沉-20260920.md 取证):同一个行为被复制五份
(ats/jobillico/jobboom/careerbeacon/hireac 的 plain_text_of,后四份逐字相同),五份都把
标签碾成空格、连换行一起吃掉 —— 在招 22,099 条 Jobillico 岗正文落成一整行。jobbank 的
serialize_node 是唯一做对块级的一份,本叶自它逐字搬入。

⚠ 域名不叫 html:`etl/` 走 sys.path.insert,域以顶层包名被引,`etl/html/` 会遮蔽 Python
标准库的 html —— 仓里十个域 import 它,其中五个正是本叶的消费者(全是 from html import unescape)。
本名取自 jobbank 2026-07-16 起就在用的函数名 rich_text。

正门 = from richtext.functions import rich_text(件套以包名被引,与 fetch/names/log 同形)。
本 __init__ 零 import:sched 域发现会 import 每个 etl/*/__init__,基础设施叶无 META。

@author Frank
@time 2026-09-20
"""
