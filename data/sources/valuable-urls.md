# 数据源 URL 登记表（雇主 offer 省提名挖宝 · 总索引）

> 整条流水线的 seed/索引。状态标注：✅ 已抓 · ⏳ 已验证URL未抓 · ❓ 待定位正确URL · 📄 PDF · 🔒 JS渲染/反爬
> 目标：穷举各地域雇主 → 进官网 careers 页 → 抓真实在招（绕开 Job Bank/聚合站的稀薄+中介噪音）

---

## A. 职位数据源（谁在招）

| 用途 | URL / 接口 | 状态 | 备注 |
|---|---|---|---|
| **Job Bank 搜索** | `https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=<kw>&fprov=<省>&sort=D&page=<N>` | ✅ 已抓 | 服务端按省过滤`fprov`有效；浅井(全国~400科技岗,多为中介转载)；脚本 `scripts/jobs/jobbank_scraper.py` |
| **LinkedIn Jobs** | `https://www.linkedin.com/jobs/search/?keywords=<kw>&location=<city>` | 🔑 可抓(需登录) | 量最大、最真。用**自己账号**登录后抓(Playwright持久profile,登录一次复用)。⚠️违反ToS、有封号风险,自担 |
| **Indeed** | `https://ca.indeed.com/jobs?q=<kw>&l=<city>` | 🔑 可抓(需登录) | 同上,登录后绕过部分反爬;Canada站点量大 |
| CareerBeacon（大西洋）| `https://www.careerbeacon.com/` | ⏳ | 大西洋四省主力招聘站,比Job Bank全,免登录 |

## B. 公司目录（雇主全集,按地域穷举）

| 地域 | 目录 | URL | 状态 |
|---|---|---|---|
| 渥太华·Kanata North | KNBA 会员目录 | `https://www.kanatanorthba.com/member-directory/` | ✅ 已抓 520家 |
| 渥太华·Kanata North | **数据接口(逆向)** | `https://www.kanatanorthba.com/wp-admin/admin-ajax.php?action=elevatex_load_more_companies&paged=1&posts_per_page=1000` | ✅ 直取JSON |
| 渥太华·全市 | Invest Ottawa | `https://www.investottawa.ca/`（企业目录子页 404,待找）| 🔒❓ 待定位 |
| 滑铁卢 | Communitech | communitech.ca | ❓ 待定位目录页 |
| 多伦多 | MaRS | marsdd.com | ❓ 待定位 |
| 卡尔加里 | Platform Calgary | platformcalgary.com | ❓ 待定位 |
| 埃德蒙顿 | Edmonton Unlimited | edmontonunlimited.com | ❓ 待定位 |
| AI·阿省 | Amii | amii.ca | ❓ 待定位 |
| 温哥华 | BC Tech | wearebctech.com | ❓ 待定位 |
| 萨斯卡通 | Co.Labs | colab.ca | ❓ 待定位 |
| 哈利法克斯·NS | Volta | `https://voltaeffect.com/`（/companies 404）| 🔒❓ |
| 圣约翰斯·NL | Genesis Centre | `https://genesiscentre.ca/`（首页含89外链,可抓）| ⏳ |
| 新不伦瑞克·NB | Venn Innovation | `https://www.venninnovation.com/` | 🔒 JS |

> 经验:这类目录多为 JS SPA,BFS抓不到→须**逆向其数据接口**(如KNBA的admin-ajax);并防停放域名(kanatanorth.com是待售域名,真站kanatanorthba.com)。

## C. 官方"担保雇主"名单（AIP指定雇主,唯一官方来源)

| 省 | URL | 状态 | 规模/科技占比 |
|---|---|---|---|
| 纽芬兰与拉布拉多 NL | `https://www.gov.nl.ca/immigration/employer/`（可搜索网页目录）| ✅ 已抓94(样本) | ~13%科技(噪音高,真科技3-4家)|
| 新不伦瑞克 NB | `https://www2.gnb.ca/content/dam/gnb/Corporate/Promo/Immigration/designated-employers-employeurs-designes.pdf` | ✅📄 已抓1262 | ~4%科技 |
| 新斯科舍 NS | `https://liveinnovascotia.com/sites/default/files/2024-07/Designated_AIP_employers.pdf` | ✅📄 已抓1561 | ~4%科技 |
| 爱德华王子岛 PE | `https://www.princeedwardisland.ca/en/topic/atlantic-immigration-program`（列表不在此页）| ❓ 待定位源 | 共364家 |

