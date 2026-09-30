"""
news 域唯一入口:官方新闻聚合(一域一门;步骤 2026-08-30 批C 全溶进 functions.py,
本门直调函数,不再 subprocess —— 全溶域的门形,样张 etl/company/main.py)。

SCHEDULED = 本域步骤真相(顺序即语义,与原 scrape_immigration_news.py 的 __main__ 四行
逐行对应:抓取 → 重要度 → 全文翻译 → 标题灰注;一步抛错即中止本轮)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/news/main.py                    # 默认链(news 角色 12h 一轮)
    python etl/news/main.py --only score       # 单步:scrape / score / translate / titles
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    # pyrefly: ignore[missing-attribute] — typeshed 把 sys.stdout 标成 TextIO,运行时是 TextIOWrapper(带 reconfigure)
    sys.stdout.reconfigure(encoding="utf-8")

from log.functions import say
from door.functions import run_steps
from news.functions import (
    score_missing, scrape_immigration_news, summarize_missing, translate_missing, translate_titles_missing,
)

SCHEDULED = [("scrape", scrape_immigration_news), ("score", score_missing),
             ("translate", translate_missing), ("titles", translate_titles_missing),
             ("summarize", summarize_missing)]
"""默认链(调度真相):按序执行,一步抛错即中止本轮(_steps 同款语义)。

score 是轻量必跑(新条目才有徽标/上 banner);translate 预翻已停(budget 0),
恢复 = 调 NEWS_TRANSLATE_BUDGET;titles 独立预算默认开(NEWS_TITLE_TRANSLATE_BUDGET)。
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
同日晚改判回一步失败即中止(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):门叶改回 fail-fast,本门一字不改;互不相干的步拆成各自的调度单元(各自容器、各自 ping)。
2026-09-30 加 summarize(Frank「默认所有的新闻都加一个 AI 速读」):排最后 —— 它叫 cms 接口补库里缺的速读,
线上模型挂了只卡它自己,前四步照常落盘。
"""

TOOLS = {
    "scrape": scrape_immigration_news,
    "score": score_missing,
    "translate": translate_missing,
    "titles": translate_titles_missing,
    "summarize": summarize_missing,
}
"""全部可 --only 点名的步。"""


def main() -> int:
    """跑默认链或 --only 点名的单步;返回进程退出码。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        picked = []
        for k, f in TOOLS.items():
            if args[1] in k:
                picked.append((k, f))
        if len(picked) == 0:
            say(f"✗ --only {args[1]} 没命中(可选:{'/'.join(TOOLS)})")
            return 1
        todo = picked
    else:
        todo = SCHEDULED
    return run_steps(todo)


if __name__ == "__main__":
    sys.exit(main())
