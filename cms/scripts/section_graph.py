"""段图 —— 拆大文件之前,先量「边界在哪、有没有环」。

配套 scan_exports.py:那个回答「谁在用它」(跨文件),这个回答「文件内部谁依赖谁」(跨段)。
2026-08-18 出 lib/chat 拆分设计时落盘 —— chatOrchestrate.ts 3488 行 26 段,
靠肉眼划线只会照着噪音拆;实测出来的两个环(facts↔guards、answer↔guards)
全是 10 个词表/上限/文本小件造成的,把它们下沉一层,环当场消失。

────────────────────────────────────────────────────────────────────────────
用法:

    cd cms
    python scripts/section_graph.py src/lib/chatOrchestrate.ts /tmp/graph.json

    # 打印:每段多少行、声明几个名字;段与段之间的引用(调用方 → 被调方,权重=引用次数)
    # JSON:{sections:[{title,start,lines,names}], edges:[[调用方,被调方,次数]]}
    #
    # 拿到 JSON 之后自己按拟定的文件分组,把 edges 按组合并 —— 有双向边就是有环,
    # 顺着环上的名字看,多半是几个「不属于任何一层」的底料放错了地方。

判据(拆之前要能回答的三件):
    ① 每个拟定文件多少行、装几个名字 —— 太碎和太胖都不行
    ② 文件级依赖有没有环 —— 有环就说明边界划错了,不是「TS 能编译就行」
    ③ 层次深浅 —— 底层该是类型与词表,主流程该在最上面

前提与坑:
    · 只认 `// ── 标题 ──` 这种段横幅(本仓 CLAUDE.md 的分段约定)。没有横幅的文件量不了 ——
      那本身就是信号:连作者都没划过段,拆之前先补横幅。
    · 引用统计**先剥注释**,且排除 `X.name` 形式的成员访问 —— 同 scan_exports.py 的坑⑧,
      不剥的话注释里提一句就算一次依赖,图会糊。
    · 只看顶层声明(`^(export )?(const|function|type|…) 名字`)。段内嵌套的局部名不计,
      它们本来也跨不了段。
"""
import re
import sys
import json
import pathlib
import collections

SRC = pathlib.Path(sys.argv[1])
OUT = sys.argv[2] if len(sys.argv) > 2 else None

lines = SRC.read_text(encoding='utf-8').split('\n')

BANNER = re.compile(r'^// ── (.+?)\s*[─]*\s*$')
DECL = re.compile(r'^(?:export\s+)?(?:declare\s+)?(?:async\s+)?'
                  r'(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)')
COMMENT = re.compile(r'/\*.*?\*/|(?<!:)//[^\n]*', re.S)

# ── 1 · 按横幅切段 ──────────────────────────────────────────────────────────
marks = [(i, BANNER.match(l).group(1)) for i, l in enumerate(lines) if BANNER.match(l)]
if not marks:
    sys.exit(f'{SRC.name} 里没有 `// ── … ──` 段横幅 —— 先分段再谈拆。')
sections = []
for k, (i, title) in enumerate(marks):
    end = marks[k + 1][0] if k + 1 < len(marks) else len(lines)
    sections.append({'title': title, 'start': i, 'lines': end - i, 'end': end})

# ── 2 · 每段声明了什么 ──────────────────────────────────────────────────────
owner = {}
for s in sections:
    s['names'] = [m.group(1) for m in (DECL.match(l) for l in lines[s['start']:s['end']]) if m]
    for n in s['names']:
        owner[n] = s['title']

# ── 3 · 段与段之间的引用 ────────────────────────────────────────────────────
edges = collections.Counter()
for s in sections:
    body = COMMENT.sub('', '\n'.join(lines[s['start']:s['end']]))
    for n in set(re.findall(r'(?<![.\w$])([A-Za-z_$][\w$]*)', body)):
        home = owner.get(n)
        if home and home != s['title']:
            edges[(s['title'], home)] += 1

print(f'{SRC.name}: {len(lines)} 行 / {len(sections)} 段\n')
for s in sections:
    print(f"{s['lines']:5d} 行  {len(s['names']):3d} 名  {s['title'][:56]}")
print('\n── 段间引用(调用方 → 被调方) ──')
for (a, b), n in edges.most_common():
    print(f'  {a[:36]:36} → {b[:36]:36} {n}')

if OUT:
    json.dump({'sections': [{k: v for k, v in s.items() if k != 'end'} for s in sections],
               'edges': [[a, b, n] for (a, b), n in edges.items()]},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'\ndetail -> {OUT}')
