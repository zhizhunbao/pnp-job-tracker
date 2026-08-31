"""手动跑一轮 ETL(#119 简化拍板,Frank:「管理台不赚钱先放,给我脚本直接执行能看进度」)。

用法:
    python etl/run_now.py                # 默认全链:jobbank → pnp → ee → news → ircc → build(build 含灌库)
    python etl/run_now.py jobbank        # 只跑指定役;可多个按序:python etl/run_now.py jobbank build

步骤与 docker 役同一套(2026-08-31 批F 单轨:按角色收拢声明 role==名字 的域役
(META/METAS),各役跑 etl/<域>/main.py [--only 役];也可直接给域名如 dli),进度实时打印;
与后台 docker 轮并行跑也安全(posting_id 去重、同日目录幂等、seed 增量对账)。
build 的灌库步自动从 cms/.env 借 SEED_TOKEN,默认灌生产(SEED_URL 可用环境变量覆盖)。
"""
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "etl"))

DEFAULT = ["jobbank", "pnp", "ee", "news", "ircc", "build"]


def units_for(name: str) -> list[tuple[str, list[list[str]]]]:
    """名字 → 步骤单元:收角色==名字的域役(META 单役 / METAS 多役,2026-08-31 批F
    随 sources 役册退役收单轨);也可直接给域名(如 dli)。"""
    units: list[tuple[str, list[list[str]]]] = []
    etl_dir = ROOT / "etl"
    import importlib.util as _u
    for ini in sorted(etl_dir.glob("*/__init__.py")):
        dom = ini.parent.name
        if dom in ("clean",) or dom.startswith("_"):
            continue
        spec = _u.spec_from_file_location(f"_dom_{dom}", ini)
        # pyrefly: ignore[bad-argument-type] — spec_from_file_location 只在路径不存在时给 None;此处是仓内固定文件,拿不到就该当场炸
        mod = _u.module_from_spec(spec)
        try:
            # pyrefly: ignore[missing-attribute] — 同上,spec 非 None 时 loader 恒在
            spec.loader.exec_module(mod)
        except Exception:  # noqa: BLE001  # 坏域只跳过,手动工具不因一域挂全链
            continue
        metas = getattr(mod, "METAS", None)
        if metas is None:
            single = getattr(mod, "META", None)
            metas = [single] if isinstance(single, dict) else []
        for meta in metas:
            if not isinstance(meta, dict):
                continue
            if meta.get("role") == name or dom == name:
                step = ["python", f"etl/{dom}/main.py"]
                if meta.get("only"):
                    step = step + ["--only", meta["only"]]
                units.append((meta.get("name", dom), [step]))
    return units


def load_env() -> None:
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    envf = ROOT / "cms" / ".env"
    if envf.exists() and "SEED_TOKEN" not in os.environ:
        for ln in envf.read_text(encoding="utf-8").splitlines():
            if ln.startswith("SEED_TOKEN="):
                os.environ["SEED_TOKEN"] = ln.split("=", 1)[1].strip()
    os.environ.setdefault("SEED_URL", "https://offer2pr.com/api/seed")  # 2026-08-29 正门迁 /api/seed(旧 onrender 域名只剩 301)


def main() -> None:
    if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
        # pyrefly: ignore[missing-attribute] — typeshed 把 sys.stdout 标成 TextIO,运行时是 TextIOWrapper(带 reconfigure)
        sys.stdout.reconfigure(encoding="utf-8")
    roles = sys.argv[1:] or DEFAULT
    load_env()
    t0 = time.time()
    for role in roles:
        units = units_for(role)
        if len(units) == 0:
            print(f"✗ 未知役/域 {role}(角色/域看 etl/*/__init__.py 的 META/METAS)", flush=True)
            continue
        steps = [st for _, ss in units for st in ss]
        print(f"\n===== {role}({'+'.join(n for n, _ in units)},{len(steps)} 步)=====", flush=True)
        for step in steps:
            print("→", " ".join(step), flush=True)
            rc = subprocess.run(step, cwd=ROOT).returncode
            if rc != 0:
                print(f"✗ {role} 步骤失败 rc={rc} —— 本役中止,继续下一役", flush=True)
                break
        else:
            print(f"✓ {role} 完成", flush=True)
    print(f"\n===== 全部结束,用时 {time.time() - t0:.0f}s =====", flush=True)


if __name__ == "__main__":
    main()
