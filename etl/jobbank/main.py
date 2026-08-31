"""
jobbank 域唯一入口(一域一门;七个步骤文件 2026-08-31 批I 全溶进 functions.py,本门直调
段函数,不再 import 步骤模块 —— 全溶域的门形,样张 etl/company/main.py 与 etl/ircc/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(四步逐字复刻旧
sources/jobbank 役册 META.steps 的顺序与语义):抓 listing 快照 → 解析合并进
postings.json → 抓详情 HTML → 解析详情。
沿革(逐字留档,批F/批H/批I 三笔一条不删):
· 批F 立域(搬家批):三个抓岗件自编号主管线迁入改名,门直调步骤文件的 run()。
· 批H:两个解析步由 clean/ 子进程改直调 run()(clean/05_parse_jobbank.py →
  parse_jobbank_postings.py、clean/05b_parse_details.py → parse_jobbank_details.py),
  文件进本域了就不再隔着子进程说话;audit 自根 audit_data.py、expired 自根
  verify_expired.py 一并归户。
· 批I 全溶:七个步骤文件溶成 functions.py 的八段(共享词汇一段 + 七步各一段),
  run() 壳退役,门直调同名段函数;抓取步的实参(--all-occupations / --prov ALL /
  --since-days / --max-pages 400)随旧 CLI 一起退役,值原样进 constants 当域常量。
· 批J(clean/ 目录退役,「谁的数据谁清洗」):clean/05e_flag_apprentice 与
  clean/05d_noc_sanity 两件归户本域成第 9/10 段,只进 TOOLS 不进 SCHEDULED
  (它们跟的是 load 域 build 链的节奏,由那条链 --only 点名)。
postings.json 的跨进程锁照旧只在两个解析段里持有(与 build 角色并发安全),本门不碰锁;
「一步失败中止本轮」由段函数抛出的异常兑现(main 的 except 捕获后 return 1)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/jobbank/main.py                    # 默认链(4 步)
    python etl/jobbank/main.py --only companies   # 单步调试(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from jobbank.functions import (
    audit_jobbank_data, build_jobbank_companies, flag_jobbank_apprentice,
    guard_jobbank_noc_sanity, parse_jobbank_details, parse_jobbank_postings,
    scrape_jobbank_details, scrape_jobbank_postings, verify_jobbank_expired,
)

SCHEDULED = [
    ("postings", scrape_jobbank_postings),
    ("parse", parse_jobbank_postings),
    ("details", scrape_jobbank_details),
    ("parse_details", parse_jobbank_details),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。四步与旧 sources/jobbank 役册
META.steps 一一对应:

  postings       全职业 · 全省 · sort=D · 只存原始 HTML 快照(不解析不合并)
  parse          快照 → postings.json 增量合并去重(持仓锁;旧 clean/05)
  details        逐帖抓详情页原始 HTML(增量:已抓过/已富集的跳过)
  parse_details  详情 → 衍生字段 + details/*.md(同一事务持仓锁;旧 clean/05b)
"""

TOOLS = {
    "postings": scrape_jobbank_postings,
    "parse": parse_jobbank_postings,
    "details": scrape_jobbank_details,
    "parse_details": parse_jobbank_details,
    "companies": build_jobbank_companies,
    "audit": audit_jobbank_data,
    "expired": verify_jobbank_expired,
    "apprentice": flag_jobbank_apprentice,
    "noc_sanity": guard_jobbank_noc_sanity,
}
"""全部可 --only 点名的步 = 默认链四步 + 五个手动件:

  companies  扁平 postings.json → 分省/市/雇主的公司目录(profile/jobs.json/jobs/*.md)。
             **不进链**:全仓 grep 零调度消费者(旧 sources/jobbank 与 sources/build
             役册都不含 06),2026-08-31 批F 随 jobbank 立域收进本域 TOOLS 手动点名。
  audit      岗位数据质检(只读,产 audit-flags.json);2026-08-31 批H 自根 audit_data.py
             归户本域(查的是本域的 postings.json)。
  expired    死岗验尸(#124 批C:判死帖累积 expired_ids.json,mart 一手剔表一手下发 closed)。
             **进 load 域 build 链**(旧链 `python etl/verify_expired.py` 一行,批H 改成
             `etl/jobbank/main.py --only expired`),不在本域默认链里 —— 它跟的是灌库节奏。
  apprentice 无经验友好打标(B1-3:官方 Experience 短语 + 学徒标题 → apprentice_friendly);
             2026-08-31 批J 自 clean/05e_flag_apprentice.py 归户全溶。**进 build 链**
             (原链首步),同 expired 不在本域默认链里。
  noc_sanity 标题↔NOC 失配护栏(#47:泛词标题 × TEER0/1 × 薪资远低 → NOC 置空转未分类);
             同批自 clean/05d_noc_sanity.py 归户全溶。**进 build 链**,且 🔴 必须排在
             mart 的 salary 步之后 —— 判据里的「薪资远低」读的是那步算出的 salaryAnnual。

⚠ --only 是子串匹配(门形样张同款):`--only parse` 会同时命中 parse 与 parse_details,
`--only details` 会同时命中 details 与 parse_details —— 要单点后者请写全名。
批J 两个新键与既有七键互不误命中(逐对核过:apprentice / noc_sanity 既不含既有键、
也不被既有键含)。
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
