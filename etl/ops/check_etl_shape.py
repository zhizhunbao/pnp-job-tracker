"""
check_etl_shape — etl 形制自查役(分域批3,2026-08-29)。

Ruff 管不住的三条形制,这里当闸(判据见 docs/design/etl分域-20260829.md §4/§5):
  ① 域间禁 import:域内文件只许引基础设施叶子(paths/log/fetch/_steps/noc/noc_buckets/grades/crawl)
     与本域邻居,不许引别的域 —— 零基线,违规即红;
  ② IN_/OUT_ 显式路径常量:build_*/scrape_*/enrich_* 模块顶部必须声明(宪法既有);
  ③ 一域一门:域内只有 main.py 许带 `if __name__`(步骤模块该收成 run(),新写就范)。
②③ 存量走基线 etl/ops/etl_shape_baseline.json:新增违规即红;修掉存量后跑
`python etl/ops/check_etl_shape.py --prune` 收紧基线 —— 只紧不松(同 cms suppressions 惯例)。
"""
import ast
import json
import re
import sys
from pathlib import Path

ETL = Path(__file__).resolve().parent.parent
BASELINE = Path(__file__).resolve().parent / "etl_shape_baseline.json"

DOMAINS = ["company", "crawl", "dli", "ee", "employers", "fetch", "fsa", "ircc", "lmia",
           "load", "log", "news", "noc_facts", "ops", "paths", "pilot", "pnp", "wages"]
# fetch/crawl 2026-08-30 零字符串溶完即入册(INFRA 身份不变:域可引;双重身份 = 既被扫也可被依赖)
# crawl 2026-08-30 批A 升格基础设施(判据:被十几个 build 当地基读缓存 ——「换掉它
# 业务一个字不用改」;正门 from crawl.cache import …,path-hack 黑通道批B 拆光)

INFRA = {"paths", "fetch", "_steps", "log", "noc", "noc_buckets", "grades", "crawl"}

IMPORT_RE = re.compile(r"^(?:from|import)\s+([A-Za-z_][A-Za-z0-9_]*)", re.M)
INOUT_RE = re.compile(r"^(?:IN|OUT)_[A-Z0-9_]*\s*=", re.M)
MAIN_RE = re.compile(r"^if __name__", re.M)
STEP_PREFIX = ("build_", "scrape_", "enrich_")


KEY_CALLS = {"get", "setdefault", "pop"}

EXEMPT_VALUES = {"", "w"}


BANNED_NODES = {
    ast.Lambda: "lambda",
    ast.ListComp: "列表推导",
    ast.SetComp: "集合推导",
    ast.DictComp: "字典推导",
    ast.GeneratorExp: "生成器表达式",
}


def banned_syntax(text: str) -> list[tuple[int, str]]:
    """⑥⑦ 号规则:lambda/推导式/多参或带默认值的函数,返回 (行号, 说法)。"""
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return []
    found: list[tuple[int, str]] = []
    for node in ast.walk(tree):
        label = BANNED_NODES.get(type(node))
        if label is not None:
            found.append((node.lineno, label))
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if len(node.args.defaults) > 0 or len(node.args.kw_defaults) > 0:
                found.append((node.lineno, f"函数 {node.name} 带默认值参数(可选参数禁,cms 同律)"))
            for inner in ast.walk(node):
                if inner is not node and isinstance(inner, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    found.append((inner.lineno, f"内嵌函数 {inner.name}(出户成顶层,cms tsx 同律)"))
    return found


def string_literals(text: str) -> list[tuple[int, str]]:
    """functions.py 的零字符串扫描:返回 (行号, 截断片段) 清单,豁免见文件头 ⑤⑨。"""
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return []
    in_to: set[int] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name.startswith("to_"):
            for sub in ast.walk(node):
                in_to.add(id(sub))
    exempt: set[int] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            for stmt in getattr(node, "body", []):
                if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Constant)                         and isinstance(stmt.value.value, str):
                    exempt.add(id(stmt.value))
        if isinstance(node, ast.Dict):
            for k in node.keys:
                if isinstance(k, ast.Constant) and isinstance(k.value, str) and id(k) in in_to:
                    exempt.add(id(k))
        if isinstance(node, ast.Subscript) and isinstance(node.slice, ast.Constant)                 and isinstance(node.slice.value, str) and id(node.slice) in in_to:
            exempt.add(id(node.slice))
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)                 and node.func.attr in KEY_CALLS and len(node.args) >= 1                 and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str)                 and id(node.args[0]) in in_to:
            exempt.add(id(node.args[0]))
    found: list[tuple[int, str]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str)                 and id(node) not in exempt and node.value not in EXEMPT_VALUES:
            found.append((node.lineno, node.value[:24]))
    return found


