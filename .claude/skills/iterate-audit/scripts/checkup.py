# 无截图体检(docs/design/无截图体检-20260726.md 第 3-4 节)——走查提速:用 DOM 量出可疑项,
# 只对命中项截图确认。全程不截图,输出 JSON + 终端摘要(只打命中,不打通过项 = 省 token 第二刀)。
#
# 用法(系统 Python312,playwright 只装在那儿;PYTHONUTF8=1 必加):
#   python .claude/skills/iterate-audit/scripts/checkup.py --round 25 --out <scratchpad>/checkup-25.json
#   可选 --quick 只跑中文桌面 + 中文手机(冒烟);--no-login 跳过测试号段;
#   --only jobs,pricing 只体检指定模块(模块名见下方 MODULES,全量 ~7min → 单模块 1-2min)。
#
# 覆盖:两视口(375×812 / 1440×900)× 三语(zh/en/ko,非中文跑精简页集)× 匿名态 + 测试号。
# 检查项编号对齐设计文档 4 节:1 裸词 / 2 三语残留 / 3 重复 / 4 占位符 / 5 折行截断 / 6 出屏
#   / 7 重叠 / 8 触控目标 / 9 手型一致 / 10 死链 / 11 数字对库 / 12 空态 / 13 console / 14 network+LCP。
import sys, io, json, re, time, argparse, traceback
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from playwright.sync_api import sync_playwright

BASE = "https://offer2pr.com"
CRED = json.loads((Path(__file__).parent.parent / "credentials.local.json").read_text("utf-8"))

ap = argparse.ArgumentParser()
ap.add_argument("--round", default="x")
ap.add_argument("--out", required=True)
ap.add_argument("--quick", action="store_true")
ap.add_argument("--no-login", action="store_true")
ap.add_argument("--only", default="", help="只体检指定模块(逗号分隔),不传=全跑;模块名见 MODULES")
A = ap.parse_args()
OUT = Path(A.out); OUT.parent.mkdir(parents=True, exist_ok=True)

# 模块 → 该模块下的页面/弹框名(名字对齐 FULL/LITE 与弹框段的 name)。
# 每轮往往只动一两个页面,全量 ~7 分钟里绝大部分是白跑 —— `--only jobs` 降到 1-2 分钟。
MODULES = {
    "jobs":     {"jobs", "immig-modal", "jd-modal", "match-view"},
    "pricing":  {"pricing"},
    "stats":    {"stats-index", "stats-province", "stats-compare"},
    "rankings": {"rank-weekly", "rank-sponsor", "rank-daily"},
    "news":     {"news"},
    "pathways": {"pathways"},
    "plan":     {"plan-pr"},   # SurveyJS 表单是客户端渲染,visit() 里给它多等 2s
    "account":  {"account", "match-view"},
}
WANT = None
if A.only.strip():
    mods = [m.strip() for m in A.only.replace("，", ",").split(",") if m.strip()]
    bad = [m for m in mods if m not in MODULES]
    if bad:
        sys.exit("未知模块 %s;可选:%s" % (", ".join(bad), " / ".join(MODULES)))
    WANT = set().union(*(MODULES[m] for m in mods))
    print("== --only %s → 只体检 %s ==" % (",".join(mods), ", ".join(sorted(WANT))))

def wanted(name):
    return WANT is None or name in WANT

