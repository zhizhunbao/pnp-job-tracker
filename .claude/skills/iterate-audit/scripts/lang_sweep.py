# EN/한 语言回归走查(第 14 轮沉淀):关键页面+弹窗扫「可见汉字残留」(makeT 缺键回退中文,
# 数据层未映射 label 也是中文)——每页截图留档,汉字命中行打印带上下文。
# 用法:python lang_sweep.py <输出目录>;唯一合法汉字=语言切换器「中」字。
# 注意:EN 段会开六个顾问弹窗 = 烧匿名 advisor 配额(8/日),与截图轮同日跑会互相挤兑。
import sys, io, json, re
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from playwright.sync_api import sync_playwright

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
CRED = json.loads((Path(__file__).parent.parent / "credentials.local.json").read_text("utf-8"))

HAN = re.compile(r'[㐀-鿿]')

# 可见文本里的汉字命中行(整页/最上层弹窗)
JS_SCAN = """(scope) => {
  const root = scope === 'modal'
    ? [...document.querySelectorAll('div')].filter(d => getComputedStyle(d).position==='fixed' && d.offsetHeight>200).pop()
    : document.body
  if (!root) return []
  const hits = []
  const walk = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3) {
        const t = n.textContent
        if (/[\\u3400-\\u9fff]/.test(t)) {
          const p = n.parentElement
          if (p && (p.offsetWidth || p.offsetHeight)) hits.push(t.trim().slice(0, 60))
        }
      } else if (n.nodeType === 1) walk(n)
    }
  }
  walk(root)
  return [...new Set(hits)].slice(0, 20)
}"""

def report(lang, name, hits):
    if hits: print(f"[{lang}] {name} ✗ {len(hits)} hits: {json.dumps(hits[:6], ensure_ascii=False)}")
    else: print(f"[{lang}] {name} ✓")