def scan() -> tuple[list[str], list[str]]:
    """扫全部域文件,返回 (硬红清单=域间 import, 基线类清单=缺 IN/OUT + 多余 __main__)。"""
    hard: list[str] = []
    soft: list[str] = []
    for dom in DOMAINS:
        d = ETL / dom
        if not d.is_dir():
            continue
        for p in d.rglob("*.py"):
            if "__pycache__" in p.parts:
                continue
            rel = p.relative_to(ETL).as_posix()
            text = p.read_text(encoding="utf-8", errors="replace")
            for m in IMPORT_RE.finditer(text):
                name = m.group(1)
                if name in DOMAINS and name != dom and name not in INFRA:
                    # INFRA 优先:fetch 2026-08-30 起双重身份(被扫的域 + 可被依赖的基础设施叶)
                    hard.append(f"{rel}: 域间 import「{name}」(只许基础设施叶子与本域)")
            if p.name.startswith(STEP_PREFIX) and INOUT_RE.search(text) is None:
                soft.append(f"{rel}: 缺 IN_/OUT_ 显式路径常量")
            if p.name not in ("main.py",) and MAIN_RE.search(text) is not None:
                soft.append(f"{rel}: 步骤模块带 __main__(一域一门,该收成 run())")
            if p.name in ("functions.py", "main.py"):
                for m in re.finditer(r"^\s*print\(", text, re.M):
                    lineno = text.count(chr(10), 0, m.start()) + 1
                    hard.append(f"{rel}:{lineno} 裸 print(域内出口唯一 = log.functions.say/err)")
            if p.name == "functions.py":
                for m in re.finditer(r"^(?:async +)?def +_", text, re.M):
                    lineno = text.count(chr(10), 0, m.start()) + 1
                    hard.append(f"{rel}:{lineno} 下划线前缀函数(2026-08-30 Frank:私有靠单消费者事实,不靠名字装饰)")
                for m in re.finditer(r"^[A-Z][A-Z0-9_]* *=", text, re.M):
                    hard.append(f"{rel}: functions 顶层常量「{m.group(0).rstrip(' =')}」"
                                f"(归 constants;2026-08-30 Frank 否决段首常量,Ruff 无此规则故住本闸)")
                for lineno, frag in string_literals(text):
                    hard.append(f"{rel}:{lineno} functions 体内字符串「{frag}」(零字符串令,提名进 constants)")
                for lineno, label in banned_syntax(text):
                    hard.append(f"{rel}:{lineno} {label}(显式循环令/一参令,2026-08-30)")
    return sorted(hard), sorted(soft)


def main() -> int:
    """跑一轮形制自查;--prune 把当前 soft 违规写成新基线(只许变小,收紧)。"""
    hard, soft = scan()
    if not BASELINE.exists():
        BASELINE.write_text(json.dumps(soft, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"✓ 首建基线:{len(soft)} 条存量入册(此后只紧不松)")
        return 0 if len(hard) == 0 else 1
    known: list[str] = json.loads(BASELINE.read_text(encoding="utf-8"))
    if "--prune" in sys.argv:
        grown = [x for x in soft if x not in known]
        if len(grown) > 0:
            print("✗ prune 拒绝:基线只紧不松,先修掉新增违规:")
            for x in grown:
                print("  -", x)
            return 1
        BASELINE.write_text(json.dumps(soft, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"✓ 基线收紧:{len(known)} → {len(soft)}")
        return 0
    fresh = [x for x in soft if x not in known]
    for x in hard:
        print("✗", x)
    for x in fresh:
        print("✗ 新增形制违规:", x)
    fixed = [x for x in known if x not in soft]
    if len(fixed) > 0:
        print(f"ℹ 有 {len(fixed)} 条基线违规已修,跑 --prune 收紧")
    if len(hard) > 0 or len(fresh) > 0:
        return 1
    print(f"✓ 形制自查过闸(基线存量 {len(soft)} 条滚动中)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