# ============ 注入的体检 JS(单函数,返回 {hits, counts, facts, stats}) ============
# 剪枝:同一父节点超 20 个同构子节点(20000 行 SSR 表格 / 手机卡片流)只体检前 10 个,
# 否则 querySelectorAll('*') + getBoundingClientRect 在 /jobs 上要几十秒。
JS = r"""
(opts) => {
  const { lang, mobile, scope } = opts;
  const HITS = [], counts = {}, MAXPER = 8;
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const HAN = /[㐀-鿿]/;
  const sel = el => {
    if (!el || !el.tagName) return '';
    const parts = []; let n = el;
    for (let i = 0; i < 3 && n && n.tagName; i++) {
      let s = n.tagName.toLowerCase();
      if (n.id) s += '#' + n.id;
      else if (typeof n.className === 'string' && n.className.trim())
        s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.');
      parts.unshift(s); n = n.parentElement;
    }
    return parts.join('>');
  };
  const add = (rule, el, text, extra) => {
    counts[rule] = (counts[rule] || 0) + 1;
    if (counts[rule] > MAXPER) return;
    HITS.push(Object.assign({ rule, sel: sel(el), text: norm(text).slice(0, 110) }, extra || {}));
  };
  const visible = el => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const st = getComputedStyle(el);
    return st.visibility !== 'hidden' && st.display !== 'none' && st.opacity !== '0';
  };
  // 体检范围:整页 或 最上层弹框
  let root = document.body;
  if (scope === 'modal') {
    const cands = [...document.querySelectorAll('div')].filter(d => {
      const st = getComputedStyle(d);
      return (st.position === 'fixed' || st.position === 'absolute') && d.offsetHeight > 200 && d.offsetWidth > 200;
    });
    if (cands.length) root = cands[cands.length - 1]; else return { hits: [], counts: {}, facts: {}, stats: { noModal: true } };
  }
  // 元素收集(带剪枝)
  const all = [];
  // SVG 内部元素 tagName 是小写(circle/path),首轮 176 条「重叠」假阳性全出在图标 svg 里 → 统一大写再判
  const SKIP = /^(SCRIPT|STYLE|SVG|PATH|CIRCLE|RECT|LINE|POLYLINE|POLYGON|G|DEFS|NOSCRIPT|BR|HEAD|LINK|META)$/;
  const walk = (el, depth) => {
    if (all.length > 6000 || depth > 40) return;
    const kids = [...el.children];
    const list = kids.length > 20 ? kids.slice(0, 10) : kids;
    for (const k of list) {
      if (SKIP.test(String(k.tagName).toUpperCase())) continue;
      if (visible(k)) { all.push(k); walk(k, depth + 1); }
    }
  };
  walk(root, 0);
  const textOf = el => { let t = ''; for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent; return norm(t); };
  const leaves = all.filter(el => textOf(el).length > 0);
  const isSwitcher = (el, t) => !!el.closest('header') && /^(中|EN|한|EN\/中|中文)$/.test(t);

  // ---- 1 裸词 / 黑话 ----
  for (const el of leaves) {
    const t = textOf(el);
    if (/(^|[\s(（|、])[0-5]\s*\/\s*5([\s)）|、]|$)/.test(t)) add('R1裸档X/5', el, t);
    if (/^(高|中|低)$/.test(t) && !isSwitcher(el, t)) add('R1裸字高中低', el, t);
    if (/^(NOC\s*)?\d{5}$/.test(t)) add('R1NOC码无职业名', el, t);
    // 硬规矩(no-dot-separator):禁「·」「/」杂糅多信息(搜索占位符「职位/公司/地点/NOC」是首轮肉眼补抓的)。
    // 只管短标签:免责声明这类整句里的「移民/法律建议」是「或」的意思,不是枚举杂糅(首轮 37 条里 30 条是它)
    if (t.length <= 30 && !/[。;;,,]/.test(t) && /[一-鿿]\s*[·/]\s*[一-鿿]/.test(t)) add('R1斜杠点号杂糅', el, t);
    if (/TEER/.test(t)) {
      // 第 27 轮豁免(#214 核销):Frank 拍板卡面保留 TEER 码,口径挂 title、chip 可点开分类弹框看说明 ——
      // 「带 title」或「可点」即视为有注,不再当裸术语报(否则每轮 35 条常驻噪音)。
      const ctx = norm(el.parentElement ? el.parentElement.innerText : t);
      const annotated = el.title || el.getAttribute('aria-label') || getComputedStyle(el).cursor === 'pointer';
      if (!annotated && !/技能|等级|说明|门槛|类别|skill|level|교육|숙련/i.test(ctx)) add('R1TEER无注', el, t);
    }
  }
  // 属性里的文案也算 UI 文案(placeholder/title/aria-label 不是文本节点,首轮漏了搜索框占位符)
  for (const el of all) {
    for (const at of ['placeholder', 'title', 'aria-label']) {
      const v = norm(el.getAttribute && el.getAttribute(at));
      if (!v) continue;
      if (v.length <= 30 && !/[。;;,,]/.test(v) && /[一-鿿]\s*[·/]\s*[一-鿿]/.test(v)) add('R1斜杠点号杂糅(属性)', el, at + '=' + v);
      if (lang !== 'zh' && HAN.test(v)) add('R2汉字残留(属性)', el, at + '=' + v);
    }
  }
  // ---- 2 三语缺键回退(非中文界面出现汉字)----
  if (lang !== 'zh') for (const el of leaves) {
    const t = textOf(el);
    if (HAN.test(t) && !isSwitcher(el, t)) add('R2汉字残留', el, t);
  }
  // ---- 3 废话与重复 ----
  const bigr = s => { const set = new Set(); for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2)); return set; };
  const jac = (a, b) => { const A = bigr(a), B = bigr(b); let x = 0; for (const g of A) if (B.has(g)) x++; return x / (A.size + B.size - x || 1); };
  const listy = el => !!el.closest('table, ul, ol, [class*=Cards], [class*=cards], [class*=list], [class*=List]');
  for (const el of all) {
    if (listy(el)) continue;
    const kids = [...el.children].filter(visible);
    if (kids.length < 2 || kids.length > 6) continue;
    const ts = kids.map(k => norm(k.innerText)).filter(s => s.length >= 10);
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++)
      if (jac(ts[i], ts[j]) > 0.8) add('R3容器内近似重复', el, ts[i] + ' ⟂ ' + ts[j]);
  }
  // 同页事实重复:同一 sel 路径的重复 = 同一列表里的同构标签(新闻卡的省名/来源名),不算;
  // 只报「同一句话出现在两处不同结构」——那才是头版与列表、卡片与摘要说了两遍。
  const seen = new Map();
  for (const el of leaves) {
    if (listy(el)) continue;
    const t = textOf(el);
    if (t.length < 12) continue;
    const s = sel(el);
    // 第 28 轮:①一处在弹框、一处在被它盖住的页面 → 用户同时看不到,不算重复;
    // ②页签名与当前榜标题同名 = 「你在哪一榜」的定位(第 26 轮已拍板保留)
    const inModal = !!el.closest('[class*=eq], [role=dialog]');
    const isTab = !!el.closest('[class*=Tabs], [class*=tabs]');
    if (seen.has(t)) { if (seen.get(t) !== s && !inModal && !isTab) { add('R3同页事实重复', el, t, { other: seen.get(t) }); seen.set(t, s); } }
    else seen.set(t, s);
  }
  // ---- 4 占位符泄漏 ----
  for (const el of leaves) {
    const t = textOf(el);
    if (/undefined|NaN|\[object|\{\{|^null$|,\s*null|Infinity|\$\{/.test(t)) add('R4占位符泄漏', el, t);
  }
  // 手机端表格 attached 但不可见(卡片流),不过滤会把 14 个空格当「空态连片」报——必须 visible 才算
  for (const tr of [...root.querySelectorAll('tbody tr')].filter(visible).slice(0, 10)) {
    const cells = [...tr.children].map(td => norm(td.innerText));
    let run = 0, max = 0;
    for (const c of cells) { if (c === '—' || c === '-' || c === '') { run++; max = Math.max(max, run); } else run = 0; }
    // 第 27 轮修:整行全空多半是扫到了渲染中途的骨架行(匹配视图实测 50 行零空行却报 8 条)——
    // 整行都空不算「空态连片」,只报「有内容的行里连着 4 格空」。
    if (max >= 4 && cells.some(c => c && c !== '—' && c !== '-')) add('R4空态连片', tr, cells.join('|'), { run: max });
  }
  // ---- 5 折行 / 截断 ----
  const CHIPY = 'button,a,th,td,label,option,h1,h2,h3,[role=button],[class*=chip],[class*=Chip],[class*=badge],[class*=Badge],[class*=tag],[class*=Tag],[class*=pill]';
  for (const el of all) {
    if (!el.matches(CHIPY)) continue;
    const t = norm(el.innerText); if (!t) continue;
    const st = getComputedStyle(el);
    // 第 27 轮修:overflow 为 visible 时内容照样画得出来(只是盒子比内容窄)——不是截断。
    // 只有 hidden/clip(通常配 text-overflow:ellipsis)才是真的看不全。
    if (el.scrollWidth > el.clientWidth + 2 && /hidden|clip/.test(st.overflowX))
      add('R5截断', el, t, { sw: el.scrollWidth, cw: el.clientWidth });
    // 折行判定用 Range 的行盒数,不用高度阈值(td 的上下 padding 会把高度撑过 lineHeight,首轮假阳性全出在这);
    // 数据表格单元格(长英文职位名/公司名)天然要折,Frank 的「不折行」铁律管的是标签与按钮 → td/th 免检
    if (st.whiteSpace !== 'nowrap' && el.children.length === 0 && !el.matches('td,th') && !el.closest('td,th')) {
      // 行数 = 不同 top 的行盒数,不是 rect 数:中英混排(购买 30 天 CA$19)一行也会拆出 2-3 个 rect,
      // 首轮 60 条「折行」几乎全栽在这里(元素截图复核:按钮实际就一行)
      const rg = document.createRange(); rg.selectNodeContents(el);
      const tops = new Set([...rg.getClientRects()].filter(r => r.height > 1 && r.width > 1).map(r => Math.round(r.top / 3)));
      if (tops.size > 1) add('R5折行', el, t, { lines: tops.size });
    }
  }
  // ---- 6 出屏 / 横向滚动 ----
  const W = window.innerWidth;
  if (document.documentElement.scrollWidth > W + 1)
    add('R6横向滚动', document.documentElement, 'scrollWidth=' + document.documentElement.scrollWidth + ' vw=' + W);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width < 1) continue;
    if (r.right > W + 2 || r.left < -2) {
      let p = el.parentElement, clipped = false;
      while (p && p !== document.body) { if (/auto|scroll|hidden/.test(getComputedStyle(p).overflowX)) { clipped = true; break; } p = p.parentElement; }
      if (!clipped) add('R6出屏', el, norm(el.innerText), { left: Math.round(r.left), right: Math.round(r.right), vw: W });
    }
  }
  // ---- 7 元素重叠 ----
  for (const el of all) {
    const kids = [...el.children].filter(k => {
      const st = getComputedStyle(k);
      // colgroup/col 是表格布局元素(无可视盒),与 thead/tbody 必然相交 —— 第 27 轮加百分比列宽后开始误报
      if (k.matches('colgroup,col')) return false;
      return visible(k) && st.position !== 'absolute' && st.position !== 'fixed' && st.float === 'none';
    });
    if (kids.length < 2 || kids.length > 20) continue;
    // 行内元素折行时 boundingRect 会横跨整块,与同行的兄弟(如「#20」+ 折行的职业名)假相交 ——
    // 多行盒的行内元素直接跳过(第 26 轮实拍复核:卡片版式其实好好的)
    if (kids.some(k => !/^(block|flex|grid|list-item|table)/.test(getComputedStyle(k).display) && k.getClientRects().length > 1)) continue;
    // 第 27 轮再调:上面那条「多行盒整跳」漏判了「单行 span + 多行 a」的组合(#213 就是这么误报的)。
    // 改成**逐行 rect 两两比**(getClientRects 给的是每一行的盒),行与行之间不再假相交。
    const rects = kids.map(k => [...k.getClientRects()]);
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      let worst = 0;
      for (const a of rects[i]) for (const b of rects[j]) {
        const ow = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oh = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ow > 2 && oh > 2) worst = Math.max(worst, ow * oh);
      }
      if (!worst) continue;
      const ra = kids[i].getBoundingClientRect(), rb = kids[j].getBoundingClientRect();
      const small = Math.min(ra.width * ra.height, rb.width * rb.height);
      if (worst > small * 0.25)
        add('R7元素重叠', kids[i], norm(kids[i].innerText).slice(0, 40) + ' ⟂ ' + norm(kids[j].innerText).slice(0, 40), { area: Math.round(worst) });
    }
  }
  // ---- 8 触控目标(仅手机)----
  // 第 27 轮改判法(前一版按元素自身 rect 量,产出 153 条里绝大多数是假的):
  //  ① 热区可以由 `.tapPad::after` 伪元素外扩 → 元素自身 rect 本来就该小,量 rect 必然误报;
  //     改用**命中测试**:中心上下各偏 14px(手指落点误差)仍能点中本元素才算达标。
  //  ② 卡片/行整块可点时(手机岗位卡 #129),卡内的职位名、城市、省只是内容,不是独立靶 —— 跳过。
  if (mobile) for (const el of all) {
    if (!el.matches('button,select,[role=button],a')) continue;   // input 是输入框不是点击靶,排除
    const st = getComputedStyle(el);
    if (el.tagName === 'A' && st.display.startsWith('inline') && !el.querySelector('*')) continue; // 正文行内链接不算
    if (el.closest('[data-tap-card]')) continue;                  // 整卡可点,卡内内容链接不单独算靶
    if (el.closest('header')) continue;                          // 顶栏按 Frank 拍板豁免(加热区会把语言钮/登录撑肥)
    const r = el.getBoundingClientRect();
    if (r.width >= 40 && r.height >= 40) continue;
    if (r.height >= 32 && r.width >= 120) continue;   // 大条钮(如「购买 30 天 CA$19」296×36)点得中,不必凑 40
    // 视口外的元素 elementFromPoint 必然落空(#217 复验时踩到:40px 高的按钮照样报 FAIL)——
    // 只测当前在视口内的;视口外的下次滚动到时再测,不硬报。
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const hit = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h) || h.contains(el)); };
    const ok = hit(cx, Math.max(1, cy - 14)) && hit(cx, Math.min(innerHeight - 1, cy + 14));
    if (!ok) add('R8触控目标过小', el, norm(el.innerText), { w: Math.round(r.width), h: Math.round(r.height) });
  }
  // ---- 9 可点必有态 / 不可点必无 ----
  for (const el of all) {
    const st = getComputedStyle(el);
    if (el.matches('button,[role=button]') && !el.disabled && st.cursor !== 'pointer' && st.pointerEvents !== 'none')
      add('R9可点无手型', el, norm(el.innerText), { cursor: st.cursor });
    // 手型指向空态:只认 —(图标钮天然无文字,首轮 111 条假阳性全是轮播点/图标钮);
    // 祖先是链接/按钮的不算 —— 手型来自整卡可点(省卡就是这样),第 26 轮把它误判成「假手型」过
    if (st.cursor === 'pointer' && el.children.length === 0 && /^[—-]$/.test(textOf(el))
        && !el.closest('a[href],button')) add('R9手型指向空态', el, textOf(el));
  }
  // ---- 10 死链 ----
  for (const el of all) {
    if (el.tagName !== 'A') continue;
    const h = el.getAttribute('href');
    if (h === null || h === '' || h === '#' || /^javascript:\s*void/.test(h)) add('R10死链', el, norm(el.innerText), { href: h });
  }
  // ---- 12 空态占比(首 10 行)----
  let dash = 0, tot = 0;
  for (const tr of [...root.querySelectorAll('tbody tr')].slice(0, 10))
    for (const td of tr.children) { tot++; if (norm(td.innerText) === '—') dash++; }
  // ---- 事实抽取(供 R11 对库)----
  const body = document.body.innerText;
  const pick = re => { const m = body.match(re); return m ? m[0] : null; };
  const facts = {
    // 标签 2026-07-26 晚改回「更新时间/Updated/업데이트」(Frank 二次拍板);旧词保留兼容,免得改名一次探针瞎一次
    heartbeat: pick(/更新时间[^\n]{0,24}|核对[^\n]{0,24}|Updated[^\n]{0,24}|Checked[^\n]{0,24}|업데이트[^\n]{0,24}|확인[^\n]{0,24}/),
    // 在招总数:韩文页「PNP 목록 2571건 포함」会先命中,必须锚在「개 공고 / 个职位 / jobs」上
    hits: pick(/[\d,]+\s*(个职位|个在招|개 공고|jobs)/),
    title: document.title,
  };
  return { hits: HITS, counts, facts, stats: { els: all.length, dashCells: dash, cells: tot } };
}
"""

