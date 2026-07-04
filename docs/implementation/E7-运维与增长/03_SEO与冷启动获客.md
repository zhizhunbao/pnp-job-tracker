# E7-03 · SEO 基建 + 冷启动获客

> Epic **E7 运维与增长** · 负责人 Frank · 3 SP · Sprint 3 · 批次 B7
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

自然流量入口就位（sitemap/meta/收录），并在目标社区完成首批曝光拿真实反馈。

## 2. 验收标准

- [ ] `sitemap.xml`（/jobs、/rankings/*、/pricing、legal、about）与 `robots.txt` 可访问；Google Search Console 提交并开始收录。
- [ ] 核心页 `generateMetadata` 三语 title/description（榜单页为 SEO 主体，E5-02 已做的核对即可）。
- [ ] 目标社区各发 1 帖（小红书 / Reddit r/ImmigrationCanada 或 r/PNP / 相关微信群），带 UTM；首批反馈整理成 backlog 条目。

## 3. 实现步骤

- [ ] **3.1** `app/sitemap.ts` + `app/robots.ts`（Next 原生约定，零依赖）。
- [ ] **3.2** 各页 metadata 补齐；OG 标签（分享卡片标题/描述，图先用文字卡或跳过——YAGNI）。
- [ ] **3.3** Search Console 验证域名 + 提交 sitemap。
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
