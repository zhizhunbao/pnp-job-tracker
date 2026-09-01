"""
gate 域函数 —— 自查闸的行为全住这(照 company/jobbank 全溶样张,段横幅三行框 + N. 编号,
与 constants.py / scheme.py 同名同序镜像)。

2026-08-31 批K 立域(Frank「我觉得也需要设计成域」)收编根上三件开发工具:
check_shape.py(形制十规 + 基线管理)、report_ruff.py(写法债报告)、
test_jobbank_lock.py(锁自查,用例集住 scheme 的库垫片)。溶完**用新门自查**:
`python etl/gate/main.py --only shape`。

Ruff 管不住的形制,这里当闸(判据见 docs/design/etl分域-20260829.md §4/§5):
  ① 域间禁 import:域内文件只许引基础设施叶子(paths/log/fetch/noc/crawl)
     与本域邻居,不许引别的域 —— 零基线,违规即红(域层之上的 gate/sched 放行,
     判据见 constants.ABOVE);
  ② IN_/OUT_ 显式路径常量:build_*/scrape_*/enrich_* 模块顶部必须声明(宪法既有);
  ③ 一域一门:域内只有 main.py 许带 `if __name__`(步骤模块该收成 run(),新写就范);
  ④ 裸 print 禁(域内出口唯一 = log.functions.say/err);
  ⑤ functions 顶层下划线函数禁;⑥ functions 顶层常量禁(归 constants);
  ⑦ 零字符串令;⑧ 显式循环令(lambda/推导式/genexp 禁);⑨ 一参令(默认值参数禁)+
  内嵌函数禁;⑩ 域文件名白名单(五件套 + variables,野文件硬红,无例外表)。
②③ 存量走基线 etl/gate/etl_shape_baseline.json:新增违规即红;修掉存量后跑
`python etl/gate/main.py --only prune` 收紧基线 —— 只紧不松(同 cms suppressions 惯例)。
"""
import ast
import json
import subprocess
import sys
import unittest
from datetime import datetime

from log.functions import say
from gate.constants import (
    ABOVE, ARG_OUTPUT_FORMAT, ARG_STATISTICS, BACKSLASH, BANNED_SYNTAX_TPL, BARE_PRINT_TPL,
    BASELINE, BASELINE_INDENT, COLON, CONST_STRIP, CROSS_IMPORT_TPL,
    DEFAULT_ARG_TPL, DISSOLVED, DOMAINS, DOMAIN_EXTRA_FILES, DOMAIN_FILES, ENC_UTF8,
    ERRORS_REPLACE, ETL_DIR,
    ETL_PREFIX, EXEMPT_VALUES, EXTRA_MAIN_TPL, FENCE, FIXED_TPL, FRAG_LEN, FRESH_ROW_TPL,
    GIT_LSFILES, PY_SUFFIX,
    FUNCTIONS_NAME, HARD_ROW_TPL, IMPORT_RE, INFRA, INOUT_RE, KEY_CALLS, LBL_DICTCOMP,
    LBL_GENEXP, LBL_LAMBDA, LBL_LISTCOMP, LBL_SETCOMP, LOCK_VERBOSITY, MAIN_NAME, MAIN_RE,
    MD_EXEMPT_NOTE, MD_INTRO, MD_ROW_TPL, MD_SEC1, MD_SEC2, MD_SEC3_TPL, MD_SEC4_TPL,
    MD_TABLE_HEAD, MD_TABLE_SEP, MD_TITLE_TPL, NESTED_FN_TPL, NEWLINE, NO_INOUT_TPL,
    PASS_TPL, PRINT_RE, PRUNE_OK_TPL, PRUNE_REJECT_MSG, PRUNE_ROW_TPL, PYCACHE, PY_GLOB,
    REPORTS_DIR, REPORT_NAME_TPL, REPO_ROOT, RUFF_BARE_CMD, RUFF_GATE_CMD, SLASH, STAMP_FMT,
    STEP_PREFIX, STRAY_FILE_TPL, STRING_LIT_TPL, TOP_CONST_RE, TOP_CONST_TPL, TOP_N,
    TO_PREFIX, UNDERSCORE_FN_RE, UNDERSCORE_FN_TPL, VAL_CONCISE,
)
from gate.scheme import (CrossIn, DiffIn, ExemptIn, FileScanIn, HitsIn, JobbankStoreLockTest,
                         KeyIdsIn, LinenoIn, ScanOut)


