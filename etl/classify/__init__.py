"""
classify 域:岗位与公司的分类判定(2026-09-15 立域;Frank「洗分类是非常重要的,如果没有分类,
基本没法理解职位」「职位的分类,公司的分类。之后就可以类比,相似,这些」「清洗分类是不是需要单独
创建一个域来处理比较好」)。

回答的问题:「这条岗是什么职业,这家公司是什么行业」。边界:noc 域管「有哪些职业类」(官方表 +
本站分类树,基建叶),statcan 域管「有哪些行业类」(NAICS),mart 域管汇装与评分,本域只管「判归哪类」。
切法判据是「判定归类 vs 类目本身 vs 汇装」,不是「用不用 AI」—— 规则层日后也搬进来,与模型层同域。

现状(立域时实测):Job Bank 帖自带官方码,填充 99.8%;第三方板与 ATS 不带码,mart 只靠标题规则猜,
填充 41%~67%,在招未分类 8,973 条。本域职位段五层逐级填空:① 源带码 ② 规则(日后自 mart 搬入)
③ bge-m3 候选检索 ④ qwen 只在候选里选、拿不准弃权 ⑤ 留空。公司段(NAICS)在设计稿里,待公司资料
补齐后开工 —— 设计稿 docs/design/分类清洗-20260915.md。

META = 域即役的调度声明:role=挂哪个角色容器(SOURCE 环境变量),interval=本域一轮的间隔秒;
入口固定 etl/classify/main.py,步骤清单在 main.py 里。
⚠ 2026-09-15:compose 还没有 classify 服务(批 2 才接),现阶段手动跑;判定要连局域网盒子,
Frank 不在家时整轮中止、不记失败(NET_ERRORS 闸,同 jdformat)。
"""
META = {
    "role": "classify",
    "method": "httpx",       # 对应 etl/sched/Dockerfile 通用轻镜像(只打局域网 Ollama,无浏览器)
    "interval": 3600,        # 1h(跟着 build 汇装节奏;本域产物下一轮汇装即入 mart)
    "seed": False,           # 只刷 processed/,灌库归 load 域 build 链
    "ping": True,            # 本角色唯一单元(心跳 URL 未配前 ping_health 自然跳过)
}
