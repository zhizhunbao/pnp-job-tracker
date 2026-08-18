"""导出消费面扫描 —— 「过度导出」清理的取数工具。

判据在 CLAUDE.md:**只有一个消费者的东西不该导出,更不该住进共享叶子。**
这个脚本回答「谁在用它」,不回答「该不该删」——后者要人逐条看。

2026-08-18 收进仓库:03 号清单当时用的是**粗口径名字 grep**(「这个名字在别的文件出现过」),
它自己写着「要精确得按 import 语句解析,那是动手前的事」。这就是那个精确版。
初版连踩四个坑(见文末),每个都会把**在用的**算成死代码 —— 所以落盘,别再现搭。

────────────────────────────────────────────────────────────────────────────
用法:

    cd cms
    python scripts/scan_exports.py src /tmp/exports.json

    # 明细 JSON 每行一个导出:{file, name, consumers, local, barrel_only, by}
    #   consumers  = 有几个**别的文件**真的 import 了它(按 import 语句解析,非名字 grep)
    #   local      = 它在**自己文件里**还被用几次
    #   by         = 那几个消费者是谁

分档与处置(consumers==0 的两种,处置完全不同):

    consumers==0 && local>0   →  去掉 export,代码不删。零风险,tsc 全程绿。
    consumers==0 && local==0  →  真死代码候选。**逐条要人核**,别批量删 ——
                                 里头混着「功能悄悄失效」的痕迹(免费额度常量没人引 =
                                 那段逻辑可能已经不跑了),那是 bug 不是清理。
    consumers==1              →  看它住哪:住共享叶子(ui/、lib/ 顶层)→ 搬回唯一消费者;
                                 住自己领域 → 只去 export,不搬家。
    barrel_only               →  只有桶在转发。多半**设计如此**(pathways 的通道常量
                                 必须导出,index.ts 才装得进 PATHWAYS 数组),基本不动。

────────────────────────────────────────────────────────────────────────────
🔴 八个坑(全踩过;⑤⑥⑦ 是 08-18 动手那天被 tsc 抓出来的,⑧ 是同一天被 eslint 抓出来的):

① **SRC 必须是绝对路径。** 下面 resolve() 对相对 import 用了 .resolve()(返回绝对),
   若 SRC 是相对的,导出表的键(相对)与解析结果(绝对)永远对不上 →
   **所有 `./x` 形式的 import 被整体丢弃**。实测:零消费者从 187 虚报到 612。

② **不能用 with_suffix 补扩展名。** 它替换**最后一段**后缀,
   `./colWidths.shared` 会变成 `colWidths.ts` —— 而那个文件真实存在,
   于是静默解析到**错的文件**上,不报错。本仓 `.shared.ts` / `.server.ts` 一堆。

③ **tests/ 在 cms/tests,不在 src 下。** 不显式加进消费面,
   只被测试引用的导出全部误判成死代码(实测 6 个)。

④ **桶转发不是声明。** `export {...} from '...'` 记成 index.ts 自己的导出,
   会把叶子文件的名字在桶上再算一遍(而桶自己当然没人从它这儿单独引)。

⑤ **SKIP_DIRS 只管导出侧,不许管消费侧。** collections/*.ts 是 Payload 的 schema,
   它们的**导出**是框架约定(不统计),但它们的 **import 照样算数** ——
   两边共用一个 keep() 时,只被 collection 引用的常量全成死代码(实测 4 个:
   SAVED_JOBS_CAP / FREE_SAVED_SEARCHES / PRO_SAVED_SEARCHES,以及 database.getDb)。

⑥ **DYN 的内层不能是 `[^}]*`。** 那样外层函数的 `{` 会当起点把整段吞掉,
   嵌套块里的**第一个**解构动态 import 于是解析不出名字。恶心在**同一个文件只错一半** ——
   instrumentation.ts 第 8 行的 getDb 丢了,第 9 行的 getTopNocsCached 因为从新位置重新起手反而对。

⑦ **next/dynamic 的取名形态** `import('./X').then((m) => m.Y)` 要单独一条。
   .tsx 那轮会大量踩到(ChatBox、AuthModal 都是这么加载的)。

⑧ **local 计数要剥注释、要拒成员访问。** 前七个坑都让「在用的」变成「死的」,这个反过来 ——
   注释里提一句(database.ts「要兜底的用 dbOrNull」)、或 `SQL.JOB_COLUMNS` 被 `\b` 吃掉后半截,
   都会让**已经没人用的**看着还活着,于是混进「零风险」那批(实测 2 个:dbOrNull / withTransaction)。
   tsc 抓不到 —— 去掉 export 它照样绿;要 eslint 的 unused 才亮。

⚠️ 验收方法(别拿 grep 验 grep):抽样后逐条**跨行**复核 ——
   多行 import 逐行 grep 抓不到;而全文 grep 又会把**同名不同模块**的算成一个
   (本仓有两个 `OccRow`、两个 `DrawRow`、两个 `PROV_NAMES`)。
   最后一版:83 个抽检样本 0 误判。
"""
import re, json, pathlib, collections, sys