# =========================================================================
# 1. 形制扫描(十规)
# =========================================================================


def scan() -> ScanOut:
    """扫全部域文件,返回 (硬红清单, 基线类清单),各自排序。"""
    hard: list[str] = []
    soft: list[str] = []
    for dom in DOMAINS:
        d = ETL_DIR / dom
        if d.is_dir() is False:
            continue
        for p in d.rglob(PY_GLOB):
            if PYCACHE in p.parts:
                continue
            out = scan_file(FileScanIn(dom=dom, path=p))
            hard.extend(out.hard)
            soft.extend(out.soft)
    hard.extend(stray_tracked_of())
    return ScanOut(hard=sorted(hard), soft=sorted(soft))


def stray_tracked_of() -> list[str]:
    """⑩号规全文件面(2026-08-31 批O,Frank「有 .json 怎么没检查出来」):受 git 管的
    域内文件,名字不在六件套 + DOMAIN_EXTRA_FILES 词汇里就硬红。
    .py 让位给上面的 rglob 面(它连没提交的野 .py 都抓,不报两遍);etl 根上的文件
    (etl/Dockerfile 通用镜像)不属域射程;git 不可用时本面跳过,.py 面照常全量。"""
    r = subprocess.run(GIT_LSFILES, cwd=ETL_DIR, capture_output=True, text=True,
                       encoding=ENC_UTF8, errors=ERRORS_REPLACE)
    hits: list[str] = []
    if r.returncode != 0:
        return hits
    for raw in r.stdout.splitlines():
        rel = raw.strip()
        if rel == "" or SLASH not in rel:
            continue
        name = rel.rsplit(SLASH, 1)[1]
        if name.endswith(PY_SUFFIX):
            continue
        if name in DOMAIN_EXTRA_FILES:
            continue
        hits.append(STRAY_FILE_TPL.format(rel=rel))
    return hits


def scan_file(x: FileScanIn) -> ScanOut:
    """一个文件过十规:硬红当场红,②③两条软规进基线。"""
    rel = x.path.relative_to(ETL_DIR).as_posix()
    text = x.path.read_text(encoding=ENC_UTF8, errors=ERRORS_REPLACE)
    hard: list[str] = []
    soft: list[str] = []
    if x.path.name not in DOMAIN_FILES:
        hard.append(STRAY_FILE_TPL.format(rel=rel))
    if x.dom not in ABOVE:
        hard.extend(cross_imports_of(CrossIn(dom=x.dom, rel=rel, text=text)))
    if x.path.name.startswith(STEP_PREFIX) and INOUT_RE.search(text) is None:
        soft.append(NO_INOUT_TPL.format(rel=rel))
    if x.path.name != MAIN_NAME and MAIN_RE.search(text) is not None:
        soft.append(EXTRA_MAIN_TPL.format(rel=rel))
    if x.path.name in (FUNCTIONS_NAME, MAIN_NAME):
        hard.extend(print_hits_of(HitsIn(rel=rel, text=text)))
    if x.path.name == FUNCTIONS_NAME:
        hard.extend(dialect_hits_of(HitsIn(rel=rel, text=text)))
    return ScanOut(hard=hard, soft=soft)


def cross_imports_of(x: CrossIn) -> list[str]:
    """①号规:引了别的域(基础设施叶与本域除外)。"""
    hits: list[str] = []
    for m in IMPORT_RE.finditer(x.text):
        name = m.group(1)
        if name in DOMAINS and name != x.dom and name not in INFRA:
            hits.append(CROSS_IMPORT_TPL.format(rel=x.rel, name=name))
    return hits


def print_hits_of(x: HitsIn) -> list[str]:
    """④号规:functions/main 里的裸 print。"""
    hits: list[str] = []
    for m in PRINT_RE.finditer(x.text):
        hits.append(BARE_PRINT_TPL.format(
            rel=x.rel, lineno=lineno_of(LinenoIn(text=x.text, pos=m.start()))))
    return hits


