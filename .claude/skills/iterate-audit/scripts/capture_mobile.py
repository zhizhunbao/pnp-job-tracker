# 手机端全量截图(iPhone 13 视口,生产站)——iterate-audit 第 2 步
# 手机端是卡片流:table attached 但不可见,等待一律 state='attached';筛选收在「筛选 ▼」折叠里。
import sys, io, json, re, argparse, traceback
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from playwright.sync_api import sync_playwright

BASE = "https://offer2pr.com"
CRED = json.loads((Path(__file__).parent.parent / "credentials.local.json").read_text("utf-8"))

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
OUT = Path(ap.parse_args().out) / "mobile"
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch()
    dev = dict(p.devices["iPhone 13"]); dev["locale"] = "zh-CN"
    page = b.new_context(**dev).new_page()
    done = []

    def shot(name, full=False):
        page.screenshot(path=str(OUT / f"{name}.png"), full_page=full)
        done.append(name); print("shot:", name)

    def goto_jobs():
        page.goto(BASE + "/jobs", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector("table tbody tr", state="attached", timeout=30000)
        page.wait_for_timeout(1500)

    def close_banner():
        # 只点「恰好是 ×」的按钮:匹配状态条「退出 ×」也含 ×,第 17 轮起退出=整页跳转,误点毁 context
        try:
            x = page.locator("button").filter(has_text=re.compile(r"^\s*×\s*$")).first
            if x.count(): x.evaluate("el => el.click()"); page.wait_for_timeout(300)
        except Exception: pass

    def enable_cols(names):
        try:
            page.locator("button:has-text('字段')").first.evaluate("el => el.click()")
            page.wait_for_timeout(500)
            for n in names:
                lab = page.locator("label").filter(has_text=re.compile("^" + re.escape(n) + "$"))
                if lab.count():
                    cb = lab.first.locator("input[type=checkbox]")
                    if cb.count() and not cb.is_checked():
                        cb.evaluate("el => el.click()"); page.wait_for_timeout(200)
            page.locator("button:has-text('字段')").first.evaluate("el => el.click()")
            page.wait_for_timeout(600)
        except Exception: traceback.print_exc()

    def headers():
        return page.eval_on_selector_all("table th", "els => els.map(e => e.innerText.trim())")

    def reset_scrolls():
        page.evaluate("document.querySelectorAll('div').forEach(d => { if (d.scrollTop > 0) d.scrollTop = 0 })")
        page.wait_for_timeout(400)

    def modal_shot(kw, name, wait_ms=12000, exclude=None):
        hs = headers()
        idx = next((i for i, h in enumerate(hs) if kw in h and (not exclude or exclude not in h)), -1)
        if idx < 0: print("no col:", kw); return
        rows = page.locator("table tbody tr")
        for r in range(min(rows.count(), 60)):
            cell = rows.nth(r).locator("td").nth(idx)
            if cell.inner_text().strip() not in ("", "—", "-"):
                cell.evaluate("el => el.click()")
                page.wait_for_timeout(wait_ms); reset_scrolls(); shot(name); return
        print("no cell:", kw)

    COLS = ["PNP", "EE 类别", "外劳记录", "评分"]

    # ===== 匿名段 =====
    try:
        goto_jobs(); shot("home")                              # 图M1(横幅在)
    except Exception: traceback.print_exc()
    try:
        close_banner()
        page.locator("button:has-text('注册')").first.evaluate("el => el.click()")
        page.wait_for_timeout(1200); shot("register-modal")    # 图M2(卡片无锁列,从顶栏进)
        page.keyboard.press("Escape"); page.wait_for_timeout(400)
    except Exception: traceback.print_exc()
    try:
        goto_jobs(); close_banner()
        page.locator("button:has-text('登录')").first.evaluate("el => el.click()")
        page.wait_for_timeout(1000); shot("login-modal")       # 图M3
        page.keyboard.press("Escape"); page.wait_for_timeout(400)
    except Exception: traceback.print_exc()

    for kw, name, exc in [("PNP", "pnp-modal", None), ("EE 类别", "ee-modal", "TEER"),
                           ("外劳", "lmia-modal", None), ("评分", "score-modal", None)]:
        try:
            goto_jobs(); close_banner(); enable_cols(COLS)
            modal_shot(kw, name, exclude=exc)                  # 图M10-M13
        except Exception: traceback.print_exc()

    for btn, name, wait in [("职位描述", "jd-modal", 8000), ("公司信息", "company-advisor", 15000)]:
        try:
            goto_jobs(); close_banner()
            page.locator(f"button:has-text('{btn}')").first.evaluate("el => el.click()")
            page.wait_for_timeout(wait); shot(name)            # 图M14/M15
        except Exception: traceback.print_exc()

    for url, name in [("/pricing", "pricing"), ("/stats", "stats-index"), ("/stats/ab", "stats-province"),
                      ("/stats/compare", "stats-compare"), ("/rankings/weekly-top", "rank-weekly"),
                      ("/rankings/sponsor-likely", "rank-sponsor")]:
        try:
            page.goto(BASE + url, wait_until="domcontentloaded"); page.wait_for_timeout(2500)
            shot(name, full=True)                              # 图M4/M16/M17/M20/M18/M19
        except Exception: traceback.print_exc()

    # ===== 登录段 =====
    try:
        goto_jobs(); close_banner()
        page.locator("button:has-text('登录')").first.evaluate("el => el.click()")
        page.wait_for_timeout(1000)
        page.fill("input[type=email]", CRED["email"])
        page.locator("input[type=password]").first.fill(CRED["password"])
        page.locator("button").filter(has_text=re.compile("^登录$")).last.evaluate("el => el.click()")
        page.wait_for_timeout(6000)
        print("logged in?")
    except Exception: traceback.print_exc()

    try:
        page.goto(BASE + "/account", wait_until="domcontentloaded"); page.wait_for_timeout(2500)
        shot("account-profile", full=True)                     # 图M7
    except Exception: traceback.print_exc()

    try:
        page.goto(BASE + "/jobs?view=match", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector("table tbody tr", state="attached", timeout=30000)
        page.wait_for_timeout(2500); close_banner()
        hs = headers()
        if not any("匹配" in h for h in hs):
            page.locator("button:has-text('我的匹配')").first.evaluate("el => el.click()")
            page.wait_for_timeout(2500); hs = headers()
        shot("match-view")                                     # 图M8
        m = next((i for i, h in enumerate(hs) if "匹配" in h), 0)
        cell = page.locator("table tbody tr").first.locator("td").nth(m)
        cell.evaluate("el => { const s = el.querySelector('span'); (s||el).click(); }")
        page.wait_for_timeout(12000); reset_scrolls(); shot("match-modal")  # 图M9
    except Exception: traceback.print_exc()

    try:
        goto_jobs(); close_banner()
        page.locator("button:has-text('筛选')").first.evaluate("el => el.click()")  # 展开折叠
        page.wait_for_timeout(800)
        # 省下拉在手机上不可见,JS 直设 + change 事件
        page.eval_on_selector("select", "el => { for (const o of el.options) if (o.text.includes('Ontario')) { el.value = o.value; break } el.dispatchEvent(new Event('change', {bubbles: true})) }")
        page.wait_for_timeout(2000)
        sv = page.locator("button, a").filter(has_text=re.compile("保存"))
        if sv.count():
            sv.first.evaluate("el => el.click()"); page.wait_for_timeout(2000)
            shot("upgrade-modal")                              # 图M5
    except Exception: traceback.print_exc()

    try:
        page.goto(BASE + "/account", wait_until="domcontentloaded"); page.wait_for_timeout(2000)
        page.locator("button").filter(has_text=re.compile("购买 30 天")).first.evaluate("el => el.click()")
        for _ in range(30):
            page.wait_for_timeout(1000)
            if "stripe.com" in page.url: break
        page.wait_for_timeout(4000); shot("stripe-checkout")   # 图M6(只截图不支付)
    except Exception: traceback.print_exc()

    b.close()
    print("DONE", len(done), "shots:", json.dumps(done, ensure_ascii=False))
