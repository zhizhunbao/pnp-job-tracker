# ynwac 机经库同源对照分析

> 2026-09-01 研究笔记(私有,不上线)。对象 = `data/processed/pte/ynwac-bank.json`(ynwac 前端 bundle 抽取,939 题 / 19 组)。
> 问题:ynwac 的题从哪来?各家机经是不是同源?和公开数据一致吗?
> 结论先行:**ynwac 题库无原创 —— 是共享机经池的下游镜像(duoink 键控),用免费/廉价云 API 拼装;跨平台同源已实证。**

## 1. 量化画像(939 题)

| 组 | 题型(best-effort) | 题数 | isImportant | isFrequent | duoink ID | 中文机翻 | 图 | 音 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 0 | ASQ 回答简短问题 | 62 | | | | | | |
| 1 | DI 看图说话 | 27 | | | | | 27 | |
| 2 | R&W 填空(拖拽) | 51 | | | | | | |
| 3 | R&W 填空(拖拽) | 82 | 33 | | | 71 | | |
| 4 | R 填空(下拉) | 67 | 60 | | | 66 | | |
| 5 | SST 听力缩写 | 20 | | | | | | 20 |
| 6 | L-MCM 听力多选 | 30 | | | | | | |
| 7 | L-MCS 听力单选 | 34 | | | | | | |
| 8 | L-FIB 听力填空 | 27 | | | | | | |
| 9 | RA 朗读 | 43 | 17 | | **37** | | | |
| 10 | R-MCM 阅读多选 | 24 | | | | | | |
| 11 | R-MCS 阅读单选 | 23 | | | | | | |
| 12 | ROP 段落排序 | 43 | | | | | | |
| 13 | RS/WFD 句库(体裁无法从字段分) | 183 | 3 | | | | | |
| 14 | **RTS 情景应答(抽读确证)** | 50 | 1 | | | | | |
| 15 | 短文 ×8(疑 Write Essay 素材,未定) | 8 | | | | | | |
| 16 | SWT 写作缩写 | 15 | | | | | | |
| 17 | **Write Email(抽读确证;content 全是坏占位符「Template content loaded from CSV」,正文丢失,desc 可用)** | 13 | | | | | | |
| 18 | WFD 听写(isFrequent 押题层在此) | 137 | 4 | 80 | | | | |
| **合计** | | **939** | **118** | **80** | **37** | **137** | **27** | **20** |

> ⚠ 题型标签是按字段签名的 best-effort;2026-09-01 抽读确证:arr14=RTS(50)、arr17=Write Email(13,content 坏占位正文丢失是 ynwac 自身数据 bug);arr13/arr18 是 RS/WFD 两个句库(哪个是哪个字段分不出,arr18 带 isFrequent 押题层更像 WFD 高频);arr15=8 篇短文疑 Write Essay 素材未定。不影响同源结论。

**读出来的事实:**
- **预测标记**:`isImportant` 118 题、`isFrequent` 80 题(全在 WFD 组)—— 这是他们"高频/重点"的机经预测**人工策展层**,不是题本身,是"押题"卖点。
- **duoink 跨平台 ID**:43 道 RA 里 **37 道带 `duomoLink → duoink.co/pte/entry/part/RA/<ObjectId>`** —— 直接坐实 ynwac 是 duoink 下游。
- **中文是机翻**:137 题带 `contentTranslation`,来源 = `translate.googleapis.com`(gtx 免费接口,经 3 个 CORS 代理轮询),非人工。
- **资产**:27 张 DI 图(公开可下,已抓)、20 段听力音频(Azure TTS 合成,付费墙后)。
- **库内复用**:810 段长文本里 4 段重复出现(同一张柱状图描述被 3 道 DI 题复用等)—— 内部也偷懒。

## 2. 跨平台同源(实证)

同一道题在多个 PTE 平台一字不差、各自编号:

| ynwac | 别家 | 文本 |
|---|---|---|
| RA id=1 | PTE King `RA #39` · TryPTE `Q27` · 79score/hotshot24/onepte | "Yellow is considered as the most optimistic color. Yet surprisingly, people lose their tempers more often in yellow rooms…" |

- **一池多编号** = 各平台从同一个考生回忆池抄题,只是内部各自编号。
- ynwac 的"Yellow"是**截短版**(缺官方原文后半"it speeds metabolism… post-it notes"),说明不是从统一权威源同步,是各自转录/裁剪 —— 更像手抄传播,不是授权分发。

## 3. 公开源重用(部分题干本就不是"考题原创")

