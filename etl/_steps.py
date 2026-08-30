"""
_steps — 域 main.py 的共享跑步器(批2 一域一门,2026-08-29)。

语义与 auto_update 的本役步骤**完全一致**:顺序执行、一步失败立即中止(exit 非零)——
pnp 域的硬闸排序(自校 exit 1 的步骤钉在末尾)依赖这条语义,不许改成逐步隔离。
用法(一律从仓库根跑,steps 里的路径都是 etl/ 相对根的):
    python etl/<域>/main.py                # 全链
    python etl/<域>/main.py --only 子串    # 只跑命令行含该子串的步骤(单步调试)
"""
import subprocess
import sys


def run_steps(steps: list[list[str]]) -> int:
    """顺序跑一个域的步骤清单;返回进程退出码(0=全过,非零=首个失败步的码)。"""
    only = None
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        only = args[1]
    ran = 0
    for step in steps:
        if only is not None and only not in " ".join(step):
            continue
        print("→ " + " ".join(step), flush=True)
        rc = subprocess.call(step)
        if rc != 0:
            print(f"✗ 步骤失败(exit {rc}),本域本轮中止", flush=True)
            return rc
        ran += 1
    print(f"✓ 本域 {ran} 步全过", flush=True)
    return 0
