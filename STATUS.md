# STATUS / 交接文档（2026-07-05）

> 新 session 接手先读这份 + `CLAUDE.md`(设计宪法)+ `prd.md`(v2 定位见头部标注)。仓库:github.com/zhizhunbao/pnp-job-tracker
> **🚀 站点已公网上线并真实收款:https://pnp-cms.onrender.com**(Render + Supabase;**live Stripe,M3 已开闸**)。批次进度=`docs/implementation/_开发批次顺序.md`:**B0-B8 全部落地(2026-07-04 一天从 B4 打到 B8),24 工作项代码侧全完**。
>
> **⚡ 新 session 快速上手(2026-07-05 交接)**:
> - **顾问弹框重设计已拍板待实施(2026-07-05,下个 session 接手)**:[顾问弹框字段规范](docs/顾问弹框字段规范.md)——哲学四条(三层零混淆/值口径来源三件套/29 字段归 9 家族统一骨架/field·job 级分区)+ 五段骨架 + 逐族内容排版表。拍板:D1 建档 CTA 只在 match/身份信号族;D2 免责只留 AI 段头(删 footAI);D3 动作链恒定页脚条;D4 下个 session 按 molit 开实现文档再动手(纯前端 1-2 SP,§5 差距清单=工作项,§3 表=验收基准)。
> - **快刀:顾问弹框薪资域四连修 ✅(2026-07-05,用户截图指出「中位年薪弹框乱」)**:① **免费用户点 Pro 锁列(中位/vs)不再弹顾问**——服务端本就剥离了中位数据,弹了只会误导+旁路付费墙(match 免费额度内有值仍可弹);② **advisor 红线补丁**:薪资类字段中位缺失时 prompt 明令「不得凭记忆报中位数」(实测抓到过编出 $72K-$78K;修后实测 AI 明说 not available);③ 弹框大标题只取本列字符串值,元素类 cell 不再回退成薪资文本(「中位年薪」页眉配「$36/hr」大标题的乱象);④ 事实块口径注分两种诚实:免费=「中位对比为 Pro 功能」/ Pro 真缺数据=「该 NOC×省暂无 ESDC 中位数据」(fact.medianPro/noMedian 三语)。免费态浏览器全程实测过。
> - **E6-02 LMIA 外劳雇佣记录 ✅ 全链上线(2026-07-05 深夜,单日立项→生产)**:ESDC 季度开放数据(8 季 141,504 行→75,426 雇主)→ `build_lmia.py`(挂 ee 月更;**镜像 +openpyxl 需下次 compose build**)→ 09 按 norm_name 精确匹配(公司 18.2%/岗位 19.8%,抽检零误报)→ companies 四字段(**jobs 零改动**,列表 SQL 本就 join companies)→ 前端「外劳记录」列+弹框事实块+citation → **sponsor-likely 榜单第一排序键改 LMIA 技能股职位数**(只认 High Wage/GTS/PR-only;榜首从鱼厂变 AHS/庞巴迪/BRP/Sony,D-c 措辞随实证自然解决)→ match 规则 6(+5 轻加权,无记录 na 不扣)。生产实锤:1,657/9,126 公司有值。语义红线:**「雇过外国人的历史事实」非「能担保」**(2026 TFWP 收紧:低薪股 30 大都市冻结,EE offer 加分 2025-03 已取消——展示必须带股别/季度)。详见 E6-02 实现文档。
> - **E6-03 公司分析接 web_fetch ✅ 生产验证过(2026-07-05,立项→验证半天)**:advisor 公司初判(field=company 且有官网)现场抓官网首页 grounding——**顾问最后一块无真实数据兜底的空白补上了**。冒烟拍板:`web_fetch_20250910` 在 haiku-4-5 **免 beta 头**;llm.ts `fetchUrl` 可选参(域名白名单/max_uses=1/输入 4K 封顶,ollama 忽略);prompt 带注入防御(页面内容=数据,页内指令忽略)。生产实测 Magnet Forensics:输出含官网当前产品矩阵+slogan,记忆编不出的新鲜度。company 输出上限 480→640(抓到真材料后会截断)。覆盖有官网的 ~24% 公司(ATS 第一方主力);缓存按公司名不变,成本增量 ~$0.004/次。
> - **产品对账文档**:[功能价值盘点与数据缺口](docs/功能价值盘点与数据缺口.md)——岗位价值六轴模型 + 数据缺口按痛点 ROI 排序。已落地 P0(LMIA=E6-02)与原 P3 换代方案(官网=E6-03);**剩余优先级:省 PNP 抽选线(P1)→ PE AIP/RNIP(P1)→ 挂帖时长信号(零抓取)→ 就业前景星级/处理时长(P2)**。域名决策仍卡邮件提醒(北极星不可测)。
> - **E6-04 省 PNP 抽选线 ✅ 全链上线(2026-07-05,立项→生产终验一天)**:PNP 弹框顶部新增「本省最近抽选」块(日期/流/最低分/邀请数,行级来源链)。实现文档 [E6-04](docs/implementation/E6-数据补强/04_省PNP抽选线.md)。**源盘点实测推翻交接假设**:① 「CRS 对齐可算差分」档全灭——**ON 2026-06-26 OINP 改制**(旧 8 流全删/EOI 关闭/新 Ontario Workforce Priority 流细则待公布)、**AB 2026 换 WEOI 自有分制**(连 EE 流最低分 47-71 也是 WEOI 非 CRS)、SK 2025 改制后无 EOI 抽选;→ 全部走「事实展示」档,match 不加规则,「差 X 分」维持联邦 EE 独有,**分数带分制标注「非 CRS」**(三语);② BC httpx 200(交接猜的 403 不成立,带 Chrome UA 即通)。链路:`etl/pnp/build_draws.py`(BC 表 rowspan 展开+同抽选多因素行去重/AB Table10/MB prose/ON notice,挂 pnp 源周更)→ raw/pnp/draws.json(**08 目录驱动天然跳过**,无 occupations 键,实证过)→ mart pnp_draws 25 行(BC8/AB8/MB8/ON通告1)→ 新 PnpDraws collection(生产 DDL 用户授权执行,B7 rels 清单齐)→ 生产 seed ok + 弹框四类终验(BC/AB 块、ON 通告、SK 无块)。**插曲**:本地 dev 验证时 pooler 打满(EMAXCONNSESSION 15,本地+Render 同抢)→ 直连正式库验证完记得关 dev。**连带发现**:OINP 改制后现有 oinp-in-demand(56 NOC)/oinp-tech(9 NOC)具名 chip 语义存疑(旧流已关,抓取还能解析到旧清单页)→ 已立项 E6-05(见下条)。
> - **快刀:/jobs 三处 UI 修 ✅(2026-07-05,worktree session,用户指出;build 过+DOM 实测)**:① **中/小分类国际化**——数据值仍中文(etl/noc.py 单一来源、有限集),显示层照大类先例新增 `cat.*` 键(EN/KO 各 ~89)+ `catName` 回退链(cat.* → broad.* → 原值,noc.py 兜底会把大类名当中/小类),筛选下拉/表格两列/弹框事实行全接,TEER 下拉「未分类」一并翻;**遗留**:PNP 列「AB 科技/SK 医疗」具名通道 chip label 仍中文(数据层 label,小集合,另课题)。② **弹框滑动选中文本误关根修**——新 `jobs/overlay.ts useOverlayClose`(mousedown 与 click 都落在 overlay 本身才关;框内按下框外松开时浏览器把 click 派发到共同祖先=overlay,旧 `onClick={onClose}` 必误关),AuthModal/AdvisorModal/ActModal/新 UpgradeModal 四处接入。③ **注册与购买分离(用户定)**:AuthModal 加 `mode="register"`(横幅/定价页注册 CTA 直达注册 tab,不再停在登录);新独立 `UpgradeModal`(30/90 天购买+价格,NEXT_PUBLIC_PRICE_DISPLAY 同源,checkout 复用 /api/billing/checkout);升级卡 CTA、Pro 锁列 🔒、保存筛选 gate 全改开弹框不再跳 /account(未登录先弹注册框);`up.cta` 改「升级 Pro →」、新键 `up.compare`、保存筛选不再 alert+跳页。实测(本地 dev=生产库,验完已关):EN 全下拉零中文残留、拖选保持打开+点外正常关、未登录锁列→注册框、登录免费号锁列→升级框(Buy 30/90 · CA$19/39)。**新测试号 fable5c@test.local 建在生产 users(惯例 @test.local)。未 push(在 worktree 分支)。**
> - **E6-05 OINP 具名 chip 下架 · 立项待拍板(2026-07-05,worktree session,未动代码)**:实测 ontario.ca 三页——新「Ontario Workforce Priority」流**只公布了 reg 级 TEER 分档条件(0-3:CLB6 / 4-5:CLB4 / 自雇医生),无职业清单**,按「全 TEER 全职业」设计大概率不会再有 56/9 式清单;且 raw/pnp 两清单 fetched=2026-06-28(改制后两天)**仍解析出 56/9 = 旧页未撤,build_on 周更会一直续命死清单,不会自然失效**。三方案对比后建议 **方案 A 下架**(退役 build_on + git rm 两 json;08/09/match/前端全链目录驱动**自动回退**泛 TEER 粗筛,零规则/前端代码改动;弹框 ON 通告行(E6-04)继续管省级解释;新流将来若出清单丢新 json 即恢复)。影响如实:in-demand 56 NOC 的 ON TEER4-5 岗回灰、命中岗 -12 分、榜单 namedJobs 归 0。实现文档 [E6-05](docs/implementation/E6-数据补强/05_OINP具名chip下架.md)(§0 三方案对比 / §2 验收 / §7 跟进钩子:e-Filing 夏末重开后复查,TEER4-5 全职业可走的新语义另立项)。**下一步:用户拍板 → 按 §3 半天内可收口(无 DDL,只重跑 ETL+seed)。**
> - **架构已切「直连正式库」**:本地 `cd cms && npm run dev` 连的就是 Supabase 生产(护栏:dev 不自动推 schema,改表=显式 `DB_PUSH=1` 单次或手写 SQL;seed 必带 `x-seed-token`;测试号 @test.local)。本地 postgres/cms:3001 已过时。改 collection 的 DDL 清单看 memory `prod-migration-workflow`(⚠️ 别漏 payload_locked_documents_rels 关联列)。
> - **当前状态**:M1/M2/M3 ✅;**M4 手续全部办结(2026-07-05 夜)——只剩 7 天无人值守观察期**。五账号全通:healthchecks(5 check 全绿,ping URL 进 docker/.env)/ UptimeRobot(/jobs 5min 监控)/ Resend(key 进 Render,`alerts/run` 实测 dryRun:false;域名前测试模式只能发账户本人)/ umami cloud(两 env 进 Render,面板实测收到 pageview)/ GSC(property 验证过+sitemap Success 119 页)。备份链闭环(backup 容器日更 pg_dump→backups/,首份 6.8MB)。**三演练全过**(断源=缩周期法/宕机=404 法/恢复=临时库行数全等),记档 E7-01 §5。
> - **M4 记档补充**:GSC 验证走的 **HTML 文件法**(`cms/public/google021724190957bb4b.html`,勿删)——meta 法因根路径 307→/jobs 被验证器拒;layout 的 `metadata.verification` 保留备用。`/backups/` 已补 .gitignore(生产 dump 含用户数据)。**STRIPE_WECHAT_PAY 已删**(2026-07-05 用户拍板):Stripe live 侧实查 **WeChat Pay 与 Alipay 均 Pending approval**、仅卡 Enabled → 开关留着=每笔结账先撞失败再兜底纯卡(且兜底连坐砍掉支付宝)。删后 checkout 请求卡+支付宝;**支付宝获批后自动出现(代码写死)、微信获批后再把 env 加回**。⚠️ 在 Stripe 审批通过前,生产结账实际只有信用卡可用。umami website id=`a648865a-acc2-4f34-822c-a8f98412b58d`。
> - **🎉 域名已拍板(2026-07-05):`offer2pr.com`**(实查可注册,常规价 ~$11/年;RDAP 核过无 premium)。命名逻辑=产品命题「雇主 offer → PR」直接入名,中文口播「offer 转 PR」零解释。**用户手动:注册付款**(Porkbun/Namecheap/Cloudflare 任一,WHOIS privacy 选免费的,看清续费价);买好后接线清单(助手代驾,一个 session):DNS A/CNAME → Render 绑域+自动 HTTPS → `NEXT_PUBLIC_SITE_URL` 换新域 → **Resend 域名验证(三条 DNS)→ 邮件提醒点亮=北极星可测** → GSC 新 property+sitemap → 旧 onrender 域 301。⚠️ 301 前旧链接仍有效,平滑过渡。
> - **悬而未决的决策**:~~品牌名/域名~~(已拍板,见上)、Render Free→Starter(公测宣传前)、Stripe 品牌/收据设置(追办)、Stripe 品牌名是否随 offer2pr 更新(顺手)。
> - **下一步可选**:① 陪用户办完 M4 手续+演练;② B9/E6-01 数据补强(PE AIP/RNIP/内容去重,原定入学后);③ 公测冷启动(发帖)后按反馈迭代;④ E5-01 正式定价复核($19/$39 现为公测价)。
> - **seed 已批量化(2026-07-05)**:一轮 <1 分钟、单事务;⚠️ 改 Jobs/维度表字段 → 必须同步 `seed/route.ts` 列白名单(写路径耦合 snake_case,老坑 5 同款)。「抓取时间」= 数据层 last_seen,重灌不动它。auto_update 的 seed 判定已修:**2xx 且 ok:true 才记 ✓/才触发 alerts**(以前 502/500 也记 ✓)——看到「✗ seed」才是真失败,E5-03 自动提醒的触发条件自此可靠。
>
> **本轮(2026-07-05 白天 —— UI 图标化 + 抓取时间语义 + seed 批量化提速,三件全部署)**:
> ① **全站 emoji → 内联 SVG ✅**:装 lucide-react(用户拍板,弃手写),新共享出口 `cms/src/app/(frontend)/Icons.tsx`(统一 size=1em 跟字号 / stroke=currentColor / 基线 -0.125em,调用点只 import 这一个文件);/jobs 列表+弹框、账户、定价、统计、榜单、法务、横幅、升级卡全换;i18n 字符串内的 emoji 前缀剥离、图标改渲染点挂(`price.yes` 键删除,定价表勾改 `<IconCheck/>` 节点;alert/prompt 纯文本串只去符号);邮件 📣 改纯文本;品牌 🍁 保留(顶栏/登录框/about/邮件)。验收:grep cms/src 无残留 emoji(🍁 除外)+ build 过 + 本地 DOM 目检 + 生产 SSR 审计五页全过。
> ② **「更新时间」→「抓取时间」✅(用户提出:重新入库不许推这个时间)**:清洗下沉——`clean/05_parse_jobbank` 合并快照时给帖打 `last_seen` = manifest.fetched_at(抓取机本地时间转 UTC Z;同一快照重复解析幂等)→ 09 透传 `lastSeen`(ATS = jobs.json mtime)→ **seed 不再打钟**(mart 给了才写;缺则更新不碰旧值、新建留空);i18n 三语改名(抓取时间/Scraped/수집,顶部「更新→抓取」)。老口径残值(=历次入库时间)按「宁可留空」一次性置 NULL(12,500 行,用户授权)。**实测连灌两次 last_seen 分布逐字节不变** = 验收过。
> ③ **seed 改批量 SQL ✅(~40 分钟 → 44-63 秒,提速 ~40 倍)**:查「为什么这么慢」时发现 **近 72h 没有一轮 seed 真成功**——Payload 逐行管线(12k 岗 × find+update ≈ 数万次往返)在 Render Free 0.1 vCPU 上一轮 ~40 分钟,必撞代理 ~100s 超时:客户端记失败、服务端继续跑出半写状态,auto_update 日志还把 502/500 记成「✓ seed 502」。重写 `seed/route.ts`:分批 `INSERT … ON CONFLICT`(300 行/语句;companies upsert RETURNING 建 slug→id 映射)+ **BEGIN/COMMIT 单事务**(任一步失败整体回滚,消灭半写);列白名单按**生产 information_schema 实查**(别猜 camel→snake:stats.new7d 无下划线、rankings.date_posted 是 varchar);维度表删除前先清 locked_documents_rels 关联列(B7 教训照做)。语义不变:token / reset / 增量 / lastSeen 透传 / 30 天过期下架。**代价记档:写路径也耦合 snake_case 列名(老坑 5 同款)——改 collection 字段要同步 seed 列白名单。**
> **云端复验 ✅**:Render 侧触发 seed **42 秒一把过**(ok:true,12432 岗;远低于 ~100s 代理线,ReadTimeout 根治);页头「抓取 2026-07-04 23:01(ET)」= 数据层抓取时刻,连灌三次不动。
> ④ **auto_update seed 成功判定修复 ✅**:老版把任何 HTTP 响应记「✓ seed 502/500」并照样触发 alerts/心跳。改为 **2xx 且响应体 ok:true 才算成功**(502 返回 HTML,json() 炸也归失败),否则记 ERROR 并中止本轮;alerts 触发同样按状态码记 ✓/✗;seed 超时 600s→180s(批量化后 <1 分钟)。**restart build 实测一轮全绿:`✓ seed 200 ok:true` → `✓ alerts 200 dryRun`** —— E5-03「seed 成功后自动发提醒」的触发条件首次真实可靠。
>
> **本轮(2026-07-05 凌晨 B8 提醒与运维收敛 —— 代码侧全部落地,M4 只剩托管账号+观察期)**:
> ① **E5-03 匹配版邮件提醒 ✅(dry-run E2E 全通)**:`api/alerts/run`(x-seed-token,双通道:A=Pro+建档匹配日报(match high 新岗前10+当日新抽选 vs CRS 段,users.lastAlertAt 游标)/B=saved search(filters json 原样→lib/jobsQuery 解释,lastNotifiedAt 游标);首轮回看 36h 防倒灌;**RESEND_API_KEY 未设=dry-run 不发不回写**);SavedSearches collection(create=Pro,上限 5 钩子)+筛选区「保存此筛选」+/account 管理;auto_update seed 成功后自动触发;lib/matchDims 抽共享。**剩 Resend key(域名前=测试模式只能发账户本人)**。
> ② **E7-01 监控备份(代码侧 ✅,R3 修订记档)**:无 VPS → 家里构建机=运维盒;auto_update 成功后 ping HEALTHCHECK_PING_<SOURCE>(compose 已透传);新 backup 源(日更 pg_dump Supabase→backups/ 留14天)+compose 服务+httpx 镜像加 postgresql-client(**要 docker compose build 重建**)。剩:healthchecks.io×5/UptimeRobot/Anthropic 告警复核/BACKUP_DATABASE_URI 进 docker/.env/三演练。
> ③ **E7-03 SEO(代码侧 ✅)**:sitemap 121 URL(含 stats 全矩阵)+robots(挡 admin/api/account)+/jobs 专属 meta。剩:GSC 验证+提交、三平台发帖(72h 反馈记档)。
> ④ **B8 生产 schema 先行**:saved_searches 全清单(主表+users.last_alert_at+locked_documents_rels.saved_searches_id 列/索引/FK——B7 教训清单照做);DDL 生成用「本地库当生成器」:临时 DATABASE_URI=本地+DB_PUSH=1 起一次 dev(⚠️ 记得 taskkill node 子进程,kill npm 壳杀不掉,撞过双 dev 拒启)。
> ⑤ **老坑③ 又演**:bash curl 发中文 JSON 变 `??`(saved search 的 fBroad 损坏,误判为 alerts bug 查了一轮)——**中文测试体一律 UTF-8 文件 + --data-binary @file**。
> **M4 清单(用户手动)**:Resend 注册→RESEND_API_KEY 进 Render;healthchecks.io 5 check→ping URL 进 docker/.env;UptimeRobot;GSC+sitemap;umami 账号(B7 遗留);docker compose build+起 backup;然后三演练+7 天无人值守观察=M4。
>
> **本轮(2026-07-04 深夜 B7 信任与引流 + 架构拍板:直连正式库)**:
> ① **E4-04 字段级 citation ✅**:`etl/build_field_sources.py`(7 数据集着陆页 httpx 验证抽 title/meta 原文+9 派生口径,挂 pnp 源周更;21 verified/0 unverified)→ mart `field_sources`(30 行)→ 弹框统一 `SourceLine`(记录级官方原帖优先/数据集级兜底/unverified 降级/派生显口径)+ advisor jobFacts 行尾 [src:…] 标注。断源演练 ✅。
> ② **E5-02 榜单 ✅**:`10_build_rankings.py`(weekly-top TOP50 按 datePosted 7 天——mart 无 firstSeen 偏离记档;sponsor-likely TOP30 第一方+具名通道聚合)→ /rankings/[slug] 三语 SEO 页;顶栏入口;/jobs 接 ?q=。
> ③ **E5-04 地区统计 ✅**:`11_build_stats.py`(省×大类 115 行,双口径中位:ESDC+帖面)→ /stats 省索引+省页+大类页(口径行复用 E4-04 来源;职位板入口 ?prov=&broad=)+ **Pro 跨省对比**(档案 NOC 预选大类);市级后置 topCities 顶上。**又踩老坑 6**:共享常量放 'use client' 模块服务端拿 undefined → 抽 stats/shared.ts。
> ④ **E7-02 埋点(代码侧 ✅,选型按 R3 修订)**:compose 自托管方案过时 → **umami cloud 免费档**;layout env-gate script + signup/checkout 两事件;隐私政策补 analytics 条目;layout 顺手修掉「Payload Blank Template」残留 metadata。**剩用户手动:cloud.umami.is 开账号 → Render 填 NEXT_PUBLIC_UMAMI_SRC/ID**。
> ⑤ **架构拍板(用户,2026-07-04):所有数据真相=Supabase(库+Storage),本地库/本地 mart 读路径过时,本地 dev 直连正式库**。护栏已全上:payload `push: DB_PUSH==='1'`(dev 不再自动推 schema!改 collection=显式 DB_PUSH=1 单次推或手写 SQL)/本地 .env 配 SEED_TOKEN(seed 必须带 token,reset=1 会重灌生产)/测试号一律 @test.local/本地 postgres+cms:3001 标过时不删/`data/` 仍是 ETL 构建工作区(mart 上传 Storage 是唯一交接)。**生产 3 新表(field_sources/rankings/stats)DDL 先行**(pg_dump 导本地→psql,方案内授权)。
> **B7 收尾 ✅**:生产 seed 灌满三新表(115/80/30)并页面终验通过。**踩坑记档:新增 collection 手写 DDL 时,除主表外还必须给 `payload_locked_documents_rels` 补 `<slug>_id` 列+索引+FK**(Payload 给每个 collection 在该表加关联列;漏了 → seed 的 delete 阶段整事务炸,错误还被 25P02 吞掉难定位)——已补进 prod-migration-workflow 记忆与本段。另:本地→远端库逐行 seed 太慢(跨网延迟),触发生产 seed 让它在 us-east-1 内网跑才是正解。剩 umami 账号(用户,2 env)。**下批 B8:E5-03 邮件提醒 + E7-01 监控备份 + E7-03 SEO(sitemap 收录 stats 页)= M4。**
>
> **本轮(2026-07-04 深夜续 —— M3 正式收费开闸 🎉 + 登录改版)**:
> ① **E3-06 切 live 完成**:live Product `prod_UpEXEb8j3hFyBG`($19=`price_1Tpa4dGre9TF1l9zHOsx7tR4`/$39=`price_1Tpa5sGre9TF1l9zFjycLhSf`)+ live webhook `we_1TpaA9Gre9TF1l9zVVoSM7Uz`(completed+async 两事件)——助手驱动用户浏览器建的,**sk_live/whsec 全程用户自持不经助手**;Render env 切 live(STRIPE_WECHAT_PAY 已删,checkout 有未获批自动退纯卡兜底)。
> ② **真实收款验证**:admin 号真卡购 30 天 CA$19 → live webhook 一次投递成功(984ms)→ proUntil=2026-08-03(+30d 精确)→ 账户页 ⭐Pro。**真实退款演练**:Dashboard 全额 Refund → admin 后台清 Pro Until → 免费版 ✅。**运维口径:退款不自动降级,人工两步(Refund+清 proUntil)**。= **M3 正式收费开闸**。
> ③ **登录改版(用户提出)**:AuthForm 视觉翻新(品牌头/分段切换/聚焦态/渐变按钮);**全站唯一登录入口=首页弹框**——未登录访问 /account → 弹回 /jobs?login=1 自动开框,登录成功整页刷新让 SSR 分层态生效;/account 只留已登录态。
> **追办**:Stripe 品牌/收据设置(名称/图标/支持邮箱);live 侧 Alipay 可用性待确认(现兜底退纯卡);品牌名/域名决策仍悬。**下批 B7:E4-04 citation + E5-02 榜单 + E5-04 地区统计 + E7-02 analytics**。
>
> **本轮(2026-07-04 深夜 B6 合规与收费开闸 —— 代码侧全部就绪,M3 只差 live 手续)**:
> ① **E4-02 四件套 ✅**:`/legal/{disclaimer,privacy,terms}` + `/about` 三语(共享 `legal/LegalShell.tsx`,法务长文各页自带字典不进 i18n.ts;footer 四链)。**拍板落档**:定价 $19/$39 CAD 转正(D5)/退款=购后 7 天未大量使用可全额退(写进条款 §4)/公开支持邮箱 wangsansi9527@gmail.com(NEXT_PUBLIC_SUPPORT_EMAIL 可换)/适用法 Ontario。下架演练 ✅(applyUrl 删岗前端 1→0;**seed 回灌局限记档**:真实异议需同步清 postings/mart,backlog)。
> ② **E4-03 republish/PII ✅**:前台 SQL/API 零 email/phone 字段(grep 留档);**JD 出口统一脱敏** `lib/jobDescription.scrubPii()`(email+电话→「[见官方原帖]」,jobtext/advisor 共用,实测 0 泄漏);JD 弹框+事实块两处显著「↗ 查看官方原帖」按钮(D6:摘录+导流官方)。
> ③ **E5-01 定价页 ✅**:/pricing 服务端读 plan.ts(对照表与分层单一来源)+按钮三态(未登录→注册弹框/已登录→Checkout/Pro→账户);价格走 NEXT_PUBLIC_PRICE_DISPLAY,改价零代码;/jobs 未登录价值主张横幅(可关,localStorage)。埋点留给 B7/E7-02。
> ④ **E3-06 代码就绪**:checkout 加**live 支付方式兜底**(alipay/wechat 未获批时创建失败自动退纯卡打日志,防一个方式炸全部收款);无 test 假设写死。**M3 清单(用户手动,见 E3-06 §7)**:live 激活确认 → live Product/Price($19/$39)→ live webhook(两事件)→ Render env 换 live 三件+**删 STRIPE_WECHAT_PAY** → 真实付一笔 → Dashboard 退一笔+admin 手动清 proUntil(退款运维口径 v1=人工)→ 品牌/收据设置。
>
> **本轮(2026-07-04 晚 B5 档案匹配 + 付费墙 —— 付费头牌就位,M2 完整达成)**:
> ① **E5-00 档案匹配(付费核)**:Users 加 `profile` group(nocCodes/clb/crs/targetProvinces/pgwpMonthsLeft,json 存数组,本人可改无字段锁);**规则引擎只住 `lib/match.ts`**(纯函数同构:五规则 NOC对口/省通道/EE距离/TEER可达/工资信用 → 加权分 → 高≥60/中≥30/低/不适用,每条 reason=i18n键+参数+sourceRef 指回维度记录);/account 档案表单(NOC 搜索下拉用 **noc-descriptions**——文档写的 noc_categories 没有码,偏离已记);列表「与我的匹配」列(服务端算,Pro 全量/免费前 10 岗激活钩子);弹框「对我意味着什么」(客户端同一 match() 重算依据链,✓⚠✗ 逐条+来源↗+免责短句);advisor 档案感知(Pro 注入自报档案+本岗匹配结论,**个性化初判缓存按人隔离** :p<uid>)。快照测试 10 项含**措辞键白名单**(红线:永不说"你能/不能移民")。
> ② **E3-05 付费墙**:常量收口 `lib/plan.ts`(试用 8/20 次、Pro 日限 200、免费匹配前 10、PRO_COLUMNS,全可 env 覆盖);**gate 全服务端**——advisor/jobtext 免费登录用户按 userId 计数超 **402**(前端渲升级卡,四处)/Pro 429 日限/未登录 IP 限流不变;Pro 列(match/vs中位三件套)数据在 page.tsx 映射层剥离(算完匹配再剥),改 cookie 绕不过。列偏好 bump:COLS_COOKIE→jobsCols3 / PREF_KEY→v9(新默认含匹配列)。
> ③ **本地 15 项端到端全过**:档案 CRUD/回读、role/proUntil 字段锁回归、SSR 免费前 10 chips + 11 起🔒、HTML 无中位数据泄漏、curl 直调 402、Pro 全解锁不限次。**踩到一个真 bug**:免费"前 N 岗"最初取 SQL 序,与前端默认序(同日按评分兜底)不一致 → SQL 排序补 `score DESC` 对齐(读 JobsTable:537 的兜底逻辑)。
> ④ **生产 users 表 6 个 profile 列已先行补齐**(psql,用户授权;render-env.txt 已删,连接串用 cms/.env 里注释的 Supabase 行)——B4 "schema 先行再 push" 教训落实。
> **下一步:B6 合规与收费开闸**(E4-02 四件套 / E4-03 republish 自查 / E5-01 定价页 / E3-06 切 live = M3)。E5-01 拍正式定价后建新 Stripe price 换 env(现 $19/$39 是占位)。
>
> **本轮(2026-07-04 下午 B4 支付贯通 —— 代码侧全部完成,收口只剩 Stripe Dashboard 手续)**:
> ① **E3-03 时长包 Checkout**:`lib/stripe.ts` 单例(key 未配置返回 null → 无支付配置站点照常跑)+ `api/billing/checkout`(getUser 401 → mode=payment,30/90 天 price,卡+Alipay,返回 {url} 前端跳转;WeChat 待 Dashboard 确认后设 `STRIPE_WECHAT_PAY=1` 即开,client:web 已带)+ `/account` 两档购买按钮 + `?ok=1` 回跳绿条(三语)。
> ② **E3-04 webhook**:`api/stripe/webhook`(raw body 验签 → completed 且 paid → `proUntil = max(now,现值)+metadata.days`;幂等=Users 新隐藏字段 `stripeSessions` 记已拨 session.id;未知事件 200 ack、异常 500 让 Stripe 重试)。**超文档一处:同时处理 `async_payment_succeeded`**(alipay/wechat 异步到账,completed 时可能 unpaid → 不处理会丢单;⚠️ Dashboard 建 endpoint 两个事件都要勾)。**本地自签 HMAC 伪造事件走真实验签路径 13/13 实测过**(401/400/假签名 400/首购+30d/重放不叠加/续买顺延 +120d/unpaid 不拨 async 补拨/未知事件 ack/幽灵用户 ack)。
> ③ **E4-01 免责声明 v1 收口 ✅**:页脚三语升级(聚合工具/非 RCIC/以官方为准)+ 链 `/legal/disclaimer` 占位页(新,client 读 LANG_KEY 循 /account 约定)+ AdvisorModal AI 判断区顶部小字提示;advisor SYSTEM 本就禁 disclaimers,UI 层与 AI 文风分离核对无需改。
> ④ `npm run build` 过(改了 Users 字段照老坑先本地 build);payload-types 已重新生成;`.env.example` 补 STRIPE_* 五项注释。
> ⑤ **部署插曲(已解决,留作教训)**:推代码后才意识到 **Render Auto-Deploy=On 意味着 push main = 直接上生产**,而 Supabase 生产库当时还没有 `users.stripe_sessions` 列(生产 Payload 不自动推 schema)→ 生产登录一度 500 约 10 分钟。处置:立即 revert 保生产(登录恢复 401 实测)→ 用户授权后 psql 给生产库补列(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_sessions jsonb;`,与本地 payload push 产物一致)→ reapply 两个 commit 重新部署。**教训:改 collection 字段的 commit,push 前必须先给 Supabase 补列(SQL editor 或授权 psql),再推代码**——B3 是先推 schema 后部署,这次顺序反了。
> ⑥ **B4 ✅ 真实回归收口(2026-07-04 晚,test key 全链路)**:Stripe 账户激活全程走完(SaaS 类目/descriptor『PNP JOB TRACKER』/CIBC 手动绑卡拒了网银凭据聚合/2FA/Tax+Climate 均关);Product/Price 用 API 建(`prod_UpCiFof1mmH07M`;30d `price_1TpYJWGfQhhawEig3gBeks8Q` $19 / 90d `price_1TpYJWGfQhhawEig8oGsYnVd` $39,**占位价,正式定价等 E5-01**);**4242 卡全流程 +30 天、Alipay 模拟支付 +90 天顺延,均为 stripe listen 转发的真实事件**;WeChat Pay test 模式可用(Checkout 页三方式齐,live 待 E3-06);Stripe CLI 已 winget 装机。**生产 webhook endpoint 已建**(`we_1TpYVOGfQhhawEigoe68vKtD`,两事件)。= **M2 支付链路贯通(本地)**。
> ⑦ **M2 线上确认 ✅(2026-07-04 晚)**:Render env 填入 STRIPE_* 后,生产真实跑通一笔——注册测试号 m2check@test.local → /account 购 30 天 → 4242 支付 → **生产 webhook(Stripe→Render)送达,proUntil=+30 天整**;生产 /account 购买入口/免责声明/legal 页均正常渲染。**插曲两个**:① 首次 500 = Render env 值粘贴有误(用户修正后即通)——症状:同参数直打 Stripe OK 而站点 500;② **`NEXT_PUBLIC_SITE_URL` 漏配** → 支付回跳落到 `https://0.0.0.0:10000`(req.nextUrl.origin 在容器里的回退值),支付/webhook 不受影响但用户体验断——已让用户补第 6 个 env(`NEXT_PUBLIC_SITE_URL=https://pnp-cms.onrender.com`),**教训:上生产的回跳/绝对 URL 永远显式配,别信 origin 回退**。已补并复验(新 session 的 success/cancel_url 均=https://pnp-cms.onrender.com/*)——**B4 全关,M2 完成**。下批 B5(E5-00 档案匹配 + E3-05 付费墙)。
>
> **本轮(2026-07-03/04 上线冲刺 —— 计划体系 + B0-B3 一天半打完,站点上线)**:
> ① **计划体系**:`docs/整体开发计划.md`(4 Sprint→8/28 收费,四里程碑 M1-M4)+ `docs/implementation/`(一工作项一文档,molit 规范)+ **产品重设计 v2 已采纳**(`docs/产品重设计提案.md`:三问定位 去哪/投什么/怎么拿身份;**付费核=档案匹配 E5-00**,AI 顾问降为个人化层;地区统计 E5-04;E6 让位;**付费 v1=30/90 天一次性时长包**,无订阅无 Portal,D5/D8 修订)。
> ② **B0 收尾**:分支已合 main 并 push;EE 类别抓取改 httpx(`etl/build_ee_categories.py`,产出与浏览器版逐类一致 9类94职业,ee 容器换轻镜像,draws 一并进月更 steps);04c/04d/05c 三处 postings 直写补原子(05/05b 原已原子)。
> ③ **B1/R3 上线(D2 修订:Render+Supabase,VPS 降备选)**:Render web `pnp-cms`(Docker,rootDir=cms,**Free 档待升 Starter**,Auto-Deploy=On)× Supabase 项目 `jnulqjhtqdwthtyccypj`(us-east-1;库走 **Session pooler :5432**;私有 bucket `mart`,**建项目关掉了 Data API**——Payload 表无 RLS 开着会裸奔)。**mart 交接走 Storage**:build steps 末尾 `upload_mart.py`(SUPABASE_* 未设自动跳过→本地/VPS 模式不变);seed 改双模式(env 设=从 Storage 拉,否则读本地);**家里 build 容器已接云端**(`docker/.env`:SEED_URL=云端/SEED_TOKEN/SUPABASE_*)=**$7 起步档**(ETL 留家,笔记本合盖不更新是已知代价;M4 前可上 Render worker 转全托管,`docker/render/Dockerfile.etl`+supervisor 已备好)。VPS 备选文件(docker-compose.prod.yml/Caddyfile)保留未删。
> ④ **安全**:seed 加 `x-seed-token` 鉴权(生产 401 实测;本地不设 token 放行);advisor/jobtext 进程内限流(`lib/rateLimit.ts`:IP 日限 40/200+全局 1000,缓存命中不计);**生产 admin 首用户已注册提权(402707192@qq.com=admin)**——曾裸奔一天,教训:上线即抢注。
> ⑤ **E2-03 云 LLM**:advisor 抽 `cms/src/lib/llm.ts` 双后端(`LLM_PROVIDER`:ollama=本地 dev/anthropic=线上 **claude-haiku-4-5**);生产三项实测过(数字精确引用/缓存 hit/追问无数据明说"我没有这些数据");成本≈$0.003/次,**Anthropic 账户不开 auto-reload=余额即硬上限**。
> ⑥ **B3 账号**:Users 加 role/proUntil/stripeCustomerId(**字段级 access 锁**,实测冒填注册与自 PATCH 提权均被忽略;role 进 JWT);`lib/entitlement.ts`(getUser/isPro=proUntil>now,时长包语义);`/account` 三合一页 + **顶栏弹框登录**(共享 `jobs/AuthForm.tsx`,弹框循 ActModal 既有约定,不跳页);顶栏顺序=语言切换在前账户最右;根路径 307→/jobs(模板欢迎页已删)。
> **坑/教训(新)**:① **dev(turbopack)不跑完整类型检查——改 collection 后必须本地 `npm run build` 过了再推**(role 加 required:true 让 tests/seedUser 编译爆,生产构建连挂三次才发现);② Render:免费档 web 会休眠(50s 冷启动杀 SEO),worker/持久盘无免费档;**控制台 SPA 长连接卡浏览器扩展读屏**(自动化走 API 或用户手点);③ PowerShell 5.1 发中文 JSON 必须显式 UTF-8 字节,否则测试假阴性;④ Supabase 新版 `sb_secret_` key:Storage 请求带**双头**(apikey+Authorization);⑤ **`cms/.env` 的 DATABASE_URI 切到 Supabase 行时=本地 dev 直连生产库,`seed?reset=1` 会重灌生产**——日常开发保持本地库行,推 schema 时临时切。
> **规则更新**:git 提交身份=**Wang Peng**、**不带 Co-Authored-By 尾注**(repo config 已设)。
> **下一步:B4 支付贯通** —— E3-03 时长包 Checkout(mode=payment,卡+Alipay,WeChat 待 Dashboard 确认;Stripe test key 就绪,激活的 Business website 等 M1 后回填)+ E3-04 webhook 单事件拨 proUntil + E4-01 免责声明 v1。M1 收尾:三天日更观察(**家里 build 自动推云端的首轮还没核过**)+ Free→Starter + 域名(等品牌名决策)。杂务:让用户删桌面 render-env*.txt 密钥文件。
>
> **本轮(2026-06-29 顾问弹框三层 + Part B 数据 + 表格固定列 + JD 格式)**:
> **① 弹框三层(事实/判断/对话)**:上半=可核验事实(绝不经 LLM)/ 中=只基于上半事实的 AI 判断 / 下=多轮 grounded 对话([route.ts](cms/src/app/api/advisor/route.ts) 加 `messages[]`,system 带整条岗位事实+铁律,问到没有的数据直说"未提供"不编)。各字段「事实块」`FieldFactsSection`(地点/薪资/分类/来源/经验/时间状态零成本;wiring:firstSeen 进 SQL、designated_employers 维度进前端=AIP 记录、职位 JD 摘录走 `/api/jobtext`、评分明细前端重建)。
> **② Part B 数据缺口(全开放数据 httpx,可进 docker 自动更新)**:**#0** ATS 公司简介进 mart;**#4** 工资 low/中/high+年份(`build_wages` 多抽 + `Jobs.ts` +5 字段);**#1** EE 抽选分数线(`build_ee_draws` 抓 IRCC `ee_rounds_123_en.json`,无 Akamai → ee_categories 加 drawCrs/Date/Size);**#2** NOC 官方名+职责(`build_noc_descriptions` 抓 StatCan NOC 2021 Elements CSV → 新 `noc-descriptions` 维度 397 行)。**#3 PNP 门槛 = 评估后决定留空**(门槛散在各省 checklist prose、工资多定性,解析易错;移民门槛宁可留空,弹框已带官方来源链接)。
> **③ 表格固定左列 + 横滚**:发布时间/大分类/公司/职位 **sticky 固定**(只冻最左连续段,先量列宽算累计 left),其余列给最小宽 → 列多时整表超容器**横向滚动**看隐藏列、列少 `width:100%` 拉满;默认 10 列;**bump 列偏好版本** COLS_COOKIE→`jobsCols2`/PREF_KEY→`v8`。
> **④ JD 正文保留格式**:[clean/05b_parse_details](etl/clean/05b_parse_details.py) `description()` 改抓**可见结构区** `.job-posting-detail-requirements`(h4+ul/li)做块感知提取(原是读 `[property=description]` 压平一坨);聚合帖 property 里的转义 HTML 再解析一次。`REPARSE=1` 重解析 6808 岗 → mart(4699 有正文)→ reseed。**原生 JB 岗格式漂亮;少数聚合纯文本帖源头无结构,天花板**。
> **本轮坑/教训**:① **seed 各维度是显式字段白名单**([seed/route.ts](cms/src/app/seed/route.ts) `dims[]`)—— 加维度字段必须同步加进 map,否则重灌不入库(EE drawCrs 踩过)。② 改 `Jobs.ts`/新 collection → **必须重启 host dev**(Payload 推 schema 加列/建表)再 reseed。③ **noc.esdc 证书链坏 + 不透明 objectid** → 弃用,改 StatCan 开放 CSV。④ canada.ca **category-based-selection 页现可 httpx 直取**(无 Akamai),EE 类别抓取可改 httpx 替掉有头浏览器(未做)。⑤ **EE「类别抽选」≠ 普通 EE**:类别列「—」只代表无定向快车道,不挡普通 EE/PNP/AIP(三条独立)。
> 代码在分支 `feat/lists-autoupdate-and-table-ux`(**未合并 main**,本轮 +20 余 commits)。
> **下一步(新 session)**:① **重建 docker cms :3001 到最新**(本轮改动后 :3001 又旧了:`cd docker && docker compose --profile unattended up -d --build cms`)② #5 公司官网抓取(仅 ~24% 有网址,脆)/ #6 RNIP ③ EE 类别抓取改 httpx(数据已准,只为进 docker 自更)④ 合并 main。详见 [docs/advisor-fields-plan.md](docs/advisor-fields-plan.md)。
>
> **上轮(2026-06-28)**:① **PNP/AIP/EE 三类清单全部 docker 自动更新** —— `pnp` 源(周更 httpx:AB/ON/SK/NS 实时抓 + `06_scrape_aip`)、`ee` 源(月更**无头 chromium**,canada.ca 实测无头+stealth 直接通,无需 xvfb;crawl 镜像保留有头能力给硬墙)。② **每省脚本全实时抓,md 只作参考**(`etl/pnp/build_<prov>.py`)。③ **08_score 把具名通道 stream 与资格 type 解耦** → exclusion 省(AB)也能挂 inclusion 通道;新增 **ON 科技(OINP Tech Draws 9)/ AB 科技(AAIP Accelerated Tech 44)**,全国具名命中 ~247。④ **BC tech 下架**(tech 抽选 2024-12 已关、welcomebc 无清单页;原 bc-tech 是手工从第三方补录的,违反"实时抓")→ BC 岗落绿「可提名」。⑤ **表格显示升级**:PNP 列 3 档强度(具名=琥珀 chip / 可提名 / 不符 + 魁省 N/A)+ 评分列 5 档色阶 + 更新时间时分秒 + 列宽拖拽/缩窄换行。⑥ **修**:09 空省份排序崩溃、04c 非城市占位词清洗。
> 代码在分支 `feat/lists-autoupdate-and-table-ux`(**10 commits,未合并 main**)。
> **下一步(已规划未做)**:见 [docs/advisor-fields-plan.md](docs/advisor-fields-plan.md) —— 每字段弹框「上原始数据块 + 下 AI」+ 补 6 个数据缺口(①EE 抽选分数线 ②NOC 职责 ③PNP 门槛 ④工资 low/high ⑤公司信息 ⑥RNIP)。
>
> **上轮(2026-06-26 移民信号 + 弹框)**:
> ① **PNP 列显示具名通道**:08_score `pnp_stream()` 算命中省清单的短标签(OINP 紧缺技能·科技 / AB 科技 / SK 医疗·科技·农业 / NS 紧缺空缺·毕业生;stream 与资格 type 解耦,exclusion 省也能挂),
> 列里不再只是泛「技能岗」。② **联邦 EE 类别——独立一列**:Express Entry 类别抽选 ≠ PNP(看 CRS、多不需 offer),
> 独立信号;`etl/crawl/_fetch_ee_categories.py` 用 browser_fetch 过 canada.ca 403、展开 DataTables 抓全 9 类 94 职业 → `raw/ee/`。
> ③ **省清单从已抓 policy md 解析,每省一个自包含脚本**(`build_<prov>.py`:`build_bc`/`build_sk`/`build_ns`)读 `raw/policy/<省>/md/*.md`
> (自动读 frontmatter 的 source/fetched)→ `raw/pnp/{bc-tech,sk-health,sk-tech,sk-agri,ns-critical,ns-grad}.json`,无需重抓。④ **清单维度表化**:mart 产 `pnp_occupations`(229)/`ee_categories`(94)
> → seed 入库 → 前端**读 DB props**(删 `/api/pnp-list`、`/api/ee-list` 文件读取;删空壳 `PnpStreams` collection,手动 drop 表+残留列)。
> ⑤ **点 PNP/EE 字段 → AI 顾问弹框**:上半「真实清单」(数据层维度表,**绝不经 LLM**,命中行高亮「← 本岗」),下半 LLM 建议。
> ⑥ **弹框升级**:默认 720×620、右上角全屏切换、标题栏拖动、右下角 resize(原生 pointer,尺寸记忆 localStorage)。
>
> **数据来源坑(见 memory)**:省政府站 + canada.ca 都对 httpx/WebFetch 返 403 → 用 `etl/crawl/browser_fetch.py`(headed Playwright);
> ⚠️ 必须**系统 python**跑(playwright 没装进 uv venv)。HTML 无损、md 便利有损 → 带分组的清单(OINP/AB)从 HTML 解析更可靠。
>
> **下一步(已确认)**:JD 正文灌库 —— 现在 jobtext/advisor **运行时现读 `data/*.md`**(部署需挂文件);拟 Jobs 加 `description`,
> mart 按 applyUrl 匹配 .md 写入,jobtext/advisor 改按 id 读 DB(列表 SQL 不 SELECT 它,避免页面撑爆)。公司简介无正文,需另抓。
>
> **AI 顾问真实性**:职位描述/评分/各字段/PNP·EE 清单——均有真实数据+精确数字作依据(prompt 强制不许编);
> **唯独公司分析靠模型自身知识**(没抓公司正文,冷门公司可能不准)。

## 这是什么
**PNP Job Tracker** —— 每日更新的**全加拿大全职业职位板**,带移民价值视角。能走「雇主 offer → 省提名(PNP)」的岗打 `pnpEligible` 标记(粗筛信号,非资格认定)。
Job Bank 覆盖全 10 省全职业(含 QC);ATS(Kanata 科技公司)仍 Ottawa。

## 架构:数据仓库式分层
```
etl/ raw(抓取) → clean/(清洗,按字段) → mart(集市层,列对齐DB) → cms/ seed(纯加载器) → Postgres → /jobs
```
- `etl/_paths.py` 是**唯一路径真相来源**。按来源分顶层:`raw/ats/` · `raw/jobbank/`;processed 同理 `processed/ats/`。
- **mart(`09_build_mart.py`)**:把各源拼成 `data/mart/*.json`,每文件=一张DB表。中介过滤/去重/评分关联/分类/来源标签 全在这层或更上游。
- **seed(`cms/src/app/seed/route.ts`)= 纯加载器**:只读 mart → 灌库(并发分批)。`?reset=1` 全清重建;不带 reset = 增量对账(没出现的岗→closed)。

## 现状:全国多省,端到端跑通,库里 ~2084 岗 / 1578 公司
- **DB 10 张数据表**:事实 `jobs`(~4834) `companies`(~3667);维度 `provinces`(10) `cities` `districts` `noc_categories`(101) `sources`(5) `experience_levels`(5) `designated_employers`(2917, AIP名单) `pnp_occupations`(216, 各省具名通道职业) `ee_categories`(94, 联邦EE类别职业)。
- **分类全在数据层**:NOC 大/中/小分类+TEER 在 `etl/noc.py`(单一来源)→ 存 job 字段;来源显示标签(JB→Job Bank)在 mart 洗 → `sourceLabel`。前端**只读字段、不再算 NOC**。
- **区(district)= 自维护 FSA→区表**:`reference/fsa-districts.json`(从 GeoNames 加拿大邮编开放数据建,1651个FSA,零API)。04c 按邮编查表洗区,全国可用(Ottawa社区折叠成 city=Ottawa)。769/2084 岗有区。
- **中位工资**:`reference/wages.json`(`build_wages.py` 从 ESDC 开放数据建,NOC×省 中位)。mart 按 NOC+省 join → job 带 `wageMedHourly/wageMedAnnual`(1473 岗匹配)。薪资顾问直接显示「中位 + 本岗 vs 中位 %」。
- **筛选全读维度表**:国→省→市→区(provinces/cities/districts)、大/中/小分类+TEER(noc_categories)、来源(sources)、经验(experience_levels);全字段搜索、表头三态排序、字段自选(含「主要」一键核心列)、**AI 顾问弹框**。
- 列顺序:发布时间第一、评分最后。默认排序发布时间降序(同值评分兜底)。地点列点击跳 Google 地图(各列用自己那一级)。
- **AI 顾问**:职位/公司用本地 Ollama(`OLLAMA_URL=http://192.168.1.150:11434`)流式;其余字段模板。**⚠️ 线上访问不到家里 Ollama,部署前要决定去向。**

## ⚠️ 性能 / 已踩坑
- **`/jobs` 列表走原始 SQL**(`page.tsx` 用 pg pool `SELECT+join`),绕开 Payload 的 per-doc 读取管线(2000+行要16s→0.9s)。**代价:耦合 Payload 的 snake_case 列名,改 Jobs schema 要同步那段 SQL。**
- **衍生抓取数据必须 gitignore**:`postings.json`/`mart/`/`all-scored.json`/`geonames|wages 源`/jobbank公司目录 全已忽略。**教训:之前 postings.json 被 git 跟踪,反复被 restore 回旧版丢数据。** 维护的表(fsa-districts.json/wages.json/AIP)才跟踪。
- 改 Jobs collection 字段 → **必须重启 dev server**(Payload 同步 schema)再重灌。
- **职位 externalId = `jb:<posting_id>`(JB)/ 投递 URL(ATS)**:JB 从帖子 URL 的 `/jobposting/<id>` 取,**不用完整 URL**(2707/2733 带 `?source=` 查询串,带不带就成两个 ID)。⚠️ **它是 08_score↔09_mart 的 join 键,两处必须一致**——只改一边会让评分/NOC/pnp 全丢(踩过:只改 09 → 2203 岗只剩 59 有评分)。
- **下架按发布日期过期,不靠 seenIds 对账**:增量抓取只含最近几天,用「本次没出现→closed」会误杀仍在招的旧岗(实测一次误杀 805)。seed 改为「本次未见 **且** datePosted 超 30 天」才下架。
- **重灌前必须跑完整链**:别只跑半条链(如漏 05b 详情)就 reset 重灌——会灌进缺官网/地址/区、NOC 没匹配的退化数据。完整链:05→05b→04c→04d→05c→08→09→seed。

## data/ 结构(2026-06-25 扁平化:统一 `raw/<源>/[<日期>/]`,删了 reference/output 桶 + 方式层 + ats 地理深嵌套)
```
data/
  raw/                          # extract:每个子目录=一个源/维护表;抓取「方式」记在 sources.py,不进路径
    jobbank/<日期>/             #   JB 列表快照 <省全称>-pNN.html + <日期>/details/<id>.html(gitignore)
    oinp/<日期>/  aaip/<日期>/  #   各省 PNP 政策页原始 HTML(gitignore;维护表见 pnp/)
    ats/                        #   ATS 公司名录 roster(扁平,单区,.json 跟踪;.csv/.md gitignore)
    pnp/  oinp-in-demand.json · aaip-ineligible.json   # PNP 维护表(跟踪,08 读)
    aip/  aip-designated-employers.json                # AIP 名单(跟踪)
    wages/ wages.json + wage*.csv源   fsa/ fsa-districts.json + CA.txt源   policy/<省>-immigration/  # 维护表跟踪+源gitignore
  processed/                    # transform:累积去重的「当前态」(不按日期)
    jobbank/  postings.json + details/<slug>.md
    ats/<slug>/                 #   profile/jobs.json 跟踪;jobs/*.md gitignore
    all-scored.json             #   08→09 评分中间产物(gitignore;文件式更利于上云,不落 DB)
  mart/    8张表 .json(gitignore,09 产出,seed 灌库)
```

## ETL 流水线(`etl/`)—— 抓取/解析已分离(raw 只存原始 HTML,解析在 clean/→processed)
| 脚本 | 作用 |
|---|---|
| 01-03 | ATS:Kanata 名录 → 公司文件夹 → 找 careers(写 raw/ats、processed/ats,扁平)|
| 04 scrape_ats_jobs | ATS 第一方岗(greenhouse/lever/workday…)→ processed/ats/<slug>/ |
| **05 scrape_jobbank** | **纯抓**:`--all-occupations --prov ALL --since-days N` → 每页原始 HTML 存 `raw/jobbank/<日期>/<省全称>-pNN.html` + manifest,不解析 |
| **clean/05_parse_jobbank** | 读最新日期快照 → parse_article 解析 → 增量去重合并 `processed/jobbank/postings.json`(temp+os.replace 原子写;去重键=url 派生 posting_id)|
| **05b scrape_jobbank_details** | **纯抓**:对未富集的帖抓详情 HTML → `raw/jobbank/<日期>/details/<id>.html`(增量靠 detail_fetched/文件存在)|
| **clean/05b_parse_details** | 解析详情 HTML → 富集 processed postings(address/website)+ 写 processed/jobbank/details/<slug>.md |
| **clean/**04b/04c/04d/05c | 抽薪资 / 地点(FSA查表洗区) / 薪资归一 / AIP标记。脚本顶部声明 `IN_*/OUT_*` 全路径 |
| 06 build_jobbank_companies | (遗留,无下游消费者)把 postings 物化成公司目录;不在容器管线里 |
| 08 score | NOC→TEER+评分+pnpEligible(按省:08 读 raw/pnp/*.json,inclusion/exclusion 两型)→ processed/all-scored.json |
| build_fsa_districts | GeoNames → fsa/fsa-districts.json(偶尔重建)|
| build_wages | ESDC开放数据 → wages/wages.json(年度更新)|
| etl/pnp/build_<prov> | 每省一个自包含脚本 → pnp/*.json。**AB/ON/SK/NS 全实时抓**(ON 双流含科技,AB 含科技 PDF;SK/NS 复用 HTML→md 转换器)。BC tech 抽选 2024-12 已关→**无具名通道、已下架**。**docker `pnp` 源(周更)**|
| 06_scrape_aip_employers | AIP 指定雇主 NL/NB/NS → aip/(PE 仍 TODO);随 `pnp` 源周更 |
| _fetch_ee_categories | 联邦 EE 9 类/94职业 → ee/。**已上 docker `ee` 源(月更,crawl 镜像无头 chromium,canada.ca/Akamai 无头直接通,无需 xvfb)**|
| 09 build_mart | 拼装 → data/mart/*.json(8张表 + 分类/来源/工资 join)|
| auto_update | 调度器:读 sources/<SOURCE>/META 跑 steps;**loguru 统一日志**,逐行截获子进程输出套「时间\|级别\|源\|消息」|

## 怎么跑(新机/新 session)
```bash
cd pnp-job-tracker/docker && docker compose up -d postgres   # 起库(全栈 compose,项目名 pnp,容器 pnp-*)
cd ../cms && npm run dev                                      # 开发 :3000(库走宿主 5432)
# 完整重跑 ETL(走 _paths):
#   05 --all-occupations --prov ALL --since-days 3  → 05b → clean/04c → clean/04d → clean/05c → 08 → 09_build_mart
#   (ATS 链 01-04+04b 另跑;build_fsa_districts/build_wages 偶尔重建)
# 重灌: curl "localhost:3000/seed?reset=1"   |  增量: curl "localhost:3000/seed"
#
# 自动日更 / 开机自启(docker/):
#   开发(cms 用 host npm run dev):  cd docker && docker compose up -d                        # 只起 etl 自动机
#   无人值守(cms 也容器化):         cd docker && docker compose --profile unattended up -d --build
#   日志 docker compose logs -f  |  停 docker compose --profile unattended down
#   ⚠️ 两模式都抢 :3000,别同时跑。开机自起再去 Docker Desktop 勾「登录时启动」。
```

## 待做(优先级)
- **Phase 3 — Docker 开机自抓服务 ✅ 已建并跑通验证(2026-06-24)**:单一 `docker/docker-compose.yml`(项目名 `pnp`,容器 `pnp-postgres/cms/jobbank/build`)+ `etl/auto_update.py`。`restart: unless-stopped` + Docker Desktop 登录自启 = 开机自更新。用法见上「怎么跑」(开发=`up -d postgres`+host npm;无人值守=`--profile unattended up -d`)。
  - **实测一轮端到端通**:jobbank 抓(05/05b,东部时间日志)→ build 清洗/评分/mart → curl cms → seed 200;今天(6-24)数据入库、全部有评分、区/官网富集、稳定 `jb:<id>`。
  - ⚠️ **运维注意①(富集时序)**:build 按自己的 2h 计时,首轮常在 jobbank 的 05b(详情/地址)跑完前就 seed → 该轮 districts/官网偏少。**下一轮(build 用上一轮已富集数据)自动恢复**;想立刻富集可 `docker compose restart build`。
  - ⚠️ **运维注意③(笔记本睡眠会暂停)**:`time.sleep` 走单调时钟,合盖/睡眠时 VM 暂停、计时冻结 → 整夜不出新周期(不是 bug,容器只有 1 个 python 在 sleep)。醒后需累计够「清醒时长」才触发。想立刻更新:`docker compose -f docker/docker-compose.yml restart build jobbank`(build 立即灌、jobbank 重抓)。要真·7×24 自动 → 部署到常开主机(Render,见框架文档)。
  - ⚠️ **运维注意②(过期累积)**:下架按「发布超 30 天」而非对账,所以近期但本轮没出现的岗会暂留 → DB open 数会比当前实际在挂的多(JB 重发换 posting_id 会放大此现象,30 天内自然清)。彻底干净基线可 `curl "localhost:3000/seed?reset=1"`。真要去重得按内容(公司+标题)而非 posting_id —— 记入 [docs/source-framework.md](docs/source-framework.md)。
  - 旧 `docker compose up -d --build` 命令已随合并失效,改见「怎么跑」。
  - **角色拆分**(关键):抓取按源拆,但清洗/评分/mart/seed 是全局的、只一份。`SOURCE=jobbank` 只抓(05/05b 刷 raw);`SOURCE=build` 跨源清洗(04c/04d/05c)→评分(08)→mart(09)→`GET /seed`,是**灌库唯一角色**。多源不抢 mart/seed。加源 = SOURCES 登记 + compose 复制 service 改 SOURCE。
  - 抓法统一 **httpx**(JB 服务端渲染,已证明稳);`crawl/` Playwright 是有头+人工验证,**不进容器**,只给手动抓 Cloudflare 政府站用。
  - 编排器在 `etl/`(业务),容器配置在 `docker/`(运维)。代码/data 靠 bind-mount,改脚本不用重建镜像。
  - **cms 已容器化 ✅(`unattended` profile)+ 单一 compose(项目 pnp,容器 pnp-*)**:整套(postgres + cms + jobbank + build)开机自起、每 2h 自更新。cms 用服务名 `postgres:5432` 连库、挂 `../data:/data` 供 seed 读 mart、发布 :3000;build 经 `host.docker.internal:3000` 灌库(host npm dev 或容器 cms 都通)。pgdata 卷 pin `cms_pgdata` 不丢库。改动:next.config `output:'standalone'`、Dockerfile node24+`npm install`+空 `public/`。
  - **下架已改按发布日期过期 ✅**:不再用 seenIds 对账(实测会误杀 805 仍在招的旧岗)。seed 改「本次未见 **且** datePosted 超 30 天」才 closed。**(旧 STATUS 说「增量 seed 安全」是错的——postings.json 基底不全时会误杀。)**
  - **职位 ID 已改稳定 `jb:<posting_id>` ✅**:见「已踩坑」段(它是 08↔09 join 键,两处一致)。
  - 剩余小坑:build 读 postings.json 与 jobbank 写它有微小竞态(读到半写→该轮失败重试,文件不损);需要可给 05 加 temp+rename 原子写。
- **统一源框架(目标架构已定:[docs/source-framework.md](docs/source-framework.md) v2,D1-D5 全部拍板)**:三种抓法分三目录(httpx/crawl/dataset),**铁律=抓取只存原始 raw、清洗在 processed**,raw 按 `方式/源/日期` 快照不可变,源注册表独立 `etl/sources.py`,`auto_update` 只是调度器。OINP/SINP/AAIP 各省 PNP 单独成源(crawl,周/月)。**按文档第 8 节分步实施,JB 最后拆**(fetch 留 httpx、解析下沉 clean;回归基线=2084 岗 mart 一致)。尚未动手。
- ✅ **/jobs 前端这轮已上线(容器,2026-06-24)**:中英韩 i18n([i18n.ts](cms/src/app/(frontend)/jobs/i18n.ts):字典+makeT,语言切换 localStorage);**AI 顾问全字段走 Ollama**(按所选语言生成、facts/评分明细喂 prompt 保数值准、简单字段一句话——见 [route.ts](cms/src/app/api/advisor/route.ts) 的 SIMPLE 集;前端 advHeader 只出标签+链接,无三语长文);sticky 顶栏 + 响应式 footer;滚动自动加载封顶 180 + 「显示更多」按钮;新增 中位时薪/中位年薪/**vs中位** 列;**全字段筛选**(分类下拉 PNP/AIP/状态/渠道 + 数值区间 评分/年薪K/vs中位%)。维度表(NOC 中/小分类名等)三语待数据层做(name_zh/en/ko)。
- **各省 PNP 职业清单(crawl 源)**:把 `pnpEligible` 从粗筛升级成**按省精准**。
  - ✅ **OINP 试点已跑通**:`etl/pnp/build_on.py`(httpx 抓 ontario.ca OINP In-Demand Skills 页,无 Cloudflare)→ bs4 解析 56 个 NOC(任意 9 / 限 GTA 外 47)→ 维护表 `reference/pnp/oinp-in-demand.json`(跟踪;原始 HTML 存 raw/crawl/,gitignore)。`08_score` 读该表当 TEER4-5 紧缺通道(原写死 6 → 真实 56)。**模式 = build_<prov>.py → reference/pnp/<prov>.json → 08 消费**。
  - ✅ **② `pnpEligible` 已改按省过滤(2026-06-25)**:`08_score` 现**目录驱动**——扫 `reference/pnp/*.json` 按各文件 `province` 字段建 `省→{NOC}` 表(`INDEMAND_LOW_BY_PROV`)。TEER0-3 全省粗筛通用;TEER4-5 仅当 NOC 在**该岗所在省**清单才 eligible。加新省=丢一个 json,08 不改代码。**魁省(QC)直接排除**(`NON_PNP_PROV`,走自己的甄选不属 PNP)。实测修正 264 个跨省误标(QC 69/SK 51/AB 34…),pnpEligible 1580→1461。去掉了原硬编码 6 个兜底 NOC(那是瞎猜)。
  - ✅ **AB(AAIP)已接入(2026-06-25)= 第二个省 + 两型框架**:`etl/pnp/build_ab.py`(httpx 抓 alberta.ca AOS 资格页,虽 Cloudflare 但 httpx 直抓 200)→ 解析「不符合资格职业」表(34 个 NOC)→ `reference/pnp/aaip-ineligible.json`。**关键:AAIP 与 OINP 语义相反** —— AOS 是 **exclusion/permissive**(TEER0-5 默认都可走,清单内不可),OINP 是 **inclusion**(TEER4-5 默认不可,清单内才可)。08_score 给省表加 `type`(indemand/ineligible)字段据此反向判定;`score` 的 +12 只对 inclusion 型加。实测 AB 新增 76 个 TEER4-5 岗正确标可走、修正掉 1 个(排除表里的 TEER0-3),pnpEligible 1461→1536。
  - **调研结论(各省 PNP 结构异构,OINP inclusion 非通用)**:**BC** 低 TEER 的 ELSS 流 2024-12-10 永久关闭(无表=逻辑已天然正确);**SK(SINP)** 用排除清单+行业配额模型(另一种形状);**MB(MPNP)** 有 in-demand 清单但 TablePress JS 动态加载(静态 HTML 只 2 行,需 AJAX 端点或 headless),未做;**AB(AAIP)** 是干净 httpx 静态表→已做。
  - 待办:① 其余省继续(SINP 排除+配额 / MB 需破 TablePress 端点 / 其余 inclusion 省)——加 inclusion/exclusion 表丢 json 即生效;③ OINP 其它 stream(Foreign Worker/International Student 是 TEER0-3 广覆盖,已被现逻辑包住);④ build_on 接入低频定时(像 build_wages,偶尔重抓);⑤ 真有 Cloudflare 的省 → 需 headless crawl 镜像(D3);⑥ OINP 的 `gtaRestricted`(限大多伦多区外)暂未按岗所在区过滤——08 只有省粒度,接入区粒度后再细化。
- ✅ **未分类大幅降(2026-06-26)**:改从 **Job Bank 详情页抽官方 NOC**(`<span class="noc-no">NOC <码></span>`,05b/parse_details 抽 → posting.noc),08 分类优先级 **源NOC > 标题猜**。未分类 31%→预计 ~5%(只剩 JB 自己没标的)。存量帖一次性重抓回填(05b 对缺 noc 的也重抓,自愈)。剩余少量可继续加 noc 规则或 AI 兜底。
- 扩源:其它商会名录、Indeed/LinkedIn(放最后,ToS 风险)。用 etl/crawl/ 抓政策页填 policy_docs/pnp_streams 空表。
- 部署运维:托管(Vercel+Neon/Railway)、每日 cron、AI 顾问线上去向、`.env.example`、关于/免责声明页。
- **前端/AI**:① AI 顾问**公司分析接真实数据**(现靠模型知识,冷门公司可能编)——轻量=把 JD+官网喂进 company prompt+强化「不确定就说」;重=06b 抓公司官网首页文本进管线。② NOC 中/小分类名三语(name_zh/en/ko,数据层做)。③ 统计模块(用户提过:任意维度×指标,单页还是分模块,jobs 模块命名)——未设计。④ 累积稀释:DB 旧岗保留旧 pnp/NOC/QC 标记,靠 30 天老化或 reset 收敛(用户不愿删岗,选自然收敛)。
- **本轮踩坑记**:① 服务端组件从 `'use client'` 模块导入普通常量会拿到 undefined(COLS_COOKIE 必须放共享非-client 模块)。② cookie 值 encodeURIComponent 编码,服务端读出要 decodeURIComponent 再 parse。③ SSR+localStorage 偏好天生闪烁(默认→切换),要么 cookie 让服务端直接渲对、要么 useLayoutEffect 绘制前切。④ cms 容器 data 挂在 `/data`(standalone cwd=/app,`../data`=/data);改 cms 源码要重建镜像(`up -d --build cms`),非 bind-mount。

## 关键决策记录
- **数据仓库分层**:raw→clean→mart→load;mart 是「列对齐DB的最终表」,seed 只灌不拼。维度表(省市区/NOC/来源/经验/AIP)各自维护。
- **区从 GeoNames 自维护表**洗,不用限速的 OSM 地理编码 API。中小城市 FSA=城市本身、无子区时留空(数据天花板)。
- **列表读用原始 SQL** 而非 payload.find(性能);Payload 仍管 schema/admin/写入。
- 来源真相:JB 聚合 indeed/Talent → 统一显示「Job Bank」,`source` 留原始板。中介已按公司名过滤。
- 地点:Ottawa 各社区是「区」,统一 市=Ottawa;Richmond Hill 等靠**邮编 FSA**判定(不子串撞社区名)。
