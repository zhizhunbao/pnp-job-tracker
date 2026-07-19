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

    def eshot(loc, name):
        # 元素截图(#76 纳编:特写镜头跟元素走,不再手裁坐标)
        loc.screenshot(path=str(OUT / f"{name}.png"))
        done.append(name); print("shot:", name)

    def goto_jobs():
        page.goto(BASE + "/jobs", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector("table tbody tr", timeout=30000)
        page.wait_for_timeout(1500)

    def close_banner():
        # 只点「恰好是 ×」的按钮:匹配状态条「退出 ×」也含 ×,第 17 轮起退出=整页跳转,误点毁 context
        try:
            x = page.locator("button").filter(has_text=re.compile(r"^\s*×\s*$")).first
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
        # 锁标是 td 里的 <button>,点 td 本身不触发(第 10 轮空拍教训)——必须点按钮
        cell = page.locator("table tbody tr").first.locator("td").nth(idx)
        (cell.locator("button").first if cell.locator("button").count() else cell).evaluate("el => el.click()")
        page.wait_for_timeout(2000)
        if not page.locator("text=注册并登录").count(): print("WARN register-gate: modal missing")
        shot("register-gate")  # 图2 锁列→注册框
        page.keyboard.press("Escape"); page.wait_for_timeout(400)
    except Exception: traceback.print_exc()
    try:
        goto_jobs(); close_banner()
        page.locator("button:has-text('登录')").first.evaluate("el => el.click()")
        page.wait_for_timeout(1000); shot("login-modal")    # 图3
        page.keyboard.press("Escape"); page.wait_for_timeout(400)
    except Exception: traceback.print_exc()

    try:
        # #76 纳编(2026-07-19,原为 7-17 一次性脚本产物,版式/品牌过期成死图):
        # 头轨分组特写=header 元素截图(/jobs 与二级页各一张,验 #65 全站合一)
        goto_jobs(); close_banner()
        eshot(page.locator("header").first, "header-groups")
        page.goto(BASE + "/pathways", wait_until="domcontentloaded"); page.wait_for_timeout(2000)
        eshot(page.locator("header").first, "header-groups-sub")
    except Exception: traceback.print_exc()

    try:
        # #76 纳编:筛选区特写(#59 常用一行+更多筛选折叠)——收起素态 / 选省+展开两态
        goto_jobs(); close_banner()
        block = page.locator("input[placeholder]").first.locator("xpath=ancestor::div[2]")
        eshot(block, "filters-fit")
        page.select_option("select >> nth=0", label="Ontario")
        mf = page.locator("button").filter(has_text=re.compile("更多筛选"))
        if mf.count(): mf.first.evaluate("el => el.click()")
        page.wait_for_timeout(1500)
        eshot(block, "filters-fit-selected")
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
                      ("/rankings/sponsor-likely", "rank-sponsor"),
                      ("/rankings/daily-top", "rank-daily"),
                      ("/news", "news")]:            # #76:news 模块镜头补编(E12-06 上线后一直缺)
        try:
            page.goto(BASE + url, wait_until="domcontentloaded"); page.wait_for_timeout(2500)
            shot(name, full=True)                  # 图4/21/22/11/19/20/24
        except Exception: traceback.print_exc()

    try:
        # #76:news 详情页镜头(三语懒翻译/速读/评论区都在详情;点头版第一条)
        page.goto(BASE + "/news", wait_until="domcontentloaded"); page.wait_for_timeout(2500)
        a = page.locator("a[href*='/news/']").first
        if a.count():
            a.evaluate("el => el.click()"); page.wait_for_timeout(3000)
            shot("news-detail", full=True)
    except Exception: traceback.print_exc()

    try:
        # E9-02 推荐横幅(第 20 轮新增,图 26):先造画像(ev≥5 且省主导≥3 才显示)再重载;
        # 拍完清画像,别让横幅混进后面镜头(jobs-board/signal-columns 保持历轮样貌)
        # 画像只压省维度(带薪资档会把 n 压到 0);横幅 n 按已载入行算,全量换入要几秒——等文本出现再拍
        goto_jobs()
        page.evaluate("localStorage.setItem('jobsPref1', JSON.stringify({ev: 8, prov: {AB: 6}, broad: {}, sal: {}})); localStorage.removeItem('jobsPrefHide')")
        goto_jobs()
        try: page.wait_for_selector("text=根据你最近浏览", timeout=15000)
        except Exception: print("WARN rec-banner: not shown")
        shot("rec-banner")
        page.evaluate("localStorage.removeItem('jobsPref1')")
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
        # E9-01 收藏钮(第 20 轮新增,图 25):登录态点「☆ 收藏」变「★ 已收藏」;已收藏则不点(再点=取消)
        btn = page.locator("table tbody tr").first.locator("button").filter(has_text=re.compile("收藏")).first
        if "已收藏" not in btn.inner_text():
            btn.evaluate("el => el.click()"); page.wait_for_timeout(1500)
        btn.evaluate("el => el.scrollIntoView({block: 'center', inline: 'center'})")
        page.wait_for_timeout(400); shot("save-job")
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
        # E9-01 我的求职(第 20 轮新增,图 27):sidebar 切「我的求职」节(上面 save-job 已保证列表非空)
        page.locator("button:has-text('我的求职')").first.evaluate("el => el.click()")
        page.wait_for_timeout(2500); shot("my-jobs")
    except Exception: traceback.print_exc()

    try:
        # 真实 live Checkout:只截图不支付,session 过期无副作用
        # 2026-07-16 账户改 sidebar 分节后「购买 30 天」在「升级 Pro」节,先切节再点
        up = page.locator("aside button").filter(has_text=re.compile("升级"))
        if up.count(): up.first.evaluate("el => el.click()"); page.wait_for_timeout(800)
        page.locator("button").filter(has_text=re.compile("购买 30 天")).first.evaluate("el => el.click()")
        for _ in range(30):
            page.wait_for_timeout(1000)
            if "stripe.com" in page.url: break
        page.wait_for_timeout(4000); shot("stripe-checkout")  # 图6
    except Exception: traceback.print_exc()

    b.close()
    print("DONE", len(done), "shots:", json.dumps(done, ensure_ascii=False))
