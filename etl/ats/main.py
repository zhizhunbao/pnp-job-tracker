"""
ats 域唯一入口(一域一门;2026-08-31 批F 立域,**搬家批**:04 抓岗件自编号主管线
迁入改名,抓取逻辑一字未动 —— 方言全溶留后续滚动批,故本门直调步骤文件的 run(),
不是全溶域那种直调 functions.py 段函数;门形样张 etl/ircc/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(两步逐字复刻旧
sources/ats 役册 META.steps):抓各家 ATS 公开 JSON → 抽 ATS 结构化薪资。
⚠ salary 一步调的是 **etl/clean/04b_extract_ats_salary.py 子进程**:clean 是清洗
横切层(一个关注点一个脚本),它只对 ATS 生效故跟本域一条链,但文件不搬进来
(subprocess 包装先例:ircc 域的 difficulty 步调 clean/04e_difficulty.py)。
子进程 stdout 直通(不 capture)、返回非零即抛错 → 本轮中止,与旧役册逐字同义。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现
(⚠ compose 里 ats 服务现处注释态,没有容器在跑本域 —— 见 __init__ docstring)。
一律从仓库根执行:
    python etl/ats/main.py                 # 默认链(2 步)
    python etl/ats/main.py --only salary   # 单步调试(见 TOOLS)
"""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import paths
from ats.scrape_ats_jobs import run as scrape_ats_jobs
from log.functions import err, say

STEP_PY = sys.executable
"""子进程解释器:钉死成跑本门的这一个。容器里它就是旧役册 steps 首元素那个 `python`
(逐字等价);本机 uv 项目环境下裸 `python` 会被 Windows 解析成 uv 的基础解释器而不是
项目 .venv —— 2026-08-31 批F 实撞 clean/05 起手 bs4 ModuleNotFoundError,故不写字面量。"""

SALARY_SCRIPT = paths.ROOT / "etl" / "clean" / "04b_extract_ats_salary.py"
"""ATS 职位描述 → 结构化薪资的抽取脚本(清洗横切层,只对 ATS 生效故随本域一条链)。"""

STEP_FAIL_TPL = "{script} 失败(exit {code}),本域本轮中止"
"""子进程非零退出的抛错文案 ——「一步失败中止本轮」的兑现(旧役册同款硬闸)。"""


def extract_ats_salary() -> None:
    """从各司 jobs.json / jobs/*.md 抽 ATS 结构化薪资(clean 子进程)。"""
    proc = subprocess.run([STEP_PY, str(SALARY_SCRIPT)])
    if proc.returncode != 0:
        raise RuntimeError(STEP_FAIL_TPL.format(script=SALARY_SCRIPT.name, code=proc.returncode))


SCHEDULED = [
    ("scrape", scrape_ats_jobs),
    ("salary", extract_ats_salary),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。两步与旧 sources/ats 役册
META.steps 一一对应,两步都不带实参(旧役册同样不带):

  scrape  逐司读 careers.json → 调各家 ATS 公开 JSON → 就地写回 jobs.json + jobs/*.md
  salary  clean/04b:从上一步落好的描述里抽结构化薪资
"""

TOOLS = {
    "scrape": scrape_ats_jobs,
    "salary": extract_ats_salary,
}
"""全部可 --only 点名的步(与默认链同一份两步,本域没有不进链的手动件)。"""


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
