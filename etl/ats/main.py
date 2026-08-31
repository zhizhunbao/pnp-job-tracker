"""
ats 域唯一入口(一域一门;两个步骤文件 2026-08-31 批I 全溶进 functions.py,本门直调函数,
不再 import 步骤模块 —— 全溶域的门形,样张 etl/company/main.py 与 etl/ircc/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(两步逐字复刻旧
sources/ats 役册 META.steps):抓各家 ATS 公开 JSON → 抽 ATS 结构化薪资。
沿革(逐字留档,批F/批H2 的两条决策一条不删):
· 批F 立域搬家,04 抓岗件自编号主管线迁入改名;salary 一步当时还住 clean/,门里是
  subprocess 包装(STEP_PY 钉 sys.executable 是因为本机 uv 环境下裸 `python` 解析到基础
  解释器而非项目 .venv —— 批F 实撞 clean/05 起手 bs4 ModuleNotFoundError)。
· 批H2 归户:clean/04b 迁进本域成 ats/extract_ats_salary.py(判据「谁的数据谁管」——
  它只读写 ATS 各司 jobs.json,不是真横切),门随之从 subprocess 改直调 run(),
  四件包装(extract_ats_salary / STEP_PY / SALARY_SCRIPT / STEP_FAIL_TPL)同批拆除;
  直调后进程只有一个,解释器那条坑消失。
· 批I 全溶:两个步骤文件的 run() 壳退役,门直调 functions.py 的同名段函数。
「一步失败中止本轮」由段函数抛出的异常兑现(main 的 except 捕获后 return 1),
与旧的「子进程非零即中止」同义。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现
(⚠ compose 里 ats 服务现处注释态,没有容器在跑本域 —— 见 __init__ docstring)。
一律从仓库根执行:
    python etl/ats/main.py                 # 默认链(2 步)
    python etl/ats/main.py --only salary   # 单步调试(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from ats.functions import extract_ats_salary, scrape_ats_jobs

SCHEDULED = [
    ("scrape", scrape_ats_jobs),
    ("salary", extract_ats_salary),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。两步与旧 sources/ats 役册
META.steps 一一对应,两步都不带实参(旧役册同样不带):

  scrape  逐司读 careers.json → 调各家 ATS 公开 JSON → 就地写回 jobs.json + jobs/*.md
  salary  extract_ats_salary:从上一步落好的描述里抽结构化薪资(原 clean/04b,批H2 归户)
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