with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in ["en", "ko"]:
        ctx = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)
        ctx.add_init_script(f"try {{ localStorage.setItem('jobs.lang', '{lang}') }} catch (e) {{}}")
        page = ctx.new_page()
        LDIR = OUT / lang; LDIR.mkdir(exist_ok=True)

        # 1) /jobs 全列
        page.goto("https://offer2pr.com/jobs", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector("table tbody tr", timeout=30000); page.wait_for_timeout(1800)
        page.evaluate("document.querySelectorAll('button').forEach(b => { if (b.textContent.trim()==='×') b.click() })")
        # 开全列(字段/Columns/필드 按钮 = 带 ( 的那个)
        page.evaluate("""() => { const b=[...document.querySelectorAll('button')].find(x=>/\\(\\d+\\)/.test(x.textContent)); if (b) b.click() }""")
        page.wait_for_timeout(500)
        page.evaluate("""() => { document.querySelectorAll('input[type=checkbox]').forEach((c,i)=>{ if(i>0 && !c.checked && !c.disabled) c.click() }) }""")
        page.wait_for_timeout(400)
        page.evaluate("""() => { const b=[...document.querySelectorAll('button')].find(x=>/\\(\\d+\\)/.test(x.textContent)); if (b) b.click() }""")
        page.wait_for_timeout(1200)
        report(lang, "jobs-board(all cols)", page.evaluate(JS_SCAN, "page"))
        page.screenshot(path=str(LDIR / "jobs-board.png"))

        # 2) 弹窗族:按表头点第一行有值 cell(EN 表头关键词)
        heads = page.eval_on_selector_all("table thead th", "els => els.map(e => e.innerText.trim())")
        def open_cell(kw, name, wait=2500):
            idx = next((i for i, h in enumerate(heads) if kw.lower() in h.lower()), -1)
            if idx < 0: print(f"[{lang}] {name}: no col ({kw})"); return
            rows = page.locator("table tbody tr")
            for r in range(min(rows.count(), 40)):
                cell = rows.nth(r).locator("td").nth(idx)
                if cell.inner_text().strip() not in ("", "—", "-"):
                    cell.evaluate("el => el.click()"); page.wait_for_timeout(wait)
                    page.evaluate("document.querySelectorAll('div').forEach(d => { if (d.scrollTop > 0) d.scrollTop = 0 })")
                    report(lang, name, page.evaluate(JS_SCAN, "modal"))
                    page.screenshot(path=str(LDIR / f"{name}.png"))
                    page.keyboard.press("Escape"); page.wait_for_timeout(400)
                    return
            print(f"[{lang}] {name}: no cell")
        open_cell("PNP", "pnp-modal")
        open_cell("EE", "ee-modal")
        open_cell("LMIA", "lmia-modal")
        open_cell("Score" if lang == "en" else "점수", "score-modal")
        # 公司/JD 弹窗(操作列按钮:首行)
        page.locator("table tbody button").first.evaluate("el => el.click()"); page.wait_for_timeout(3000)
        page.evaluate("document.querySelectorAll('div').forEach(d => { if (d.scrollTop > 0) d.scrollTop = 0 })")
        report(lang, "company-advisor", page.evaluate(JS_SCAN, "modal"))
        page.screenshot(path=str(LDIR / "company-advisor.png"))
        page.keyboard.press("Escape"); page.wait_for_timeout(400)
        page.locator("table tbody button").nth(1).evaluate("el => el.click()"); page.wait_for_timeout(2500)
        report(lang, "jd-modal", page.evaluate(JS_SCAN, "modal"))
        page.screenshot(path=str(LDIR / "jd-modal.png"))
        page.keyboard.press("Escape"); page.wait_for_timeout(400)

        # 3) 登录/注册框(顶栏第一个非语言按钮 = Sign in)
        page.evaluate("""() => { const bs=[...document.querySelectorAll('header button')]; const t=bs.find(x=>/sign in|로그인/i.test(x.textContent)); if (t) t.click() }""")
        page.wait_for_timeout(800)
        report(lang, "auth-modal", page.evaluate(JS_SCAN, "modal"))
        page.screenshot(path=str(LDIR / "auth-modal.png"))
        page.keyboard.press("Escape"); page.wait_for_timeout(300)

        # 4) 独立页面
        for path, name in [("/stats", "stats-index"), ("/stats/ab", "stats-ab"), ("/stats/ab/tech", "stats-ab-tech"),
                           ("/stats/compare", "stats-compare"), ("/rankings/weekly-top", "rank-weekly"),
                           ("/rankings/sponsor-likely", "rank-sponsor"), ("/pricing", "pricing")]:
            page.goto("https://offer2pr.com" + path, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(2500)
            report(lang, name, page.evaluate(JS_SCAN, "page"))
            page.screenshot(path=str(LDIR / f"{name}.png"))

        # 5) 登录段(仅 EN):匹配视图/依据链/账户页
        if lang == "en":
            page.goto("https://offer2pr.com/jobs?login=1", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(1500)
            page.fill("input[type=email]", CRED["email"]); page.fill("input[type=password]", CRED["password"])
            page.evaluate("""() => { const bs=[...document.querySelectorAll('button')].filter(x=>/sign in/i.test(x.textContent)); bs[bs.length-1].click() }""")
            page.wait_for_timeout(4000)
            page.wait_for_selector("table tbody tr", timeout=30000)
            print("[en] logged in:", page.evaluate("() => document.body.innerText.includes('fable5d')"))
            page.evaluate("""() => { const b=[...document.querySelectorAll('header button')].find(x=>/my matches/i.test(x.textContent)); if (b) b.click() }""")
            page.wait_for_timeout(2500)
            report(lang, "match-view", page.evaluate(JS_SCAN, "page"))
            page.screenshot(path=str(LDIR / "match-view.png"))
            heads2 = page.eval_on_selector_all("table thead th", "els => els.map(e => e.innerText.trim())")
            mi = next((i for i, h in enumerate(heads2) if "match" in h.lower()), -1)
            if mi >= 0:
                page.locator("table tbody tr").first.locator("td").nth(mi).evaluate("el => el.click()")
                page.wait_for_timeout(3500)
                page.evaluate("document.querySelectorAll('div').forEach(d => { if (d.scrollTop > 0) d.scrollTop = 0 })")
                report(lang, "match-modal", page.evaluate(JS_SCAN, "modal"))
                page.screenshot(path=str(LDIR / "match-modal.png"))
                page.keyboard.press("Escape")
            page.goto("https://offer2pr.com/account", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(2000)
            report(lang, "account", page.evaluate(JS_SCAN, "page"))
            page.screenshot(path=str(LDIR / "account.png"))
        ctx.close()
    b.close()
print("SWEEP DONE")