# 坑①:必须 resolve 成绝对路径,否则相对 import 全部丢失
SRC = pathlib.Path(sys.argv[1]).resolve()

SKIP_FILES = {'payload-types.ts', 'payload-generated-schema.ts'}
SKIP_DIRS = {'collections', 'migrations'}
# 框架按名字调用、没有 import 的约定导出 —— 不算过度导出。
# middleware / register / generateSitemaps 是初版漏掉的三个,它们被误列进「真死代码」。
CONVENTION = {
    'default', 'metadata', 'generateMetadata', 'generateStaticParams', 'generateViewport',
    'generateSitemaps', 'viewport', 'revalidate', 'dynamic', 'runtime', 'fetchCache',
    'preferredRegion', 'maxDuration', 'dynamicParams', 'alt', 'size', 'contentType', 'config',
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS',
    'middleware', 'register',
}


def keep(p):
    if p.name in SKIP_FILES:
        return False
    return not (set(p.relative_to(SRC).parts[:-1]) & SKIP_DIRS)


def rel(p):
    try:
        return p.relative_to(SRC).as_posix()
    except ValueError:
        return p.relative_to(SRC.parent).as_posix()


ts_files = [p for p in SRC.rglob('*.ts') if keep(p)]
# 坑③:tests/ 在 src 之外,不加进来则只被测试引用的导出全被误判成死代码
TESTS = SRC.parent / 'tests'
# 坑⑤:消费面不许套 keep() —— SKIP_DIRS 是「谁的导出不统计」,不是「谁的 import 不算数」。
# collections/*.ts 照样 import lib/,挡掉它们 = 只被 collection 引用的常量全成死代码(实测 4 个)。
all_files = (list(SRC.rglob('*.ts')) + list(SRC.rglob('*.tsx'))
             + (list(TESTS.rglob('*.ts')) + list(TESTS.rglob('*.tsx')) if TESTS.exists() else []))

# ── 1 · 收导出 ───────────────────────────────────────────────────────────────
DECL = re.compile(
    r'^export\s+(?:declare\s+)?(?:async\s+)?'
    r'(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)', re.M)
# 坑④:只吃「本文件声明的」。`export {...} from '...'` 是转发不是声明。
LIST = re.compile(r'^export\s+(?:type\s+)?\{([^}]*)\}\s*(?!\s*from)', re.M)

exports = set()
for p in ts_files:
    src = p.read_text(encoding='utf-8', errors='ignore')
    names = set(DECL.findall(src))
    for blk in LIST.findall(src):
        for raw in blk.split(','):
            s = raw.strip()
            if not s:
                continue
            if ' as ' in s:
                s = s.split(' as ')[-1].strip()
            names.add(s.replace('type ', '').strip())
    for n in names:
        if n and n not in CONVENTION:
            exports.add((p, n))

# ── 2 · 收 import,解析到具体文件 ─────────────────────────────────────────────
IMP = re.compile(
    r"import\s+(?:type\s+)?(?:\{([^}]*)\}|\*\s+as\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*))?"
    r"\s*(?:,\s*\{([^}]*)\})?\s*from\s*['\"]([^'\"]+)['\"]")
REEXP = re.compile(r"export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['\"]([^'\"]+)['\"]")
# 坑⑥:内层必须是 [^{}]* —— 用 [^}]* 时,外层函数的 `{` 会当起点把整段吞进来,
# 于是嵌套块里的**第一个**解构动态 import 解析不出名字(instrumentation.ts 的 getDb 就这么丢的,
# 而它下一行的 getTopNocsCached 因为从新位置重新起手反而对了 —— 这种「同一文件对一半」最难看出来)。
DYN = re.compile(r"\{([^{}]*)\}\s*=\s*await\s+import\s*\(['\"]([^'\"]+)['\"]\)")
# 坑⑦:next/dynamic 的取名形态 —— import('./X').then((m) => m.Y)。.tsx 那轮会大量踩到。
THEN = re.compile(r"import\s*\(['\"]([^'\"]+)['\"]\)\s*\.\s*then\s*\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*(\w+)\.(\w+)")


