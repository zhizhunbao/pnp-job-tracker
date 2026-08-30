# PNP Job Tracker — offer2pr.com

每日更新的全加拿大全职业职位板,移民价值视角:替「分数不够、要靠雇主 offer / 地方通道翻盘」的求职移民者,把从看岗到拿身份的每一步查证与决策代劳。

- 状态 · 主线 · 计划:[STATUS.md](STATUS.md)
- 产品(用户故事版):[docs/prd.md](docs/prd.md)
- 工程宪法:[CLAUDE.md](CLAUDE.md)

架构:`etl/`(Python 抓取→清洗→评分→mart)→ `cms/`(Payload + Next.js + Postgres)→ 公开页。跑起来看 CLAUDE.md「跑起来」一节。