def dialect_hits_of(x: HitsIn) -> list[str]:
    """⑤⑥⑦⑧⑨号规:functions.py 的方言四查(下划线函数 / 顶层常量 / 字面量 / 语法)。"""
    hits: list[str] = []
    for m in UNDERSCORE_FN_RE.finditer(x.text):
        hits.append(UNDERSCORE_FN_TPL.format(
            rel=x.rel, lineno=lineno_of(LinenoIn(text=x.text, pos=m.start()))))
    for m in TOP_CONST_RE.finditer(x.text):
        hits.append(TOP_CONST_TPL.format(rel=x.rel, name=m.group(0).rstrip(CONST_STRIP)))
    for lineno, frag in string_literals(x.text):
        hits.append(STRING_LIT_TPL.format(rel=x.rel, lineno=lineno, frag=frag))
    for lineno, label in banned_syntax(x.text):
        hits.append(BANNED_SYNTAX_TPL.format(rel=x.rel, lineno=lineno, label=label))
    return hits


def lineno_of(x: LinenoIn) -> int:
    """正则命中位置 → 1 起的行号。"""
    return x.text.count(NEWLINE, 0, x.pos) + 1


def banned_syntax(text: str) -> list[tuple[int, str]]:
    """⑧⑨号规:lambda/推导式/genexp、带默认值的函数、内嵌函数,返回 (行号, 说法)。"""
    tree = tree_of(text)
    if tree is None:
        return []
    found: list[tuple[int, str]] = []
    for node in ast.walk(tree):
        label = banned_label_of(node)
        if label != "":
            # pyrefly: ignore[missing-attribute] — 命中的全是 expr 子类,带 lineno;ast.AST 基类才没有
            found.append((node.lineno, label))
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            found.extend(fn_shape_hits_of(node))
    return found


def banned_label_of(node: ast.AST) -> str:
    """⑧号规的说法(不是被禁的形则空串)。"""
    if isinstance(node, ast.Lambda):
        return LBL_LAMBDA
    if isinstance(node, ast.ListComp):
        return LBL_LISTCOMP
    if isinstance(node, ast.SetComp):
        return LBL_SETCOMP
    if isinstance(node, ast.DictComp):
        return LBL_DICTCOMP
    if isinstance(node, ast.GeneratorExp):
        return LBL_GENEXP
    return ""


def fn_shape_hits_of(node: ast.FunctionDef | ast.AsyncFunctionDef) -> list[tuple[int, str]]:
    """⑨号规:一个函数的默认值参数与内嵌函数。"""
    hits: list[tuple[int, str]] = []
    if len(node.args.defaults) > 0 or len(node.args.kw_defaults) > 0:
        hits.append((node.lineno, DEFAULT_ARG_TPL.format(name=node.name)))
    for inner in ast.walk(node):
        if inner is not node and isinstance(inner, (ast.FunctionDef, ast.AsyncFunctionDef)):
            hits.append((inner.lineno, NESTED_FN_TPL.format(name=inner.name)))
    return hits


def string_literals(text: str) -> list[tuple[int, str]]:
    """⑦号规:functions.py 的零字符串扫描,返回 (行号, 截断片段);豁免见文件头。"""
    tree = tree_of(text)
    if tree is None:
        return []
    in_to = to_scope_ids_of(tree)
    exempt = exempt_ids_of(ExemptIn(tree=tree, in_to=in_to))
    found: list[tuple[int, str]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) \
                and id(node) not in exempt and node.value not in EXEMPT_VALUES:
            found.append((node.lineno, node.value[:FRAG_LEN]))
    return found


def tree_of(text: str) -> ast.AST | None:
    """源码 → 语法树;语法错的文件本闸不管(Ruff 的 E9 族会红)。"""
    try:
        return ast.parse(text)
    except SyntaxError:
        return None


def to_scope_ids_of(tree: ast.AST) -> set[int]:
    """to_* 行构造器体内全部节点的 id(它们的行键豁免零字符串令)。"""
    ids: set[int] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) \
                and node.name.startswith(TO_PREFIX):
            for sub in ast.walk(node):
                ids.add(id(sub))
    return ids


