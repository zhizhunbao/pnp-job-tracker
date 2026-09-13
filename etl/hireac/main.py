"""
hireac 域唯一入口(一域一门;门直调 functions.py 的段函数 —— 全溶域的门形,样张 etl/careerbeacon/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**:
登录态浏览器抓取(列表翻页 + 详情回放,一次会话)→ 详情解析 → postings 仓。
「一步失败中止本轮」由段函数抛出的异常兑现(main 的 except 捕获后 return 1);
登录态过期是最常见的失败:抛错停轮,Frank 在共享 profile 里重登后再跑。
🔴 本域只在 Frank 本机手动跑(登录态是 Windows Chrome 加密 cookie,容器拿不到),不进 docker-compose。
一律从仓库根执行:
    BROWSER_CHANNEL=chrome python etl/hireac/main.py            # 默认链(3 步)
    python etl/hireac/main.py --only parse                        # 单步调试(见 TOOLS;parse/store 只读缓存,不起浏览器)
    DETAILS_PER_RUN=200 BROWSER_CHANNEL=chrome python etl/hireac/main.py   # 压小每轮回放量

@author Frank
@time 2026-09-13
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from hireac.functions import build_hireac_postings, parse_hireac_details, scrape_hireac

SCHEDULED = [
    ("scrape", scrape_hireac),
    ("parse", parse_hireac_details),
    ("store", build_hireac_postings),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。

  scrape   登录态浏览器一次会话:列表翻页 → raw/hireac/rows.json(行号 → 表单参数)
           + 未缓存详情页内回放 → crawl/board-hireac/(每轮 DETAILS_PER_RUN 张)
  parse    缓存原文 → 「标签: 值」表格 → raw/hireac/jobs.json(增量,已解析不重解)
  store    事实 × 行表 → processed/hireac/postings.json(当前态,Job Bank 仓同形)
"""

TOOLS = {
    "scrape": scrape_hireac,
    "parse": parse_hireac_details,
    "store": build_hireac_postings,
}
"""全部可 --only 点名的步(与默认链同一份三步,本域没有不进链的手动件)。"""


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
    for name, fn in todo:
        say(f"→ {name}")
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            err(name, e)
            return 1
    say(f"✓ 本域 {len(todo)} 步全过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