def resolve(spec, frm):
    if spec.startswith('@/'):
        base = SRC / spec[2:]
    elif spec.startswith('.'):
        base = (frm.parent / spec).resolve()
    else:
        return None
    # 坑②:不能用 with_suffix —— './colWidths.shared' 会被它变成 'colWidths.ts'
    for cand in (pathlib.Path(str(base) + '.ts'), pathlib.Path(str(base) + '.tsx'),
                 base / 'index.ts', base / 'index.tsx'):
        if cand.exists():
            return cand
    return None


consumers = collections.defaultdict(set)
barrel_only = collections.defaultdict(set)

for p in all_files:
    src = p.read_text(encoding='utf-8', errors='ignore')
    for m in IMP.finditer(src):
        named = (m.group(1) or '') + ',' + (m.group(4) or '')
        ns, spec = m.group(2), m.group(5)
        tgt = resolve(spec, p)
        if not tgt or tgt == p:
            continue
        for raw in named.split(','):
            s = raw.strip().split(' as ')[0].strip().replace('type ', '').strip()
            if s:
                consumers[(tgt, s)].add(p)
        if ns:  # import * as NS —— 按 NS.name 的实际点用计数,不算全量消费
            for hit in set(re.findall(r'\b' + re.escape(ns) + r'\.([A-Za-z_$][\w$]*)', src)):
                consumers[(tgt, hit)].add(p)
    for spec, _p, _o, name in THEN.findall(src):  # dynamic(() => import('./X').then(m => m.Y))
        tgt = resolve(spec, p)
        if tgt and tgt != p:
            consumers[(tgt, name)].add(p)
    for names_, spec in DYN.findall(src):  # const { X } = await import('...')
        tgt = resolve(spec, p)
        if tgt:
            for raw in names_.split(','):
                s = raw.strip().split(':')[0].strip()
                if s:
                    consumers[(tgt, s)].add(p)
    for blk, spec in REEXP.findall(src):  # 桶转发:算消费,但单独标记
        tgt = resolve(spec, p)
        if not tgt:
            continue
        for raw in blk.split(','):
            s = raw.strip().split(' as ')[0].strip().replace('type ', '').strip()
            if s:
                consumers[(tgt, s)].add(p)
                barrel_only[(tgt, s)].add(p)

# ── 3 · 分档 ────────────────────────────────────────────────────────────────
cache = {}


# 坑⑧:算「本文件还用不用它」必须先剥注释、且不认 `X.name` 的成员访问。
COMMENT = re.compile(r'/\*.*?\*/|(?<!:)//[^\n]*', re.S)


def local_uses(p, n):
    if p not in cache:
        cache[p] = COMMENT.sub('', p.read_text(encoding='utf-8', errors='ignore'))
    return len(re.findall(r'(?<![.\w$])' + re.escape(n) + r'\b', cache[p])) - 1


rows = []
for (p, n) in sorted(exports, key=lambda x: (rel(x[0]), x[1])):
    cs = consumers.get((p, n), set())
    bo = barrel_only.get((p, n), set())
    rows.append({
        'file': rel(p), 'name': n,
        'consumers': len(cs), 'local': local_uses(p, n),
        'barrel_only': len(cs) > 0 and cs == bo,
        'by': sorted(rel(c) for c in cs),
    })

zero = [r for r in rows if r['consumers'] == 0]
one = [r for r in rows if r['consumers'] == 1]
bonly = [r for r in rows if r['barrel_only']]
out = [
    'scanned .ts %d files; consumer side incl .tsx and tests/: %d' % (len(ts_files), len(all_files)),
    'exports total %d' % len(rows),
    '  zero consumer %d  (still used locally %d -> drop export; truly dead %d -> review one by one)'
    % (len(zero), sum(1 for r in zero if r['local'] > 0), sum(1 for r in zero if r['local'] == 0)),
    '  exactly 1 consumer %d' % len(one),
    '  barrel-forward only %d' % len(bonly),
    '  2+ consumers %d' % (len(rows) - len(zero) - len(one)),
]
# Windows 控制台默认 cp1252,中文 print 会 UnicodeEncodeError —— 摘要一律 ASCII
print('\n'.join(out))
pathlib.Path(sys.argv[2]).write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
print('detail -> %s' % sys.argv[2])