def exempt_ids_of(x: ExemptIn) -> set[int]:
    """豁免节点的 id 集合:docstring + to_* 体内的三种行键写法。"""
    ids: set[int] = set()
    for node in ast.walk(x.tree):
        ids = ids | doc_ids_of(node)
        ids = ids | dict_key_ids_of(KeyIdsIn(node=node, in_to=x.in_to))
        ids = ids | subscript_ids_of(KeyIdsIn(node=node, in_to=x.in_to))
        ids = ids | call_key_ids_of(KeyIdsIn(node=node, in_to=x.in_to))
    return ids


def doc_ids_of(node: ast.AST) -> set[int]:
    """模块/函数/类体首部的裸字符串(docstring 与常量注释)的 id。"""
    ids: set[int] = set()
    if not isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        return ids
    for stmt in node.body:
        if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Constant) \
                and isinstance(stmt.value.value, str):
            ids.add(id(stmt.value))
    return ids


def dict_key_ids_of(x: KeyIdsIn) -> set[int]:
    """to_* 体内字典字面量的字符串键的 id。"""
    ids: set[int] = set()
    node = x.node
    if not isinstance(node, ast.Dict):
        return ids
    for k in node.keys:
        if isinstance(k, ast.Constant) and isinstance(k.value, str) and id(k) in x.in_to:
            ids.add(id(k))
    return ids


def subscript_ids_of(x: KeyIdsIn) -> set[int]:
    """to_* 体内 row["键"] 下标的 id。"""
    ids: set[int] = set()
    if isinstance(x.node, ast.Subscript) and isinstance(x.node.slice, ast.Constant) \
            and isinstance(x.node.slice.value, str) and id(x.node.slice) in x.in_to:
        ids.add(id(x.node.slice))
    return ids


def call_key_ids_of(x: KeyIdsIn) -> set[int]:
    """to_* 体内 get/setdefault/pop 首参(= 行键)的 id。"""
    ids: set[int] = set()
    node = x.node
    if not isinstance(node, ast.Call):
        return ids
    if isinstance(node.func, ast.Attribute) and node.func.attr in KEY_CALLS \
            and len(node.args) >= 1 and isinstance(node.args[0], ast.Constant) \
            and isinstance(node.args[0].value, str) and id(node.args[0]) in x.in_to:
        ids.add(id(node.args[0]))
    return ids


# =========================================================================
# 2. 基线管理(prune:只紧不松)
# =========================================================================


def check_shape() -> None:
    """跑一轮形制自查:硬红逐条打,基线外的新增软违规逐条打;有一条就 sys.exit(1)。

    退出码穿门(SystemExit 不被门的 except Exception 捕获),pre-push 靠它拦 push。
    """
    out = scan()
    known = read_baseline()
    fresh = missing_of(DiffIn(items=out.soft, known=known))
    for row in out.hard:
        say(HARD_ROW_TPL.format(row=row))
    for row in fresh:
        say(FRESH_ROW_TPL.format(row=row))
    fixed = missing_of(DiffIn(items=known, known=out.soft))
    if len(fixed) > 0:
        say(FIXED_TPL.format(n=len(fixed)))
    if len(out.hard) > 0 or len(fresh) > 0:
        sys.exit(1)
    say(PASS_TPL.format(n=len(out.soft)))


def prune_baseline() -> None:
    """把当前 soft 违规写成新基线(只许变小,收紧);有新增违规则拒绝写盘并 exit 1。
    批O 起基线归零后文件退役:soft 空 = 删账本,缺文件 = 零基线。"""
    out = scan()
    known = read_baseline()
    grown = missing_of(DiffIn(items=out.soft, known=known))
    if len(grown) > 0:
        say(PRUNE_REJECT_MSG)
        for row in grown:
            say(PRUNE_ROW_TPL.format(row=row))
        sys.exit(1)
    write_baseline(out.soft)
    say(PRUNE_OK_TPL.format(before=len(known), after=len(out.soft)))


def missing_of(x: DiffIn) -> list[str]:
    """items 里不在 known 里的条目(新增违规与已修存量同一形)。"""
    out: list[str] = []
    for item in x.items:
        if item not in x.known:
            out.append(item)
    return out


