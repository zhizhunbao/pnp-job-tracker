"""渲染差异比对 —— 重构改动「渲染零变化」的验收工具。

三轮都在用同一套手法(08-17 CSS 迁移 380 处、08-17 Grid/Facts 拆分、08-18 样式对象退役),
每轮现搭一遍、每轮重踩同样的坑,所以 2026-08-18 收进仓库。

手法:同一段探针在两个版本上各跑一遍 → 每个元素取 45 条计算属性 → FNV 哈希 → 比哈希串。
比截图可靠且便宜:截图会被字体渲染、动画相位、DPR 干扰,计算属性不会。

────────────────────────────────────────────────────────────────────────────
用法(A/B 是「同一个 dev、改动前后各一遍」,不是「本地 vs 生产」):

    cd cms && npm run dev                                  # 只准起一个实例

    python scripts/render_diff.py snap after.json  / 1440
    git stash push -- src                                  # 退回改动前
    python scripts/render_diff.py snap before.json / 1440
    git stash pop
    python scripts/render_diff.py cmp before.json after.json

多覆盖几个面就多跑几遍(视口 375 与 1440 各一次;/employers、/news、/jobs/<id> 等)。

────────────────────────────────────────────────────────────────────────────
🔴 踩过的坑,别再踩:

1. **基线不是生产。** 先 `git rev-list --count origin/main..HEAD` 问清楚本地领先多少。
   2026-08-18 那轮生产落后 5 个提交,拿它当基线毫无意义(元素数 1 vs 219)。

2. **选择器不能用新类名。** 改动前那些类根本不存在,两边元素集对不上。
   A/B 探针的选择器必须是**两边都成立的结构选择器**(SEL 那串就是)。

3. **只有几何差、计算样式全同 = 测量假象,先打 devicePixelRatio。**
   本地 DPR 1 / 生产标签页重载后漂成 1.5,差值是 0.667 的整数倍,四舍五入也救不了。
   本脚本固定 device_scale_factor=1 并把 DPR 记进快照,对不上会自己喊。

4. **先自己比自己,再比前后。** 有动画/轮播/内容轮换的页面(如 /news)两次跑就有差异。
   同一份代码连跑两遍,差异一模一样、哈希来回互换 = 时序假象,不是回归。

────────────────────────────────────────────────────────────────────────────
⚠️ 为什么没有「弹框模式」:试过,做不成。

弹框(地点顾问/公司/JD)的内容是**实时 fetch** 的(公司档、顾问事实),冷热缓存不同、
外部调用快慢不同 —— 实测**同一份代码、点同一格,两次跑元素数 30 vs 137**。
钉死点哪一格、等 networkidle、等「元素数不再变」三招都试过,都稳不住。
自己都不稳的探针,报「全绿」和报「不可比」一样不能信,所以不收进来。

要验弹框里的组件,走**职位详情页** `/jobs/<id>` —— 同一批组件、内容是服务端渲好的,
这条路是确定的(2026-08-18 那轮实测 96/96 全等)。
"""
import sys
import json
import asyncio

from playwright.async_api import async_playwright

BASE = 'http://localhost:3000'

# 45 条:凡是「类压不过内联」「类套宽了」会改到的,都在这儿
PROPS = [
    'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color',
    'border-left-color', 'border-top-width', 'border-right-width', 'border-bottom-width',
    'border-left-width', 'border-top-left-radius', 'border-top-right-radius',
    'border-bottom-left-radius', 'border-bottom-right-radius', 'color', 'font-size',
    'font-weight', 'font-family', 'line-height', 'letter-spacing', 'text-decoration-line',
    'text-align', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'display', 'position',
    'box-sizing', 'overflow-x', 'overflow-y', 'white-space', 'opacity', 'cursor', 'width',
    'height', 'flex-grow', 'flex-shrink', 'flex-basis', 'gap', 'align-items', 'justify-content',
]

# 纯结构,改动前后都成立(见坑 2)
SEL = ('div, span, a, button, input, select, label, section, article, aside, '
       'h1, h2, h3, li, td, th')

JS = """([props, sel]) => {
  const fnv = (s) => { let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
    return h.toString(16).padStart(8, '0') };
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    out.push([el.tagName.toLowerCase(), (el.textContent || '').trim().slice(0, 26),
              fnv(props.map((p) => cs.getPropertyValue(p)).join('|')),
              Math.round(r.width) + 'x' + Math.round(r.height)]);
  }
  return out;
}"""


async def snap(out_path, path, width):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        ctx = await browser.new_context(device_scale_factor=1,          # 见坑 3
                                        viewport={'width': width, 'height': 900})
        page = await ctx.new_page()
        await page.goto(BASE + path, wait_until='networkidle', timeout=90000)
        await page.wait_for_timeout(2500)
        dpr = await page.evaluate('() => devicePixelRatio')
        rows = await page.evaluate(JS, [PROPS, SEL])
        await browser.close()

    json.dump({'dpr': dpr, 'path': path, 'width': width, 'rows': rows},
              open(out_path, 'w', encoding='utf-8'))
    print(f"{path} @{width}  DPR {dpr}  {len(rows)} 个元素 → {out_path}")


def cmp(a_path, b_path):
    a = json.load(open(a_path, encoding='utf-8'))
    b = json.load(open(b_path, encoding='utf-8'))
    if (a['path'], a['width']) != (b['path'], b['width']):
        print(f"⚠️ 比的不是同一个面:{a['path']}@{a['width']} vs {b['path']}@{b['width']}")
    if a['dpr'] != b['dpr']:
        print(f"⚠️ DPR 不同({a['dpr']} vs {b['dpr']}):几何差全是假象,先对齐再比(坑 3)")

    x, y = a['rows'], b['rows']
    if len(x) != len(y):
        print(f"元素数 {len(x)} vs {len(y)} —— 不可比。"
              f"选择器用了只有一边才有的类名?还是 DOM 结构真变了?(坑 2)")
        return
    sd = [i for i, (p, q) in enumerate(zip(x, y)) if p[2] != q[2]]
    bd = [i for i, (p, q) in enumerate(zip(x, y)) if p[3] != q[3]]
    print(f"{a['path']}@{a['width']}:计算样式 {len(x) - len(sd)}/{len(x)}  "
          f"几何 {len(x) - len(bd)}/{len(x)}" + ('  全绿' if not sd and not bd else ''))
    for i in sd[:10]:
        print(f"    <{x[i][0]}>「{x[i][1][:22]}」 {x[i][2]}→{y[i][2]}  盒 {x[i][3]} vs {y[i][3]}")
    if sd or bd:
        print("\n有差异 → 先用同一份代码连跑两遍自己比自己(坑 4):"
              "差异一模一样 = 时序假象;差异不同 = 真回归。")


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in ('snap', 'cmp'):
        print(__doc__)
        sys.exit(1)
    if sys.argv[1] == 'snap':
        asyncio.run(snap(sys.argv[2], sys.argv[3], int(sys.argv[4])))
    else:
        cmp(sys.argv[2], sys.argv[3])
