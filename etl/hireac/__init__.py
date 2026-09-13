"""
hireac 域:Algonquin College HireAC(Orbis 门户)岗位板抓取 —— 登录态浏览器翻列表页
→ 详情原文(页内 fetch POST 回放)落 crawl 层 → 详情表格抽字段落 raw → 归一成 Job Bank 仓同形的
postings 仓(processed)。

为什么接、怎么接(2026-09-13 Frank「还是接入吧」「那些岗位也能用啊」「这个应该就是所有的 jobs 了」):
板上 604 帖 = 184 条本地雇主直投(渥太华小诊所小店,九成不在 Job Bank 与各板)+ 420 条 Outcome Campus
Connect 跨校联播;co-op 帖按学期只对登记进 job search 的学生开,开放时也挂在这同一个板,接了板就顺带接了。
登录墙 = 学院 Microsoft SSO,登录态落共享 profile(etl/crawl/.browser-profile),过期本域抛错停轮不静默。
详情靠每行自带的加密 action + postingId 在**页内** fetch POST 回放(页外 page.request / httpx 全被
Cloudflare 403,2026-09-13 实撞);列表靠页内 loadPostingTable() 翻页。与 careerbeacon 三步同形不共码。
🔴 只在 Frank 本机手动跑(登录态是 Windows Chrome 加密 cookie,容器拿不到):不进 docker-compose,
无角色容器;起法 `BROWSER_CHANNEL=chrome python etl/hireac/main.py`(共享 profile 已被 Chrome 15x
打开过,自带 chromium 开不了,见 crawl/__init__ BROWSER_CHANNEL)。

META = 域即役的调度声明(形制字段;本域不挂容器,interval 只是声明)。

@author Frank
@time 2026-09-13
"""
import os

DETAILS_PER_RUN = os.environ.get("DETAILS_PER_RUN", "1000")
"""每轮最多回放多少张详情页(全板 604 帖一轮约 7 分钟;之后只抓列表里的新帖号)。"""

META = {
    "role": "hireac",
    "method": "browser",     # 登录态浏览器(共享 profile);不对应任何 Dockerfile,本机手动跑
    "interval": 86400,       # 声明值:板日更,手动一天一跑够用
    "seed": False,           # 抓取源只刷 raw/processed,不灌库(灌库归 load 域 build 链)
    "ping": False,           # 无容器无心跳
}
