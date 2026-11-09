# etl 学名词表

`etl/` 下每个目录是一个域：一个域 = 一个数据源或一道加工工序，五件套 `constants` / `scheme` / `functions` / `main` / `__init__`。目录名只能从下表选。

- **选名顺序**：数据源的官方名（Job Bank、IRCC、各省 PNP 项目名、Statistics Canada、LMIA、NOC 这类）→ 数据仓库 / 数据工程通用术语（raw、mart、crawl、load、sched 这类）→ 业务名（最后一档，表里注明）
- **表里没有合适的**：先在表里补一行，写上名字、出处和公认含义，再建目录
- **检查**：`etl/gate` ⑫号规读表格第一列，不在表里的域目录会被拦下
- **缩写**：名字是缩写的，公认含义开头写「全称 …。」
- **在用**：✓ 表示本项目已经有这个目录
- **不改名**：现有目录照现名登记，改名另起一批

## 数据源官方名

| 名字 | 出处 | 公认含义 | 在用 |
|---|---|---|---|
| `aip` | IRCC Atlantic Immigration Program | 全称 Atlantic Immigration Program（大西洋移民项目）。大西洋移民计划：四省指定雇主名录与岗位打标 | ✓ |
| `ats` | Applicant tracking system（招聘行业通用叫法） | 全称 applicant tracking system（招聘管理系统）。雇主自家招聘系统（Greenhouse、Lever、Workday 等）的公开接口抓岗 | ✓ |
| `careerbeacon` | CareerBeacon（careerbeacon.com） | CareerBeacon 大西洋四省岗位抓取 | ✓ |
| `dli` | IRCC Designated learning institutions | 全称 designated learning institution（指定学校）。指定学校里可申 PGWP 的子集 | ✓ |
| `ee` | IRCC Express Entry | 全称 Express Entry（快速通道）。联邦快速通道的类别抽选清单与抽选轮次 | ✓ |
| `fcip` | IRCC Francophone Community Immigration Pilot | 全称 Francophone Community Immigration Pilot（法语社区移民试点）。法语社区移民试点：社区名单、指定雇主与优先职业清单、名额状态 | ✓ |
| `fsa` | Forward sortation area（邮编前三位，Statistics Canada 人口普查词典有定义） | 全称 forward sortation area（邮编前三位）。邮编前三位到「区」的维度表，用 GeoNames 开放数据建 | ✓ |
| `gcjobs` | GC Jobs（Public Service Commission of Canada） | 全称 Government of Canada Jobs（联邦政府招聘网）。联邦公务员招聘网的公开岗位抓取 | ✓ |
| `hireac` | HireAC（Algonquin College） | 全称 HireAC（Hire Algonquin College，Algonquin College 校内招聘网）。Algonquin College 校内岗位板抓取 | ✓ |
| `hwcr` | 海外超人便民信息系统（hwcr.vip） | 全称 海外超人（haiwai chaoren）。海外超人渥太华站房屋帖，筛出 Lisgar 中学附近的出租单间 | ✓ |
| `indexing` | Google Indexing API | 主动通知 Google 职位上架与下架 | ✓ |
| `ircc` | Immigration, Refugees and Citizenship Canada | 全称 Immigration, Refugees and Citizenship Canada（加拿大移民、难民及公民部）。IRCC 开放数据：学签工签存量、PGWP 规则、官方规费、省移民难度指数 | ✓ |
| `jobbank` | Job Bank（ESDC） | Job Bank 全加拿大全职业抓岗，职位板的主源 | ✓ |
| `jobboom` | Jobboom（jobboom.com） | Jobboom 雇主直发岗抓取，剔除 Job Bank 转载 | ✓ |
| `jobillico` | Jobillico（jobillico.com） | Jobillico 全国职位板抓岗 | ✓ |
| `lmia` | ESDC Labour Market Impact Assessment | 全称 Labour Market Impact Assessment（劳动力市场影响评估）。雇主级 LMIA 获批记录，雇主池的证据源 | ✓ |
| `noc` | NOC 2021（Statistics Canada、ESDC） | 全称 National Occupational Classification（国家职业分类）。职业分类官方 CSV，加 TEER 与大中小类分类法的单一来源 | ✓ |
| `pnp` | IRCC Provincial Nominee Program | 全称 Provincial Nominee Program（省提名项目）。各省省提名的具名清单、门槛、分值、运营统计实时刷新 | ✓ |
| `pte` | Pearson PTE | 全称 Pearson Test of English。PTE Core 机经题库研究与新题雷达 | ✓ |
| `qs` | QS World University Rankings | 全称 Quacquarelli Symonds。QS 世界大学排名的加拿大子集，供学校表挂排名 | ✓ |
| `rcip` | IRCC Rural Community Immigration Pilot | 全称 Rural Community Immigration Pilot（乡村社区移民试点）。乡村社区移民试点：社区名单、指定雇主与优先职业清单、名额状态 | ✓ |
| `statcan` | Statistics Canada | 全称 Statistics Canada（加拿大统计局）。StatCan WDS 表：分省可比、按期排列的官方宏观统计 | ✓ |

## 数据仓库 / 数据工程通用术语

| 名字 | 出处 | 公认含义 | 在用 |
|---|---|---|---|
| `crawl` | Web crawling（数据工程通用叫法） | 官方移民站 URL 探索、站点地图比对（政策雷达）与页面原文缓存正门 | ✓ |
| `load` | ETL 的 Load（数据工程通用叫法） | 灌库层：管数据怎么进出本站数据库，挂跨源汇装链 | ✓ |
| `mart` | Data mart（数据仓库通用叫法） | 全称 data mart（数据集市）。跨源汇装层：把清洗好的各源拼成与数据库表一一对应的最终表（评分、主表、榜单、统计） | ✓ |
| `sched` | Scheduler（调度器，数据工程通用叫法） | 全称 scheduler（调度器）。ETL 调度器：常驻守护循环加开发机手动跑一轮 | ✓ |