def read_baseline() -> list[str]:
    """读基线(② ③ 两条软规的存量册);批O 起缺文件 = 零基线(存量清零后账本退役)。"""
    if BASELINE.exists() is False:
        return []
    return json.loads(BASELINE.read_text(encoding=ENC_UTF8))


def write_baseline(soft: list[str]) -> None:
    """写基线(逐行可读,diff 友好);批O 起 soft 空 = 删账本,不留空 json 赖在域里。"""
    if len(soft) == 0:
        if BASELINE.exists():
            BASELINE.unlink()
        return
    BASELINE.write_text(json.dumps(soft, ensure_ascii=False, indent=BASELINE_INDENT),
                        encoding=ENC_UTF8)


# =========================================================================
# 3. 写法债报告(对齐 cms lint:report)
# =========================================================================


def report_ruff() -> None:
    """生成四段报告落 reports/,路径打给调用者。

    四段:① 闸视角(带 pyproject 豁免,守门态)② 裸账统计(--isolated 去掉全部豁免)
    ③ 已溶区余账(应只剩挂账的复杂度拆分债,多一条 = 新债漏网)④ 存量区 top 30 文件
    (= 下一批溶解地图)。每批溶解收口跑一次,数字只许降。
    """
    REPORTS_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime(STAMP_FMT)
    out_file = REPORTS_DIR / REPORT_NAME_TPL.format(stamp=stamp)
    gate_view = sh(list(RUFF_GATE_CMD)).strip()
    stats = bare([ARG_STATISTICS]).strip()
    full = bare([ARG_OUTPUT_FORMAT, VAL_CONCISE])
    per_file: dict[str, int] = {}
    diss_lines: list[str] = []
    for line in full.splitlines():
        if line.startswith(ETL_PREFIX) is False:
            continue
        norm = line.replace(BACKSLASH, SLASH)
        f = norm.split(COLON)[0]
        per_file[f] = per_file.get(f, 0) + 1
        if is_dissolved(norm):
            diss_lines.append(norm)
    top = sorted(per_file.items(), key=count_of, reverse=True)
    md = [MD_TITLE_TPL.format(stamp=stamp), "", MD_INTRO, MD_EXEMPT_NOTE,
          "", MD_SEC1, FENCE, gate_view, FENCE,
          "", MD_SEC2, FENCE, stats, FENCE,
          "", MD_SEC3_TPL.format(n=len(diss_lines)), FENCE]
    md.extend(diss_lines)
    md.extend([FENCE, "", MD_SEC4_TPL.format(n=TOP_N), "", MD_TABLE_HEAD, MD_TABLE_SEP])
    for f, n in top[:TOP_N]:
        md.append(MD_ROW_TPL.format(n=n, f=f))
    md.append("")
    out_file.write_text(NEWLINE.join(md), encoding=ENC_UTF8)
    say(str(out_file))


def sh(cmd: list[str]) -> str:
    """跑一条命令,合并 stdout/stderr 返回(报告是快照,错误文本也照收)。"""
    r = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True,
                       encoding=ENC_UTF8, errors=ERRORS_REPLACE)
    return (r.stdout or "") + (r.stderr or "")


def bare(extra: list[str]) -> str:
    """裸账视角跑 ruff(--isolated 去掉 pyproject 全部豁免)。"""
    return sh(list(RUFF_BARE_CMD) + extra)


def is_dissolved(norm: str) -> bool:
    """这条 ruff 违规行落在已溶区吗(五件形制已落地的文件面)。"""
    for d in DISSOLVED:
        if norm.startswith(d):
            return True
    return False


def count_of(kv: tuple[str, int]) -> int:
    """榜单排序键:违规条数。"""
    return kv[1]


# =========================================================================
# 4. 锁自查(build/jobbank 跨进程互斥的真件测试)
# =========================================================================


def run_lock_tests() -> None:
    """程序化跑锁自查用例集(用例住 scheme 的库垫片);有失败 → sys.exit(1) 穿门。"""
    suite = unittest.TestLoader().loadTestsFromTestCase(JobbankStoreLockTest)
    result = unittest.TextTestRunner(verbosity=LOCK_VERBOSITY).run(suite)
    if result.wasSuccessful() is False:
        sys.exit(1)