> 结论:大西洋官方名单权威但90%+餐饮/零售/护理,科技极稀→只作兜底对照,非主战场。

## D. 移民项目 / 政策(规则参考,已爬入 data/crawl/)

| 省/项目 | 关键页 | 状态 |
|---|---|---|
| 安省 OINP | ontario.ca/page/ontario-immigrant-nominee-program-oinp（9通道2026-05-30废止,合并版待公布）| ✅ 已爬 |
| 安省 OINP 雇主Offer | ontario.ca/page/oinp-employer-job-offer-international-student-stream | ✅ 已爬 |
| 萨省 SINP Tech | saskatchewan.ca/.../sinp-innovation-tech-talent-pathway | ✅ 已爬 |
| 阿省 AAIP Tech | `https://www.alberta.ca/system/files/.../lbr-aaip-tech-pathway-nocs-codes-list.pdf` | ✅ |
| 纽芬兰 NLPNP Priority Skills | gov.nl.ca/immigration | ✅ 已爬 |
| 全省政策主表 | 见 `scripts/crawl/sources-canada.md` | ✅ |

## E. ATS 招聘系统接口(Stage 3:从公司官网取在招岗)

| ATS | JSON接口模式 | 备注 |
|---|---|---|
| Greenhouse | `https://boards-api.greenhouse.io/v1/boards/<token>/jobs?content=true` | 公开,最干净 |
| Lever | `https://api.lever.co/v0/postings/<company>?mode=json` | 公开 |
| BambooHR | `https://<sub>.bamboohr.com/careers/list` | Kanata North 最多(11家)|
| Workable | `https://apply.workable.com/api/v3/accounts/<slug>/jobs` | |
| Recruitee | `https://<sub>.recruitee.com/api/offers/` | |
| SmartRecruiters | `https://api.smartrecruiters.com/v1/companies/<id>/postings` | 公开 |
| Workday/myworkdayjobs | `https://<tenant>.<dc>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs` (POST) | Kanata North 最多(15家),最难 |

> Kanata North 198家科技公司→134家有careers页,44家用上述标准ATS(可直取JSON)。明细 `data/companies/kanata-north-careers.json`。

---

## 数据组织约定：一个公司 = 一个文件夹

```
data/companies/<region>/<company-slug>/
    profile.json    身份:名称/官网/邮箱/电话/行业/地址/region
    careers.json     careers页URL + ATS类型 (Stage 2)
    jobs.json        从公司官网/ATS抓的在招岗 (Stage 3)
    linkedin.json    LinkedIn 该公司职位 (需登录)
    indeed.json      Indeed 该公司职位 (需登录)
```
- 已建:`data/companies/ottawa-kanata-north/` 共 520 个公司文件夹(134 个已含 careers.json)。
- 物化脚本:`scripts/jobs/build_company_folders.py`；每区一个 `_index.json` 总览。
- 各源数据**都写进对应公司文件夹**,以公司为中心聚合(而非按源散落)。

> LinkedIn/Indeed 登录抓取需 **Playwright**(持久 profile 登录一次复用) —— 当前**未安装**,做这步前先 `uv pip install playwright && playwright install chromium`。

## 待办（按价值排序）

1. **Stage 3**:抓 Kanata North 44家 ATS 的真实在招岗(终点:可投递清单)
2. 复制逆向法到 **萨省/阿省** 的科技园目录(有科技密度的省)
3. 定位 **Invest Ottawa / PE名单 / 各孵化器目录** 的正确URL
4. 评估 CareerBeacon(大西洋职位)

*维护:新发现的源随手登记到本表。`scripts/` 下各脚本是本表的执行器。*