## 业务名（没有标准名时才用）

| 名字 | 出处 | 含义 | 在用 |
|---|---|---|---|
| `citations` | 业务名 | 字段级来源注册表：逐个验证引用网址是否存活并抽标题原文 | ✓ |
| `classify` | 业务名 | 岗位与公司的分类判定 | ✓ |
| `company` | 业务名 | 公司实体：目录穷举、一司一档、招聘页定位、官网富化 | ✓ |
| `door` | 业务名 | 域门按序跑一串步骤的公共件：失败留痕、其余照跑、最后报成败（基础设施叶） | ✓ |
| `eligibility` | 业务名 | 联邦试点申请人门槛库，按官方原句锚定抓规则 | ✓ |
| `employers` | 业务名 | 雇主池：一行一雇主的全局表，加雇主按职业大类分桶的表 | ✓ |
| `explore` | 业务名 | 雇主探索队列的后台工人，处理用户列出过的雇主（如翻译雇主名） | ✓ |
| `fetch` | 业务名 | 抓取公共件：HTTP 客户端、限速、日期工具（基础设施叶） | ✓ |
| `gate` | 业务名 | etl 自查闸：形制规则、基线管理、写法债报告、跨进程锁自查 | ✓ |
| `jdformat` | 业务名 | 全称 job description format（职位描述整理）。岗位正文预生成五节整理版 | ✓ |
| `opswatch` | 业务名 | 运维页的探活与报警节拍：探活局域网 Ollama，触发站点判定报警 | ✓ |
| `log` | 业务名 | 域内日志唯一出口（基础设施叶） | ✓ |
| `minwage` | 业务名 | 全称 minimum wage（最低工资）。ESDC 最低工资数据库：各省法定最低工资、生效日期与历年调整 | ✓ |
| `names` | 业务名 | 公司名归一：判断两个公司名是不是同一家（基础设施叶） | ✓ |
| `news` | 业务名 | 官方移民新闻聚合（IRCC 与各省官方页），附中文翻译 | ✓ |
| `paths` | 业务名 | `data/` 目录布局的唯一真相与原子写盘（基础设施叶） | ✓ |
| `pathways` | 业务名 | 全国移民通道对照表，抽成统一字段便于对比 | ✓ |
| `richtext` | 业务名 | HTML 转带结构的纯文本（基础设施叶） | ✓ |
| `sites` | 业务名 | 有官网的在招公司：定期缓存官网原文，再由本地模型整理成事实 | ✓ |
| `wages` | 业务名 | 工资与空缺岗位的市场分母（ESDC 中位工资、StatCan 空缺岗位） | ✓ |

## References

- Immigration, Refugees and Citizenship Canada. (n.d.). *Atlantic Immigration Program*. <https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html>
- Wikipedia contributors. (n.d.). *Applicant tracking system*. Wikipedia. <https://en.wikipedia.org/wiki/Applicant_tracking_system>
- CareerBeacon. (n.d.). *CareerBeacon*. <https://www.careerbeacon.com>
- Immigration, Refugees and Citizenship Canada. (n.d.). *Designated learning institutions list*. <https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html>
- Immigration, Refugees and Citizenship Canada. (n.d.). *Express Entry: Category-based selection*. <https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations/category-based-selection.html>
- Immigration, Refugees and Citizenship Canada. (n.d.). *Francophone Community Immigration Pilot*. <https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration.html>
- Statistics Canada. (2017). *Dictionary, Census of Population, 2016: Forward sortation area (FSA)*. <https://www12.statcan.gc.ca/census-recensement/2016/ref/dict/geo036-eng.cfm>
- Public Service Commission of Canada. (n.d.). *GC Jobs*. <https://emploisfp-psjobs.cfp-psc.gc.ca>
- Algonquin College. (n.d.). *HireAC*. <https://hireac.algonquincollege.com>
- 海外超人. (n.d.). *海外超人便民信息系统*. <http://m.hwcr.vip/>
- Google. (n.d.). *Indexing API quickstart*. Google Search Central. <https://developers.google.com/search/apis/indexing-api/v3/quickstart>
- Immigration, Refugees and Citizenship Canada. (n.d.). *Immigration, Refugees and Citizenship Canada*. <https://www.canada.ca/en/immigration-refugees-citizenship.html>
- Employment and Social Development Canada. (n.d.). *Job Bank*. <https://www.jobbank.gc.ca/>
- Jobboom. (n.d.). *Jobboom*. <https://www.jobboom.com>
- Jobillico. (n.d.). *Jobillico*. <https://www.jobillico.com>
- Employment and Social Development Canada. (n.d.). *Temporary Foreign Worker Program: Labour Market Impact Assessment open data*. Open Government Portal. <https://open.canada.ca/data/en/dataset/90fed587-1364-4f33-a9ee-208181dc0b97>
- Statistics Canada & Employment and Social Development Canada. (2021). *National Occupational Classification (NOC) 2021*. <https://noc.esdc.gc.ca/>
- Immigration, Refugees and Citizenship Canada. (n.d.). *Provincial Nominee Program: Who can apply*. <https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html>
- Pearson. (n.d.). *PTE Academic*. <https://www.pearsonpte.com/>
- QS Quacquarelli Symonds. (n.d.). *QS World University Rankings*. <https://www.topuniversities.com/world-university-rankings>
- Immigration, Refugees and Citizenship Canada. (n.d.). *Rural Community Immigration Pilot*. <https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration.html>
- Statistics Canada. (n.d.). *Statistics Canada*. <https://www.statcan.gc.ca/>
