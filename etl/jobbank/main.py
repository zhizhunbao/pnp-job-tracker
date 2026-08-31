"""
jobbank 域唯一入口(一域一门;2026-08-31 批F 立域,**搬家批**:三个抓岗件自编号主管线
迁入改名,抓取逻辑一字未动 —— 方言全溶留后续滚动批,故本门直调步骤文件的 run(),
不是全溶域那种直调 functions.py 段函数;门形样张 etl/ircc/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(四步逐字复刻旧
sources/jobbank 役册 META.steps 的顺序与语义):抓 listing 快照 → 解析合并进
postings.json → 抓详情 HTML → 解析详情。
⚠ parse / parse_details 两步调的是 **etl/clean/ 子进程**:clean 是清洗横切层
(一个关注点一个脚本、跨源生效),不属本域也不搬进来 —— 它们消费本域抓的 raw
(subprocess 包装先例:ircc 域的 difficulty 步调 clean/04e_difficulty.py)。
子进程 stdout 直通(不 capture)、返回非零即抛错 → 本轮中止,与旧役册逐字同义。
postings.json 的跨进程锁照旧只在 clean 解析层持有(与 build 角色并发安全),本门不碰锁。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/jobbank/main.py                    # 默认链(4 步)
    python etl/jobbank/main.py --only companies   # 单步调试(见 TOOLS)
"""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import paths
from jobbank import SINCE_DAYS
from jobbank.build_jobbank_companies import run as build_jobbank_companies
from jobbank.scrape_jobbank_details import run as scrape_jobbank_details
from jobbank.scrape_jobbank_postings import run as scrape_jobbank_postings
from log.functions import err, say

STEP_PY = sys.executable
"""子进程解释器:钉死成跑本门的这一个。容器里它就是旧役册 steps 首元素那个 `python`
(逐字等价);本机 uv 项目环境下裸 `python` 会被 Windows 解析成 uv 的基础解释器而不是
项目 .venv —— 2026-08-31 批F 实撞 clean/05 起手 bs4 ModuleNotFoundError,故不写字面量。"""

PARSE_POSTINGS_SCRIPT = paths.ROOT / "etl" / "clean" / "05_parse_jobbank.py"
"""列表 HTML 快照 → processed/jobbank/postings.json 的解析脚本(清洗横切层,不属本域)。"""

PARSE_DETAILS_SCRIPT = paths.ROOT / "etl" / "clean" / "05b_parse_details.py"
"""详情 HTML → postings.json 衍生字段 + details/*.md 的解析脚本(同上,不属本域)。"""

SINCE_DAYS_FLAG = "--since-days"
"""解析步的增量窗口旗子:与抓取步共用同一个 SINCE_DAYS,两边 cutoff 才对得上。"""

STEP_FAIL_TPL = "{script} 失败(exit {code}),本域本轮中止"
"""子进程非零退出的抛错文案 ——「一步失败中止本轮」的兑现(旧役册同款硬闸)。"""


def parse_jobbank_postings() -> None:
    """解析本轮 listing 原始 HTML 快照 → 增量合并去重进累积 store(clean 子进程)。"""
    proc = subprocess.run([STEP_PY, str(PARSE_POSTINGS_SCRIPT), SINCE_DAYS_FLAG, SINCE_DAYS])
    if proc.returncode != 0:
        raise RuntimeError(STEP_FAIL_TPL.format(script=PARSE_POSTINGS_SCRIPT.name, code=proc.returncode))


def parse_jobbank_details() -> None:
    """解析详情原始 HTML → 地址/官网/描述回填 store + details/*.md(clean 子进程)。"""
    proc = subprocess.run([STEP_PY, str(PARSE_DETAILS_SCRIPT)])
    if proc.returncode != 0:
        raise RuntimeError(STEP_FAIL_TPL.format(script=PARSE_DETAILS_SCRIPT.name, code=proc.returncode))


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
  parse          clean/05:快照 → postings.json 增量合并去重(持仓锁)
  details        逐帖抓详情页原始 HTML(增量:已抓过/已富集的跳过)
  parse_details  clean/05b:详情 → 衍生字段 + details/*.md(同一事务持仓锁)
"""

TOOLS = {
    "postings": scrape_jobbank_postings,
    "parse": parse_jobbank_postings,
    "details": scrape_jobbank_details,
    "parse_details": parse_jobbank_details,
    "companies": build_jobbank_companies,
}
"""全部可 --only 点名的步 = 默认链四步 + 一个手动件:

  companies  扁平 postings.json → 分省/市/雇主的公司目录(profile/jobs.json/jobs/*.md)。
             **不进链**:全仓 grep 零调度消费者(旧 sources/jobbank 与 sources/build
             役册都不含 06),2026-08-31 批F 随 jobbank 立域收进本域 TOOLS 手动点名。

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
