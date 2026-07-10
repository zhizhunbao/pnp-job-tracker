# 电脑端全量截图(1440x900,生产站 offer2pr.com)——iterate-audit 第 2 步
# 用系统 python 跑(playwright 只装在系统 python)。每步独立 try,失败打印继续,最后核对清单补拍。
import sys, io, json, re, argparse, traceback
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from playwright.sync_api import sync_playwright

BASE = "https://offer2pr.com"
CRED = json.loads((Path(__file__).parent.parent / "credentials.local.json").read_text("utf-8"))

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
OUT = Path(ap.parse_args().out)
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5).new_page()
    done = []

    def shot(name, full=False):
        page.screenshot(path=str(OUT / f"{name}.png"), full_page=full)
        done.append(name); print("shot:", name)

    def goto_jobs():
        page.goto(BASE + "/jobs", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector("table tbody tr", timeout=30000)
        page.wait_for_timeout(1500)

    def close_banner():
        try:
            x = page.locator("button:has-text('×')").first
            if x.count(): x.evaluate("el => el.click()"); page.wait_for_timeout(300)
        except Exception: pass

    def enable_cols(names):
        # 「字段」下拉:Escape 关不掉,必须再点一次按钮;别用坐标点空白(会误点表格 cell 弹无关弹框)
        page.click("button:has-text('字段')"); page.wait_for_timeout(400)
        for n in names:
            lab = page.locator("label").filter(has_text=re.compile("^" + re.escape(n) + "$"))
            if lab.count():
                cb = lab.first.locator("input[type=checkbox]")
                if cb.count() and not cb.is_checked(): cb.click(); page.wait_for_timeout(200)
        page.click("button:has-text('字段')"); page.wait_for_timeout(600)

    def headers():
        return page.eval_on_selector_all("table th", "els => els.map(e => e.innerText.trim())")

    def reset_scrolls():
        # 弹框会自动滚到命中行,截图前归零才能拍到顶部抽选块/评分明细
        page.evaluate("document.querySelectorAll('div').forEach(d => { if (d.scrollTop > 0) d.scrollTop = 0 })")
        page.wait_for_timeout(400)

    def modal_shot(kw, name, wait_ms=12000, exclude=None, need_text=True):
        hs = headers()
        idx = next((i for i, h in enumerate(hs) if kw in h and (not exclude or exclude not in h)), -1)
        if idx < 0: print("no col:", kw, hs); return
        rows = page.locator("table tbody tr")
        for r in range(min(rows.count(), 60)):
            cell = rows.nth(r).locator("td").nth(idx)
            if (not need_text) or cell.inner_text().strip() not in ("", "—", "-"):
                cell.evaluate("el => el.click()")  # JS click 绕 hover tooltip 拦截
                page.wait_for_timeout(wait_ms)
                reset_scrolls(); shot(name); return
        print("no cell:", kw)

    COLS = ["PNP", "EE 类别", "外劳记录", "评分"]

    # ===== 匿名段 =====
    try:
        goto_jobs(); shot("jobs-board")            # 图1 首页(横幅在)
    except Exception: traceback.print_exc()
    try:
        close_banner()
        hs = headers()
        idx = next((i for i, h in enumerate(hs) if "vs" in h), -1)
        page.locator("table tbody tr").first.locator("td").nth(idx).evaluate("el => el.click()")
        page.wait_for_timeout(2000); shot("register-gate")  # 图2 锁列→注册框
        page.keyboard.press("Escape"); page.wait_for_timeout(400)
    except Exception: traceback.print_exc()
    try:
        goto_jobs(); close_banner()
        page.locator("button:has-text('登录')").first.evaluate("el => el.click()")
        page.wait_for_timeout(1000); shot("login-modal")    # 图3
        page.keyboard.press("Escape"); page.wait_for_timeout(400)
    except Exception: traceback.print_exc()

    for kw, name, wait, exc in [("PNP", "pnp-modal", 12000, None), ("EE 类别", "ee-modal", 12000, "TEER"),
                                 ("外劳", "lmia-modal", 12000, None), ("评分", "score-modal", 10000, None)]:
        try:
            goto_jobs(); close_banner(); enable_cols(COLS)
            modal_shot(kw, name, wait, exc)        # 图13/14/15/17
        except Exception: traceback.print_exc()

    for btn, name, wait in [("职位描述", "jd-modal", 8000), ("公司信息", "company-advisor", 16000)]:
        try:
            goto_jobs(); close_banner()
            page.locator(f"button:has-text('{btn}')").first.evaluate("el => el.click()")
            page.wait_for_timeout(wait); shot(name)  # 图18/12
        except Exception: traceback.print_exc()

    for url, name in [("/pricing", "pricing"), ("/stats", "stats-index"), ("/stats/ab", "stats-province"),
                      ("/stats/compare", "stats-compare"), ("/rankings/weekly-top", "rank-weekly"),
                      ("/rankings/sponsor-likely", "rank-sponsor")]:
        try:
            page.goto(BASE + url, wait_until="domcontentloaded"); page.wait_for_timeout(2500)
            shot(name, full=True)                  # 图4/21/22/11/19/20
        except Exception: traceback.print_exc()

    # ===== 登录段(测试号,循 @test.local 惯例)=====
    try:
        goto_jobs(); close_banner()
        page.locator("button:has-text('登录')").first.evaluate("el => el.click()")
        page.wait_for_timeout(1000)
        page.fill("input[type=email]", CRED["email"])
        page.locator("input[type=password]").first.fill(CRED["password"])
        page.locator("button").filter(has_text=re.compile("^登录$")).last.evaluate("el => el.click()")
        page.wait_for_timeout(6000); goto_jobs()
        print("logged in?", page.locator("button:has-text('登录')").count() == 0)
    except Exception: traceback.print_exc()

    try:
        close_banner(); enable_cols(COLS)
        page.wait_for_timeout(800); shot("signal-columns")   # 图10 登录态信号列+锁列
    except Exception: traceback.print_exc()

    try:
        # 匹配视图是 E5-05 独立视图:直链 ?view=match;不生效再点顶栏「我的匹配」
        page.goto(BASE + "/jobs?view=match", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector("table tbody tr", timeout=30000); page.wait_for_timeout(2500)
        close_banner()
        hs = headers()
        if not any("匹配" in h for h in hs):
            page.locator("button:has-text('我的匹配')").first.evaluate("el => el.click()")
            page.wait_for_timeout(2500); hs = headers()
        shot("match-view")                                    # 图8
        m = next((i for i, h in enumerate(hs) if "匹配" in h), 0)
        page.locator("table tbody tr").first.locator("td").nth(m).evaluate(
            "el => { const s = el.querySelector('span'); (s||el).click(); }")
        page.wait_for_timeout(12000); reset_scrolls(); shot("match-modal")  # 图9
    except Exception: traceback.print_exc()

    try:
        goto_jobs(); close_banner()
        page.select_option("select >> nth=0", label="Ontario")   # 「保存此筛选」要先套筛选才出现
        page.wait_for_timeout(2000)
        sv = page.locator("button, a").filter(has_text=re.compile("保存"))
        if sv.count():
            sv.first.evaluate("el => el.click()"); page.wait_for_timeout(2000)
            shot("upgrade-modal")                             # 图5
    except Exception: traceback.print_exc()

    try:
        page.goto(BASE + "/account", wait_until="domcontentloaded"); page.wait_for_timeout(2500)
        shot("account-profile", full=True)                    # 图7
    except Exception: traceback.print_exc()

    try:
        # 真实 live Checkout:只截图不支付,session 过期无副作用
        page.locator("button").filter(has_text=re.compile("购买 30 天")).first.evaluate("el => el.click()")
        for _ in range(30):
            page.wait_for_timeout(1000)
            if "stripe.com" in page.url: break
        page.wait_for_timeout(4000); shot("stripe-checkout")  # 图6
    except Exception: traceback.print_exc()

    b.close()
    print("DONE", len(done), "shots:", json.dumps(done, ensure_ascii=False))
