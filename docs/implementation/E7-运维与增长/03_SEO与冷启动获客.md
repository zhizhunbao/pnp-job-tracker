# E7-03 · SEO 基建 + 冷启动获客

> Epic **E7 运维与增长** · 负责人 Frank · 3 SP · Sprint 3 · 批次 B7
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

自然流量入口就位（sitemap/meta/收录），并在目标社区完成首批曝光拿真实反馈。

## 2. 验收标准

- [x] `sitemap.xml`（/jobs、/rankings/*、/pricing、legal、about）与 `robots.txt` 可访问；Google Search Console 提交并开始收录。（2026-07-05 ✅）
- [ ] 核心页 `generateMetadata` 三语 title/description（榜单页为 SEO 主体，E5-02 已做的核对即可）。
- [ ] 目标社区各发 1 帖（小红书 / Reddit r/ImmigrationCanada 或 r/PNP / 相关微信群），带 UTM；首批反馈整理成 backlog 条目。

## 3. 实现步骤

- [x] **3.1** `app/sitemap.ts` + `app/robots.ts`（Next 原生约定，零依赖）。
- [x] **3.2** 各页 metadata 补齐；OG 标签（分享卡片标题/描述，图先用文字卡或跳过——YAGNI）。
- [x] **3.3** Search Console 验证域名 + 提交 sitemap。（2026-07-05:URL-prefix property `https://pnp-cms.onrender.com/`;**meta 法失败**——根路径 307 → /jobs,GSC 验证器不吃跳转页上的 meta,layout 的 `metadata.verification` 保留备用;**改 HTML 文件法一次过**(`cms/public/google021724190957bb4b.html`,验证长期有效勿删);sitemap.xml 提交 Status=Success,当场 Discovered 119 页。正式域名定了后需重建 property 重提。）
- [ ] **3.4** 发帖文案三平台各一（价值主张=移民信号+日更+免费可查），UTM 链接，发布后 72h 收集反馈记 §5。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| `cms/src/app/sitemap.ts` · `robots.ts`（新） | SEO 基建 |
| 各 page 的 generateMetadata | meta |

## 5. 首批反馈记录

- 渠道/曝光/注册转化/原话反馈：___

## 6. 完成定义（DoD）

- [ ] §2 全勾；反馈落档并转化为 backlog。

---

## 7. 实施记录(2026-07-05 凌晨,B8)

- sitemap.ts:核心 9 页 + 榜单 2 + stats 全矩阵(10 省 × 11)= 121 URL;robots.ts 挡 /admin /api /account。/jobs 补专属 metadata(中英混排);layout 默认 metadata B7 已修。OG 图按 YAGNI 跳过(文字卡都没做,分享卡用 title/desc)。
- **剩余=用户手动**:① Google Search Console 验证站点(pnp-cms.onrender.com;正式域名后重提)+ 提交 sitemap;② 三平台发帖(小红书/Reddit/微信群,带 UTM ?utm_source=xhs 等)——文案素材:三问定位+免费档案匹配+每日更新;72h 反馈记 §5。

## 8. 上线获客 playbook(2026-07-06,方向拍板=推上线/获客)

**线上核查(2026-07-06)**:offer2pr.com/robots.txt 200 · sitemap.xml 200 · 119 URL live。SEO 基建就绪。

### 8.1 账号状态(**五个账号 M4 已全办**,见 [[ops-accounts-workflow]];剩的不是建账号,是**指向新域名 offer2pr.com**)
| 账号 | 状态 | 剩余(=对齐 offer2pr.com) |
|---|---|---|
| healthchecks.io / UptimeRobot / umami | ✅ 跑通,与域名无关 | 无 |
| **Resend** | ✅ 账号+key(Render);当时测试模式只能发账户本人 | **在 Resend 验证 offer2pr.com 发信域名**(加 SPF/DKIM DNS)→ 才能给真实用户发提醒 |
| **GSC** | ✅ 验过,但 property=旧域名 pnp-cms.onrender.com | **给 offer2pr.com 建新 property + 重提 sitemap**(DNS TXT 或 HTML 文件法,后者有先例) |

**分工**(见 [[ops-accounts-workflow]]):DNS 记录/密钥你亲手加;仪表盘点选(建 property、提 sitemap、点验证)我经 claude-in-chrome 驱动你的 Chrome。

### 8.2 冷启动发帖文案(草稿,待你发;**发前查各版块 self-promo 规则**,Reddit 移民版对硬广很敏感,价值优先、明说自制、求反馈)

**Reddit(r/ImmigrationCanada · r/canadaexpressentry · r/PersonalFinanceCanada 不合适跳过)** — 英文,价值+求反馈体:
> **标题**:I built a free job board that tags every posting with its PNP stream / EE category / wage-vs-median — looking for accuracy feedback
> **正文**:Cross-referencing each job's NOC against provincial PNP lists, EE categories and ESDC median wages by hand was driving me nuts, so I built a tool that does it automatically across all 10 provinces, updated daily. It's free to browse. You can also enter your NOC/CRS profile and it flags which jobs match your pathway. Not a consultant, not selling anything for the browse tier — I'd genuinely like feedback on whether the PNP/wage tagging is accurate for your occupation. Link: offer2pr.com/jobs?utm_source=reddit — happy to fix anything that's wrong.

**小红书** — 中文,痛点+个人口吻+截图引导:
> **标题**:🍁加拿大找工作还要自己查省提名?我做了个免费工具
> **正文**:润加拿大最烦的一步:看到个 job,还得手动查它属不属于省提名紧缺、EE 哪个类别、工资比当地中位高还是低……我把这些全自动化了,全加拿大日更,每个岗位直接标好 PNP/EE/工资信号,免费看。填一下自己的 NOC 还能看哪些岗匹配你的移民路径。不是中介、不卖课,就想验证下数据准不准,欢迎来挑错👉 offer2pr.com?utm_source=xhs (配图:职位列表 + 某岗弹窗的 PNP/工资/LMIA 信号)

**微信群(加拿大移民/留学群)** — 中文,一句话+链接:
> 做了个免费的加拿大职位板,每个岗位自动标好属不属于省提名/EE/工资对比,全国日更,还能按自己 NOC 匹配移民路径。不是中介,求反馈找 bug:offer2pr.com?utm_source=wechat

### 8.3 发布后 72h 看什么(记 §5)
- UTM 分渠道:哪个源来人 / 注册转化 / 建档率(付费漏斗第一环)。
- 原话反馈尤其「数据不准」的具体岗——直接进 backlog,这就是痛点驱动下一步抓什么数据的真实输入。