- arr#3 一段 R&W 填空正文是真实新闻:曼彻斯特大学 "Brain Bus" 科普活动报道(`Organiser Dr Stuart Allan, lecturer at the Faculty of Life Sciences, explains…`)。
- SST 音频命名 `canada_news_1..20.mp3` —— 加拿大新闻题材。
- 即题干素材多为**公开网络/新闻文本**被 PTE 改造成题,不是 Pearson 独家创作。

## 4. 来源解剖(ynwac 数据管线)

| 层 | 来源 | 性质 |
|---|---|---|
| 题库本体 | **duoink.co**(机经池,RA 带其 ObjectId) | 下游镜像 |
| 中文翻译 | Google 翻译(gtx + CORS 代理) | 机翻 |
| 单词释义 | dictionaryapi.dev | 免费 API |
| 听力音频 | Azure TTS(speech.ynwac.com) | 照 transcript 合成,非真人/非官方 |
| AI 评分 | SiliconFlow(硅基流动 LLM 云) | 租的国产大模型 |
| 新鲜度 | 用户考试记录打卡(评论区) | 众包 |

## 5. 结论

1. **各家同源 = 确认**。ynwac = duoink 下游镜像;同一道题跨 PTE King/TryPTE/79score 等平台一字不差,只是编号不同。整个圈子共用一个"考生回忆池"。
2. **与"公开数据一致"= 部分成立**,但要拆清:题干素材多取自公开网络/新闻(可查),然而**题目本身对应的是 Pearson 未公开的真实考题池**,由考生回忆重建、跨平台共享 —— 不是 Pearson 官方发布的练习集。
3. **护城河不在数据**:题是抄的、译是谷歌的、音是 Azure 的、AI 是硅基流动的、新鲜度是用户白给的。ynwac 的价值 = 打包 + 中文 UX + 机经打卡社区 + 课程/移民转化。

## 6. 对照基准的选择(为什么不拿 Pearson 官方练习比)

- **Pearson 官方付费题库/模考**:登录 + 付费墙后(等同第三方商业库,且是版权本主)—— 不抓。
- **Pearson 免费公开样题**:可抓但很薄。
- **关键陷阱**:机经对标的是 Pearson **未公开的真实考试池**,不是官方**练习集**。拿机经去比官方练习,不一致是正常的(练习集 ≠ 真考池),证不了同源。真正能证同源的对照是**跨平台**(duoink/PTE King/TryPTE)+**公开素材溯源** —— 本笔记已做。

## 7. 开放机经平台地图(2026-09-01 探测)

> 问题:除 ynwac 外,圈内哪些机经是「开放」(匿名可达、结构化可整库取)的?判据 = **访问方式**,不是「站点在不在线」。
> 全部经系统级通道交叉核验(浏览器 tab 上下文 / 真实网络日志 / get_page_text / httpx 抓 robots·sitemap·wp-json 原文);凡「猜的 URL」一律 404 未采信。