INIT = """
window.__lcp = 0;
try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime) })
  .observe({ type: 'largest-contentful-paint', buffered: true }) } catch (e) {}
"""
PERF = """() => ({
  lcp: window.__lcp || 0,
  js: Math.round(performance.getEntriesByType('resource')
        .filter(r => /\\.js(\\?|$)/.test(r.name) || r.initiatorType === 'script')
        .reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
})"""

# 页面集:中文跑全量,英/韩跑精简(R2 汉字残留是非中文段的主检查项)
FULL = [("/jobs", "jobs"), ("/pricing", "pricing"), ("/stats", "stats-index"), ("/stats/ab", "stats-province"),
        ("/stats/compare", "stats-compare"), ("/rankings/weekly-top", "rank-weekly"),
        ("/rankings/sponsor-likely", "rank-sponsor"), ("/rankings/daily-top", "rank-daily"),
        ("/news", "news"), ("/pathways", "pathways"), ("/plan/pr", "plan-pr")]
LITE = [("/jobs", "jobs"), ("/pricing", "pricing"), ("/stats", "stats-index"),
        ("/rankings/weekly-top", "rank-weekly"), ("/news", "news")]

RESULTS = []   # 每条 = 一个 (page, viewport, lang, auth) 上下文的体检结果
RUNTIME = []   # console / network / perf


