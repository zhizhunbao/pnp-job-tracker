# docs/design 学名词表

`docs/design/` 下每个目录是网站的一个模块，设计文档与图都住进对应模块（图放 `<模块>/img/<文档名>/`）。目录名只能从下表选。

- **选名顺序**：Job Bank、IRCC 网站上的板块叫法 → 业务名（最后一档，表里注明）
- **表里没有合适的**：先在表里补一行，写上名字、出处、公认含义、内容来源、界面来源，Frank 点头后再建目录
- **检查**：设计文档不是代码，没有自动拦截；规矩写在 CLAUDE.md 原则 1
- **在用**：✓ 表示本项目已经有这个目录
- **页签不是模块**：「我的」下的我的求职、我的简历这类是页签，一个页签一份文档，住进「我的」

## 官方叫法

| 名字 | 出处 | 公认含义 | 内容来源 | 界面来源 | 在用 |
|---|---|---|---|---|---|
| `职位` | Job Bank Jobs | 每日更新的全加拿大全职业职位板，带移民信号（能不能走省提名） | Job Bank 职位、雇主招聘系统（ATS）、Jobillico、Jobboom | 站内职位板（全站基准） | ✓ |
| `雇主` | Job Bank Employers | 按职业大类看哪些雇主能走省提名：指定雇主、LMIA 获批、在招岗命中紧缺清单 | IRCC LMIA 获批名单、各省指定雇主名单、雇主官网 | 照职位板 | ✓ |
| `我的` | Job Bank Plus account | 求职者自己的东西：我的求职、收件箱、我的简历、我的档案、我的订阅、账户设置 | Job Bank Plus 账户（Resume Builder、Job Alerts、Job Match） | Azure 门户 + 站内通用组件 | ✓ |

## 业务名（没有标准名时才用）

| 名字 | 出处 | 含义 | 内容来源 | 界面来源 | 在用 |
|---|---|---|---|---|---|
| `就业把脉` | 业务名 | 用官方数据替用户下判断：分省、分职业看在招、紧缺、雇主、抽选与 PR 获批 | IRCC、Statistics Canada、Job Bank 劳动力市场信息、各省 PNP 官网 | Azure 概览页 + 站内通用组件 | ✓ |
| `资讯` | 业务名 | 移民通道的门槛、申请步骤、抽选与政策公告 | IRCC 与各省 PNP 官网原文 | Azure + 站内通用组件 | ✓ |
| `通用` | 业务名 | 跨模块共用的功能与界面形：付费、管理员队列、弹框、表格、胶囊 | 无 | Microsoft Fluent 2、Azure | ✓ |
| `数据层` | 业务名 | 抓取、清洗、汇装、灌库（`etl/`），给其他模块供数 | Job Bank、ATS、IRCC、各省 PNP 官网、Statistics Canada | 无 | ✓ |

## References

- Employment and Social Development Canada. (n.d.). *Job Bank: Job search*. <https://www.jobbank.gc.ca/jobsearch/>
- Employment and Social Development Canada. (n.d.). *Job Bank: Employers*. <https://www.jobbank.gc.ca/employers>
- Employment and Social Development Canada. (n.d.). *Job Bank: Create a Plus account*. <https://www.jobbank.gc.ca/login>
- Microsoft. (n.d.). *Fluent 2 Design System*. <https://fluent2.microsoft.design/>
