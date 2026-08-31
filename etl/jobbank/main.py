"""
jobbank 域唯一入口(一域一门;2026-08-31 批F 立域,**搬家批**:三个抓岗件自编号主管线
迁入改名,抓取逻辑一字未动 —— 方言全溶留后续滚动批,故本门直调步骤文件的 run(),
不是全溶域那种直调 functions.py 段函数;门形样张 etl/ircc/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(四步逐字复刻旧
sources/jobbank 役册 META.steps 的顺序与语义):抓 listing 快照 → 解析合并进
postings.json → 抓详情 HTML → 解析详情。
两个解析步 2026-08-31 批H **由 clean/ 子进程改直调 run()**:两件已归户本域
(clean/05_parse_jobbank.py → parse_jobbank_postings.py、clean/05b_parse_details.py →
parse_jobbank_details.py),文件进本域了就不再隔着子进程说话;解析逻辑一字未动,
「一步失败中止本轮」由门的 try/except 兑现(与旧的「子进程非零即抛错」同义)。
postings.json 的跨进程锁照旧只在解析件里持有(与 build 角色并发安全),本门不碰锁。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/jobbank/main.py                    # 默认链(4 步)
    python etl/jobbank/main.py --only companies   # 单步调试(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from jobbank.audit_jobbank_data import run as audit_jobbank_data
from jobbank.build_jobbank_companies import run as build_jobbank_companies
from jobbank.parse_jobbank_details import run as parse_jobbank_details
from jobbank.parse_jobbank_postings import run as parse_jobbank_postings
from jobbank.scrape_jobbank_details import run as scrape_jobbank_details
from jobbank.scrape_jobbank_postings import run as scrape_jobbank_postings
from jobbank.verify_jobbank_expired import run as verify_jobbank_expired
from log.functions import err, say

SCHEDULED = [
    ("postings", scrape_jobbank_postings),
    ("parse", parse_jobbank_postings),
    ("details", scrape_jobbank_details),
    ("parse_details", parse_jobbank_details),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。四步与旧 sources/jobbank 役册
META.steps 一一对应,实参也逐字沿用(抓取步的 --all-occupations / --prov ALL /
--since-days / --max-pages 400 内置在 scrape_jobbank_postings.chain_argv):

  postings       全职业 · 全省 · sort=D · 只存原始 HTML 快照(不解析不合并)
  parse          快照 → postings.json 增量合并去重(持仓锁;旧 clean/05,批H 归户直调)
  details        逐帖抓详情页原始 HTML(增量:已抓过/已富集的跳过)
  parse_details  详情 → 衍生字段 + details/*.md(同一事务持仓锁;旧 clean/05b,批H 归户直调)
"""

TOOLS = {
    "postings": scrape_jobbank_postings,
    "parse": parse_jobbank_postings,
    "details": scrape_jobbank_details,
    "parse_details": parse_jobbank_details,
    "companies": build_jobbank_companies,
    "audit": audit_jobbank_data,
    "expired": verify_jobbank_expired,
}
"""全部可 --only 点名的步 = 默认链四步 + 三个手动件:

  companies  扁平 postings.json → 分省/市/雇主的公司目录(profile/jobs.json/jobs/*.md)。
             **不进链**:全仓 grep 零调度消费者(旧 sources/jobbank 与 sources/build
             役册都不含 06),2026-08-31 批F 随 jobbank 立域收进本域 TOOLS 手动点名。
  audit      岗位数据质检(只读,产 audit-flags.json);2026-08-31 批H 自根 audit_data.py
             归户本域(查的是本域的 postings.json)。
  expired    死岗验尸(#124 批C:判死帖累积 expired_ids.json,mart 一手剔表一手下发 closed)。
             **进 load 域 build 链**(旧链 `python etl/verify_expired.py` 一行,批H 改成
             `etl/jobbank/main.py --only expired`),不在本域默认链里 —— 它跟的是灌库节奏。

⚠ --only 是子串匹配(门形样张同款):`--only parse` 会同时命中 parse 与 parse_details,
`--only details` 会同时命中 details 与 parse_details —— 要单点后者请写全名。
"""


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