def audit(page, ctx, scope="page"):
    """跑一次体检并记账;ctx = {page, viewport, lang, auth}"""
    try:
        r = page.evaluate(JS, {"lang": ctx["lang"], "mobile": ctx["viewport"] == "375x812", "scope": scope})
    except Exception as e:
        print("  !! audit failed:", ctx, repr(e)[:120]); return
    RESULTS.append({**ctx, "scope": scope, **r})
    n = len(r["hits"])
    print(f"  [{ctx['lang']}/{ctx['viewport']}/{ctx['auth']}] {ctx['page']}{'·'+scope if scope!='page' else ''}: "
          f"{n} hits, els={r['stats'].get('els')}, dash={r['stats'].get('dashCells')}/{r['stats'].get('cells')}")


def sweep(b, viewport, lang, pages, login=False):
    vp = {"width": int(viewport.split("x")[0]), "height": int(viewport.split("x")[1])}
    kw = dict(viewport=vp, device_scale_factor=1, locale="zh-CN" if lang == "zh" else ("en-CA" if lang == "en" else "ko-KR"))
    if viewport == "375x812":
        kw.update(is_mobile=True, has_touch=True,
                  user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
                             "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
    ctxb = b.new_context(**kw)
    ctxb.add_init_script(f"try {{ localStorage.setItem('jobs.lang', '{lang}') }} catch (e) {{}}")
    ctxb.add_init_script(INIT)
    ctxb.add_init_script("try { localStorage.setItem('umami.disabled', '1') } catch (e) {}")   # 走查不进流量统计(自污染教训 2026-07-26)
    page = ctxb.new_page()
    auth = "anon"

    # 13/14:console + network 记账(按当前页归集)
    cur = {"name": "-"}
    page.on("console", lambda m: m.type in ("error", "warning") and RUNTIME.append(
        {"kind": "console", "type": m.type, "page": cur["name"], "viewport": viewport, "lang": lang,
         "text": m.text[:200], "hydration": "hydrat" in m.text.lower()}))
    page.on("pageerror", lambda e: RUNTIME.append(
        {"kind": "pageerror", "page": cur["name"], "viewport": viewport, "lang": lang, "text": str(e)[:200]}))
    page.on("response", lambda r: r.status >= 400 and RUNTIME.append(
        {"kind": "http", "status": r.status, "page": cur["name"], "viewport": viewport, "lang": lang, "url": r.url[:160]}))

    def close_banner():
        try:
            x = page.locator("button").filter(has_text=re.compile(r"^\s*×\s*$")).first
            if x.count(): x.evaluate("el => el.click()"); page.wait_for_timeout(250)
        except Exception: pass

    def visit(path, name):
        cur["name"] = name
        page.goto(BASE + path, wait_until="domcontentloaded", timeout=60000)
        if path.startswith("/jobs"):
            page.wait_for_selector("table tbody tr", state="attached", timeout=30000)
        page.wait_for_timeout(4200 if path.startswith("/plan/") else 2200)   # SurveyJS 客户端渲染,慢一拍
        close_banner()
        try: RUNTIME.append({"kind": "perf", "page": name, "viewport": viewport, "lang": lang, **page.evaluate(PERF)})
        except Exception: pass
        audit(page, {"page": name, "viewport": viewport, "lang": lang, "auth": auth})

    if login:
        try:
            page.goto(BASE + "/jobs", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_selector("table tbody tr", state="attached", timeout=30000); page.wait_for_timeout(1200)
            close_banner()
            page.locator("button:has-text('登录')").first.evaluate("el => el.click()")
            page.wait_for_timeout(1200)
            page.fill("input[type=email]", CRED["email"])
            page.locator("input[type=password]").first.fill(CRED["password"])
            page.locator("button").filter(has_text=re.compile("^登录$")).last.evaluate("el => el.click()")
            page.wait_for_timeout(6000)
            auth = "user" if page.locator("button:has-text('登录')").count() == 0 else "anon(login failed)"
            print("  login:", auth)
        except Exception:
            traceback.print_exc()

    for path, name in pages:
        if not wanted(name): continue
        try: visit(path, name)
        except Exception as e: print("  !! visit failed:", name, repr(e)[:120])

    # 弹框段(中文全跑,英文只跑移民价值;公司信息弹框吃 AI 配额,不进体检)
    if lang in ("zh", "en"):
        for btn, name, wait in [("移民价值", "immig-modal", 12000), ("职位描述", "jd-modal", 8000)]:
            if lang == "en" and name != "immig-modal": continue
            if not wanted(name): continue
            try:
                cur["name"] = name
                page.goto(BASE + "/jobs", wait_until="domcontentloaded", timeout=60000)
                page.wait_for_selector("table tbody tr", state="attached", timeout=30000)
                page.wait_for_timeout(1500); close_banner()
                # 第 29 轮修:JD 弹框没有「职位描述」按钮了(职位名 <a> 本身 preventDefault 开弹框,
                # JobsTable.tsx:1551)—— 旧选择器每轮 30s 超时,弹框段等于没跑。
                if name == "jd-modal":
                    b2 = page.locator("a[href^='/jobs/']").first
                else:
                    b2 = page.locator(f"button:has-text('{btn}')").first if lang == "zh" else page.locator("table tbody button").first
                b2.evaluate("el => el.click()")
                page.wait_for_timeout(wait)
                page.evaluate("document.querySelectorAll('div').forEach(d => { if (d.scrollTop > 0) d.scrollTop = 0 })")
                audit(page, {"page": name, "viewport": viewport, "lang": lang, "auth": auth}, scope="modal")
                page.keyboard.press("Escape"); page.wait_for_timeout(300)
            except Exception as e: print("  !! modal failed:", name, repr(e)[:120])

    # 登录态专属:匹配视图 + 账户页
    if login and auth == "user":
        for path, name in [("/jobs?view=match", "match-view"), ("/account", "account")]:
            if not wanted(name): continue
            try: visit(path, name)
            except Exception as e: print("  !! visit failed:", name, repr(e)[:120])

    ctxb.close()


# ============ R11 数字对库(用生产 /api/jobs 作库口径,本机无 psycopg) ============
def check_numbers(b):
    out = {}
    try:
        api = b.new_context().request
        r = api.get(BASE + "/api/jobs?page=1")
        j = r.json()
        out["api_total"] = j.get("total"); out["api_updatedAt"] = j.get("updatedAt")
        out["api_rows"] = len(j.get("rows") or [])
    except Exception as e:
        out["api_error"] = repr(e)[:160]
    return out


t0 = time.time()
with sync_playwright() as p:
    b = p.chromium.launch()
    combos = ([("375x812", "zh", FULL), ("1440x900", "zh", FULL)] if A.quick else
              [("375x812", "zh", FULL), ("1440x900", "zh", FULL),
               ("375x812", "en", LITE), ("1440x900", "en", LITE),
               ("375x812", "ko", LITE), ("1440x900", "ko", LITE)])
    for vp, lang, pages in combos:
        print(f"== {lang} @ {vp} (anon) ==")
        sweep(b, vp, lang, pages)
    # 登录段本身要 ~10s/视口,--only 没选到登录态页面时整段跳过
    if not A.no_login and any(wanted(n) for n in ("jobs", "match-view", "account")):
        for vp in ["375x812", "1440x900"]:
            print(f"== zh @ {vp} (user) ==")
            sweep(b, vp, "zh", [("/jobs", "jobs")], login=True)
    NUM = check_numbers(b)
    b.close()

# ============ 汇总(只打命中)============
payload = {"round": A.round, "base": BASE, "elapsed": round(time.time() - t0),
           "results": RESULTS, "runtime": RUNTIME, "numbers": NUM}
OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

agg = {}   # (rule, text 片段) → {count, where[]}
for r in RESULTS:
    for h in r["hits"]:
        k = (h["rule"], h["text"][:60])
        a = agg.setdefault(k, {"n": 0, "where": [], "sel": h["sel"], "extra": {kk: vv for kk, vv in h.items() if kk not in ("rule", "text", "sel")}})
        a["n"] += 1
        w = f"{r['page']}/{r['viewport']}/{r['lang']}{'/'+r['auth'] if r['auth']!='anon' else ''}{'/'+r['scope'] if r['scope']!='page' else ''}"
        if w not in a["where"]: a["where"].append(w)

print("\n================ 体检命中清单(第 %s 轮)================" % A.round)
order = sorted(agg.items(), key=lambda kv: (kv[0][0], -kv[1]["n"]))
for (rule, text), a in order:
    print(f"[{rule}] ×{a['n']}  {text}")
    print(f"    where: {', '.join(a['where'][:6])}{' …' if len(a['where'])>6 else ''}")
    print(f"    sel: {a['sel']}  {json.dumps(a['extra'], ensure_ascii=False) if a['extra'] else ''}")

print("\n---- 运行时 ----")
cons = [x for x in RUNTIME if x["kind"] in ("console", "pageerror")]
hyd = [x for x in cons if x.get("hydration")]
http = [x for x in RUNTIME if x["kind"] == "http"]
perf = [x for x in RUNTIME if x["kind"] == "perf"]
for x in cons[:15]: print(f"  console[{x.get('type', 'pageerror')}] {x['page']}/{x['viewport']}/{x['lang']}: {x['text'][:140]}")
print(f"  console 合计 {len(cons)}(hydration {len(hyd)});4xx/5xx {len(http)}")
for x in http[:10]: print(f"  http {x['status']} {x['page']}: {x['url']}")
if perf:
    worst = sorted(perf, key=lambda x: -x.get("lcp", 0))[:5]
    for x in worst: print(f"  LCP {x['lcp']}ms JS {x['js']}KB — {x['page']}/{x['viewport']}/{x['lang']}")

print("\n---- R11 数字/心跳 ----")
print("  API:", json.dumps(NUM, ensure_ascii=False))
for r in RESULTS:
    f = r.get("facts") or {}
    if r["page"] == "jobs" and (f.get("hits") or f.get("heartbeat")):
        print(f"  页面 {r['viewport']}/{r['lang']}/{r['auth']}: hits={f.get('hits')} heartbeat={f.get('heartbeat')}")
# 判定带容差(第 28/29 轮同一个假警报):体检要跑 9 分钟,期间生产 ETL 可能落一轮 —— 页面数与 API 数
# 差几十条是**取数时刻不同**,不是口径不一致。差 > 0.5% 才算真不一致。
_pg = [int(m.group(0).replace(",", "")) for r in RESULTS for m in
       [re.search(r"[\d,]+", str((r.get("facts") or {}).get("hits") or ""))] if r["page"] == "jobs" and m]
if _pg and NUM.get("api_total"):
    lo, hi, api = min(_pg), max(_pg), int(NUM["api_total"])
    drift = max(abs(lo - api), abs(hi - api)) / max(api, 1)
    print(f"  判定:页面 {lo}~{hi} vs API {api} —— {'一致(差 %.2f%% 在 ETL 落轮容差内)' % (drift * 100) if drift <= 0.005 else '★真不一致(差 %.2f%%),查口径' % (drift * 100)}")

print("\nCHECKUP DONE ->", OUT, f"({payload['elapsed']}s, {sum(len(r['hits']) for r in RESULTS)} hits)")