| 平台 | 开放度 | 访问方式 | 实证 |
|---|---|---|---|
| **ynwac(小枫叶)** | 🟢 全开 | 前端 bundle 静态 JS 数组 | 939 题明文零鉴权 —— **已实现**,`etl/pte/` 周更雷达 |
| **ptebank.com** | 🟢 全开 | WordPress REST `wp-json/wp/v2/posts`(或直接抓 HTML) | **已实现**(2026-09-01 `--only ptebank`:26 组 · 634 帖,raw 快照 8 件 + 组织库 + 雷达同 ynwac 形)。`X-WP-Total=634` 帖(题~435 + Exam Tips 199)、零鉴权分页 JSON;题面在 `content.rendered`,**mp3 公开挂 `/wp-content/uploads/`**。**题面 + mp3 直链亦在服务端 HTML(SSR),`convert_md` 可取**——但产物是 md 散文还得解析回结构,不如 wp-json 直吐 JSON。分布偏听力/口语(SST 150 / close-sst 92 / Audio RL 76 / RL 49 / SWT 42 / SGD 28),**正补 ynwac 的文本重(WFD/RA)**;题型按 category 分(slug=ra/wfd/sst/sgd…) |
| **79score** | 🟡 半开 | 客户端渲染(浏览器 DOM 可取,httpx 静态只有壳) | robots 全开;RA 页**浏览器渲染后**出真题(#RA-0001「Carbon Conversion」,页内翻 1/**24**),配音 Azure `en-CA`;实测 httpx 抓静态 HTML **只有题目标题壳,题面正文不在**(RSC 流式,需执行 JS);唯一匿名 API 是 `/api/blog`。**免费子集约 24/题型,全库登录后** |
| **APEUni(鸭圈/猩际)** | 🔴 登录门控 | 网页 practice 登录后可见 | 截图称「最大」,但网页端匿名零题(`read_aloud` 页出 "You haven't signed in yet")。题在 **App + 社区圈众包**,网页不开放;后端 `api.apeuni.com` 需登录态。公告新域名 `www.ptexj.com`(猩际,深圳猩宇宙教育) |
| **PTE大西瓜 melonenglish** | 🔴 微信门控 | 「下载」实为微信引流漏斗 | ASP.NET 站;`/download/item/*` **无任何文件**,全是「加课程顾问微信 melonenglish999/90 领取」+ 跳转微信公众号文章(`mp.weixin.qq.com`)。「专做机经下载」名不副实,是培训机构获客,非开放下载 |
| **duoink(多墨)** | 🔴 半封 | Vue SPA(`pte-spa`)+ 极验 | 匿名只加载 chunk;题面锁 geetest+交互后。**上游池主**(ynwac 的 `duomoLink` 全指它) |
| **onepte** | 🔴 拒爬 | Next.js | robots 明确 `Disallow: *question/` |
| **hexinpeter/PTE(GitHub)** | ⚪ 死档 | 链接目录仓库 | 54 star,但 `pushed_at=2018-08-03` —— 七年停更,非题库;「持续更新」之说不实 |
| **PTE King** | ⚪ 死站 | — | 证书自签名,连不上 |
| **TryPTE** | 🔴 门控 | — | Cloudflare 质询 403 |
| **alfapte** | 🟡 未深挖 | Next.js 活站 | 首页 SSR 497KB 异常大;练习页真实 URL 未摸到(猜的路径 404),大概率同 79score 橱窗模式。要挖需专门一轮(读 sitemap 找真路由) |
| **jietinghuo/ptebank(GitHub)** | 🟡 线索留档 | GitHub Pages 私人练习站 | **928KB 加密题库 `data.json.enc`** + `rl/ rts/ sgd/ di/ audio/` 资产目录,2026-08 仍在更;客户端解密 = 密钥必在 index.html。**独特处:有 RTS/SGD 音频目录**(双库现缺 —— ynwac RTS 50 题纯文本无情景音频)。0 star 无人知,真要 PTE 备考功能时再取 |

**结案(2026-09-01)**:开放机经探索到此收口。三个研究目标全部达成 —— 同源验证(§2 跨平台 + §8 时间轴双重实证)、新题雷达(ynwac+ptebank 双源周更)、覆盖盘点(硬缺口仅 HIW/SMW,机经价值低不补)。剩余线索(alfapte / jietinghuo 仓 / 79score 橱窗)增量全是边角,改变不了任何已有结论 —— **新源只能带来更多同样的东西,即停手信号**。往后靠守不靠探:雷达周更自动报新。

**读出来的结论:**
1. **真·全开整库只有两家:ynwac(文本重)+ ptebank(音频重)**,两者互补 —— 一个补 WFD/RA 文本,一个补 SST/RL/SGD 听力(含公开 mp3,ynwac 的音频当年卡在登录)。
2. **79score 是橱窗式开放**(SEO 露几十道真题引流,全库登录);APEUni/duoink 是「有后端 API 但要映射端点」;onepte 主动拒爬。
3. **同源结论无需再抓上游加固** —— duoink 是版权链上游,ynwac 的 `duomoLink` 已坐实镜像关系;§2 跨平台一字不差已证。
4. ptebank 的 `SGD(Summarize Group Discussion)` 是较新题型 —— 若日后要「新题型雷达」,ptebank 的 category 计数是现成信号。

## 8. 双库题目重合度(2026-09-01 跨库文本比对)

> 方法:归一化(去 HTML/实体/标点、压空白)后三路撞:长文中段 60 字符精确 → 三点采样 40 字符 → 短句整句 + 标题对撞。

- **总体重合小,两库高度互补**:长文三点采样 29/325(~9%),句库整句 20/320(~6%),ASQ/DI/SST/SWT/听力选择 ≈ **0**。ptebank 的音频题(SST 150/RL 125/SGD 28)与 ynwac 的 SST 20 **基本不相交** —— 「音频重补文本重」实证成立。
- **例外是 RA:重合 ~42%**(18/43 正文命中 + 15/29 标题命中)—— RA 正是 duoink 键控、跨平台传抄最凶的题型,与 §2 结论一致。
- **命中落点几乎全在 ptebank 的 exam-tips 月更机经贴**(「PTE question bank updates | 2019-03 → 2026-06」系列),不在它的单题帖里:ynwac 的 RA 题被 ptebank 按月引用。**研究红利:这个月更存档给共享机经池加了时间轴** —— 同一道题的流通寿命可回溯(如「Mammal」2019-03 首见 → 2026 仍在;「Tutor」2023-2026 被引 5 次),要研究「一道机经能活多久」,数据已在手。
