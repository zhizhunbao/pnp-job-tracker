"""
pte 域:PTE Core 题库(移民语言考试)机经研究 + 新题雷达。

对照侧(当前实现):ynwac(小枫叶)机经库整库抽取 —— 抓公开 bundle → 解析成题库 →
按题型+题 id diff 上轮报新题(机经雷达)。产物落 data/raw/pte/(bundle 快照 + DI 图)
与 data/processed/pte/(解析库 + changes + 同源分析),**研究用途,不建 mart / 不灌库 /
不上线**(开域手册 etl分域-20260829 §6.5:第三方商业题库不入库)。实撞证据:ynwac 整库是
main.js 里的静态 blob(付费墙只锁 AI 评分,题目本体零鉴权),RA 每题带 duomoLink 指向
duoink.co —— 各平台交叉引用同一套题的直接信号。

主源(官方公开样题)那半边:Pearson 免费公开样题实测 ≈ 零(300 题库 + 模考在 myPTE 登录 +
付费墙后,且每页保留 TDM/AI 训练权),合规主源只能靠 LLM 造原创题 —— 待立。
(2026-09-02 Frank 拍板撤案:「Pearson 的题不需要」—— 本域完整性标准 = 机经池镜像层收齐,
LLM 原创题不立项;别再提案。)

第二开放源 ptebank.com(2026-09-01 平台地图探测后接入,详见 same-source-analysis §7):
WP REST 零鉴权整库(实测 634 帖),音频重(SST/RL/SGD 含公开 mp3)补 ynwac 文本重;
raw 响应先落 data/raw/pte/ptebank/,组织库与雷达同 ynwac 形。地图结论:全开只此两家
(79score 橱窗引流、APEUni/大西瓜 登录/微信门控、duoink 极验、onepte 拒爬)。

META:2026-09-01 Frank 拍板挂 docker 调度(SOURCE=pte,一域一容器)—— 新题雷达周更自动跑,
零登录、只碰公开 bundle。投票/评论那层是登录门控,不在自动链(需登录态,人工/半自动另说)。
2026-09-26 晚改判(保鲜标准 Frank「我现在职位是小时更新。其他最次也是日更」;「其中一个失败,其余照跑?那我怎么知道
这个失败」→「拆 + 每个单元配 ping」):日更,配 ping(HEALTHCHECK_PING_PTE);上面「周更自动跑」一句就此作废,原文保留。
"""
META = {
    "role": "pte",
    "method": "httpx",
    "interval": 86400,         # 7d 周更(机经变化慢;只抓公开 bundle 跑 diff,零登录)
                               # —— 2026-09-26 晚改日更(Frank「我现在职位是小时更新。其他最次也是日更」)
    "seed": False,             # 研究域,不灌库
    "ping": True,              # 不占 healthchecks 心跳(不接生产监控)
                               # —— 2026-09-26 晚改 True(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」
                               # →「拆 + 每个单元配 ping」)
}
