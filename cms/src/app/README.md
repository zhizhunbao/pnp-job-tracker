# app 学名词表

`app/` 下的目录名就是网址：`(frontend)/<名字>` 是公开页面的路径，`api/<名字>` 是接口路径的第一段。目录名只能从下表选。

- **选名顺序**：网站通用页名 → Job Bank、IRCC、加拿大官方分类的叫法 → 业务名（最后一档，表里注明）
- **表里没有合适的**：先在表里补一行，写上名字、出处和公认含义，再建目录
- **检查**：ESLint 规则 `local/registered-domain` 读表格第一列，不在表里的目录在提交时会被拦下；`api/` 下的名字也认 [lib 学名词表](../lib/README.md)
- **缩写**：名字是缩写的，公认含义开头写「全称 …。」
- **在用**：✓ 表示本项目已经有这个目录
- **不改名**：现有路由就是线上网址，Google 已收录、招聘富结果挂着；要改必须带 301 跳转，另起一批做
- **不登记**：`(payload)/` 是 Payload 后台自带的，不归本表

## 页面 `(frontend)/`

### 网站通用页

| 名字 | 出处 | 公认含义 | 在用 |
|---|---|---|---|
| `about` | 网站通用页 About | 关于本站 | ✓ |
| `account` | 网站通用页 Account | 登录后的「我的」：求职、收件箱、简历、档案、订阅 | ✓ |
| `legal` | 网站通用页 Legal | 免责声明与法律条款 | ✓ |
| `news` | 网站通用页 News | 移民新闻列表 | ✓ |
| `pricing` | 网站通用页 Pricing | 定价 | ✓ |
| `resources` | 网站通用页 Resources | 官方资源导航 | ✓ |

### 官方叫法

| 名字 | 出处 | 公认含义 | 在用 |
|---|---|---|---|
| `employers` | Job Bank Employers | 雇主板：能走省提名的雇主 | ✓ |
| `jobs` | Job Bank Jobs | 职位板（根路径 `/` 直出，`/jobs` 301 回根） | ✓ |
| `occupations` | NOC 2021 Occupations | 紧缺职业清单 | ✓ |
| `pte` | Pearson PTE Academic | 全称 Pearson Test of English。PTE 刷题，一页一种题型 | ✓ |
| `streams` | IRCC Provincial Nominee Program streams | 各省移民通道与门槛 | ✓ |

### 业务名（没有标准名时才用）

| 名字 | 出处 | 含义 | 在用 |
|---|---|---|---|
| `cases` | 业务名 | 常见案例索引（SEO 落地页） | ✓ |
| `city` | 业务名 | 按省按城市的落地页 | ✓ |
| `companies` | 业务名 | 公司详情页 | ✓ |
| `funnel` | 业务名 | 转化漏斗五个数，只给管理员 | ✓ |
| `plan` | 业务名 | 决策页：答题后三项判定 | ✓ |
| `queue` | 业务名 | 管理员队列页 | ✓ |
| `rankings` | 业务名 | 榜单 | ✓ |
| `start` | 业务名 | 就业把脉首页 | ✓ |
| `steps` | 业务名 | 资讯里的「申请步骤」 | ✓ |
| `timeline` | 业务名 | 政策时间线 | ✓ |

## 接口 `api/`

第一段与 lib 的域同名（`api/resume` 的芯在 `lib/resume`），名字以 [lib 学名词表](../lib/README.md) 为准。下面只登记 lib 里没有的：

| 名字 | 出处 | 公认含义 | 在用 |
|---|---|---|---|
| `og` | Open Graph protocol | 全称 Open Graph。分享卡片图（芯在 `components/og`） | ✓ |
| `seed` | 数据库 seed（通用叫法） | 灌库（芯在 `lib/mart`；`app/seed` 是旧址过渡壳，容器换代后删） | ✓ |
| `sitemaps` | Sitemaps protocol | 站点地图 | ✓ |

## References

- Employment and Social Development Canada. (n.d.). *Job Bank: Job search*. <https://www.jobbank.gc.ca/jobsearch/>
- Employment and Social Development Canada. (n.d.). *Job Bank: Employers*. <https://www.jobbank.gc.ca/employers>
- Statistics Canada & Employment and Social Development Canada. (2021). *National Occupational Classification (NOC) 2021*. <https://noc.esdc.gc.ca/>
- Immigration, Refugees and Citizenship Canada. (n.d.). *Provincial Nominee Program: Who can apply*. <https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html>
- Pearson. (n.d.). *PTE Academic*. <https://www.pearsonpte.com/>
- The Open Graph protocol. (n.d.). *Basic metadata*. <https://ogp.me/#metadata>
- sitemaps.org. (n.d.). *Sitemaps XML format*. <https://www.sitemaps.org/protocol.html>
