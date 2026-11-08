# lib 学名词表

`lib/` 下每个目录是一个领域模块：一个目录加一道桶门（`index.ts`；只在服务端用的域门叫 `server.ts`），外部一律从桶门取。目录名只能从下表选。

- **选名顺序**：Web 标准 / HTTP / 浏览器 API → 加拿大移民与劳动力官方术语（IRCC、NOC、PNP、LMIA、CRS、CLB、Job Bank）→ 通用领域名（i18n、auth、db、log 这类）→ 业务名（最后一档，表里注明）
- **表里没有合适的**：先在表里补一行，写上名字、出处和公认含义，再建目录
- **检查**：ESLint 规则 `local/registered-domain` 读表格第一列，不在表里的目录在提交时会被拦下
- **缩写**：名字是缩写的，公认含义开头写「全称 …。」
- **在用**：✓ 表示本项目已经有这个域
- **不改名**：现有目录照现名登记，改名另起一批

## 加拿大移民与劳动力官方术语

| 名字 | 出处 | 公认含义 | 在用 |
|---|---|---|---|
| `employers` | Job Bank Employers | 雇主板：筛选枚举、雇主对比、雇主行的取数 | ✓ |
| `jobs` | Job Bank Jobs | 职位：匹配引擎、来源标签、过期判定与职位行的取数 | ✓ |
| `lmia` | ESDC Labour Market Impact Assessment（LMIA） | 全称 Labour Market Impact Assessment（劳动力市场影响评估）。LMIA 口径：免 LMIA 行业判定、高低薪档 | ✓ |
| `noc` | NOC 2021 | 全称 National Occupational Classification（国家职业分类）。职业分类的显示：大类名、配色、职业本地译名 | ✓ |
| `pte` | Pearson PTE Academic | 全称 Pearson Test of English。PTE 刷题要经 HTTP 的部分：取音频、练过记录 | ✓ |

## 通用领域名

| 名字 | 出处 | 公认含义 | 在用 |
|---|---|---|---|
| `auth` | 通用叫法（authentication） | 全称 authentication（身份认证）。登录会话：Google 登录、会话 cookie、登录回跳 | ✓ |
| `db` | 通用叫法（database） | 全称 database（数据库）。数据库层：连库、默认值词汇表、全站 SQL 文本 | ✓ |
| `error` | 通用叫法 | 全站唯一的造错与判错入口 | ✓ |
| `i18n` | W3C Internationalization（i18n） | 全称 internationalization（国际化；i 与 n 之间 18 个字母）。多语言文案：中、英、韩一语一文件 | ✓ |
| `llm` | 通用叫法（large language model） | 全称 large language model（大语言模型）。调模型的唯一入口，简历、翻译、对话都从这里取 | ✓ |
| `location` | 通用叫法 | 地点：省码省名、地址解析、地图链接 | ✓ |
| `log` | 通用叫法 | 全站唯一的日志留痕入口 | ✓ |
| `mail` | 通用叫法 | 发信：发一封、退订与确认 token、发信开关 | ✓ |
| `seo` | 通用叫法（search engine optimization） | 全称 search engine optimization（搜索引擎优化）。给搜索引擎看的内容：robots 拼装 | ✓ |
| `stripe` | Stripe API（支付服务商） | 支付：结账、付款记录、支付回调 | ✓ |
| `time` | 通用叫法 | 日期与时间的唯一显示口径，按渥太华时间渲染 | ✓ |
| `version` | 通用叫法 | 部署身份：线上此刻跑的是哪个提交 | ✓ |

## 业务名（没有标准名时才用）

| 名字 | 出处 | 含义 | 在用 |
|---|---|---|---|
| `agent` | 业务名 | 对话兜底：把用户原话解析成槽位 | ✓ |
| `alerts` | 业务名 | 职位提醒：订阅偏好、确认与退订、定时发送 | ✓ |
| `apply` | 业务名 | 站内投递：求职信填空、投递起始态、发件人与收件人 | ✓ |
| `bots` | 业务名 | 挡爬虫判定 | ✓ |
| `cv` | 业务名 | 全称 curriculum vitae（简历）。生成简历：草稿排成英文简历版式与 PDF | ✓ |
| `funnel` | 业务名 | 转化漏斗：漏斗各步的计数与转化率 | ✓ |
| `gauge` | 业务名 | 量尺：官方门槛与用户情况逐条对照 | ✓ |
| `guest` | 业务名 | 访客：注册框何时弹出、刚登录过的标记 | ✓ |
| `guide` | 业务名 | 站内向导：把用户的话导到对应页面 | ✓ |
| `inbox` | 业务名 | 收件箱：收信、读信、转发与回信 | ✓ |
| `legal` | 业务名 | 法务四页正文 | ✓ |
| `majors` | 业务名 | 专业：专业清单与搜索 | ✓ |
| `mart` | 业务名 | 全称 data mart（数据集市）。数据交接：上传 mart 文件、灌进正式库 | ✓ |
| `myjobs` | 业务名 | 我的岗位：两张表共用的行格式 | ✓ |
| `news` | 业务名 | 移民新闻的摘要与译文行 | ✓ |
| `notify` | 业务名 | 站内通知：取通知、标已读 | ✓ |
| `official` | 业务名 | 官方资料：官方原句的译名、官方资源导航 | ✓ |
| `pathways` | 业务名 | 移民通道：通道注册表、按身份与教育经历筛通道 | ✓ |
| `plan` | 业务名 | 路径规划：排序与几步能到的推演 | ✓ |
| `points` | 业务名 | 分值：按各省官方分值表给档案算分 | ✓ |
| `profile` | 业务名 | 档案：改写账号档案 | ✓ |
| `ops` | SWEBOK 第 6 章 Software Engineering Operations | 全称 operations(运维)。运维页的页面清单、按页取数与删除 | ✓ |
| `queue` | 业务名 | 管理员队列：数据更新单元的状态与移除 | ✓ |
| `quiz` | 业务名 | 答题：答案的读写与服务端同步 | ✓ |
| `quota` | 业务名 | 配额：免费与 Pro 的各项上限、限流 | ✓ |
| `rankings` | 业务名 | 榜单：榜单清单与行 | ✓ |
| `resume` | 业务名 | 简历：上传文件取字、简历与职位描述对照 | ✓ |
| `ruling` | 业务名 | 判定：判定用底表的取数与案例清单 | ✓ |
| `stats` | 业务名 | 全称 statistics（统计）。统计：职业大类、省份与城市的统计取数 | ✓ |
| `track` | 业务名 | 埋点：功能事件上报 | ✓ |
| `traffic` | 业务名 | 流量：出站流量记账 | ✓ |

## References

- Employment and Social Development Canada. (n.d.). *Job Bank: Job search*. <https://www.jobbank.gc.ca/jobsearch/>
- Employment and Social Development Canada. (n.d.). *Job Bank: Employers*. <https://www.jobbank.gc.ca/employers>
- Employment and Social Development Canada. (n.d.). *Hire a temporary foreign worker: Labour Market Impact Assessment*. <https://www.canada.ca/en/employment-social-development/services/foreign-workers.html>
- Statistics Canada & Employment and Social Development Canada. (2021). *National Occupational Classification (NOC) 2021*. <https://noc.esdc.gc.ca/>
- Pearson. (n.d.). *PTE Academic*. <https://www.pearsonpte.com/>
- World Wide Web Consortium. (n.d.). *W3C Internationalization (i18n)*. <https://www.w3.org/International/>
- Stripe. (n.d.). *Stripe API reference*. <https://docs.stripe.com/api>
