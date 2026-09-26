"""
wages 域唯一入口(一域一门;步骤 2026-08-30 批D 全溶进 functions.py,本门直调函数,
不再 subprocess —— 全溶域的门形,样张 etl/company/main.py)。

本域无默认链(与全溶前一致:没有 META、不挂役,三步一直是手动点名跑;
jvws 必须先于 mart —— mart 吃的是 jvws 的产出)。
一律从仓库根执行:
    python etl/wages/main.py --only medians   # ESDC 中位工资 → raw/wages/wages.json
    python etl/wages/main.py --only jvws      # StatCan 空缺岗位 → raw/jvws/jvws-vacancies.json
    python etl/wages/main.py --only mart      # 上一步产出 → mart/jvws_vacancies.json
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from wages.functions import build_esdc_wage_medians, build_statcan_jvws, build_statcan_jvws_mart

SCHEDULED = []
"""无默认链(本域三步全靠手动点名,节奏见各步源的更新频率)。
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
"""

TOOLS = {
    "medians": build_esdc_wage_medians,
    "jvws": build_statcan_jvws,
    "mart": build_statcan_jvws_mart,
}
"""全部可 --only 点名的步。"""


def main() -> int:
    """跑 --only 点名的单步;无参 = 无默认链,提示用法。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        picked = []
        for k, f in TOOLS.items():
            if args[1] in k:
                picked.append((k, f))
        if len(picked) == 0:
            say(f"✗ --only {args[1]} 没命中(可选:{'/'.join(TOOLS)})")
            return 1
    else:
        say(f"本域无默认链,用 --only 点名(可选:{'/'.join(TOOLS)})")
        return 1
    return run_steps(picked)


if __name__ == "__main__":
    sys.exit(main())
