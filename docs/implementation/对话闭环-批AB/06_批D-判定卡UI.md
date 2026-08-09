# 批D · 判定卡 UI + 三入口 + 付费闸

> 子工 D · 2026-08-09(Frank 效果图四轮拍板「继续吧」放行)
> 上位设计:[一键三合一判定-20260809](../../design/一键三合一判定-20260809.md) §5 入口与形态 / §6 付费闸;
> 组装器与入参清单:[05_批C-tripleVerdict组装器](05_批C-tripleVerdict组装器.md) §6.1 行清单 / §8.2 入参清单。
> 效果图拍板过程(2026-08-09,四轮):v1 初稿 → v2 删解释文案+加图 → v3 图标全撤 → v4 报告页删尽解释句。
> **拍板后的版式基准 = se287-*.png v3/v4**:三关文字胶囊条、免费行+官方 quote+出处日期、
> 锁区=行名可见值打码+ProCard、无档案态=六行「—」+建档 CTA+预填问句胶囊、入口卡=标题+按钮零解释。

## 0. 范围(scope-follows-decree)

- ✅ 本批:三入口挂钮(职位板卡片/详情页/PNP 弹框/公司弹框)+ 判定卡本体(锁态/无档案态)+ `/api/triple-verdict` + i18n 三语 + 漏斗埋点。
- ✅ 付费闸:按 **B 案(并入 Pro)** 接既有升级链 —— 效果图按 B 画且 Frank 拍板放行;A/C 形态只换 ProCard 文案,闸结构不变。
- ❌ 不在本批:付费报告页管线(批D 拍板只出版式效果图)、`permitMonthsLeft` 档案槽新增(批C §8-6 记档,时间窗行如实渲 unknown)、`lmia_nocs` 回填(#286 整点批)、`designated_employers` 出处列(09 带出后自动挂)。

## 1. 整体目标

用户在职位行/弹框一键打开判定卡:免费行(职业关/雇主关事实,quote-anchored)直渲;
付费行(个人关/时间窗/换省/比路/下一步)**锁合成不锁事实**——行名可见、params 服务端剥离;
无档案登录用户与匿名用户免费行照出、付费位引导建档(预填问句拉对话,不弹题海)。

## 2. 验收标准

- [x] ① `/api/triple-verdict?job=<id>`:服务端组装四入参调纯函数;非 Pro 的 paid 行只下发 key/gate/state,params/quote/evidence 剥离(**不许先发再用 CSS 遮**)
- [x] ② 判定卡组件照 v3 效果图:三关胶囊条 / 免费行 ✓ + quote + 出处 / LockedRows+ProCard 锁区 / 无档案态建档 CTA + 预填问句
- [x] ③ 四入口挂钮:职位板手机卡胶囊排尾 pill、详情页 PathwaysCard 上方入口卡、PNP 弹框判定卡后、公司弹框担保记录卡后
- [x] ④ i18n `tv.*` 三语(en/zh/ko),文案过四闸(零逗号标题/无解释句/术语=职业关·雇主关·个人关/值一行放下)
- [x] ⑤ 漏斗埋点:入口点击 / 卡打开 / 锁区曝光 / 升级点击
- [x] ⑥ `tsc --noEmit` 绿;既有测试不红
- [x] ⑦ dev 实测(直连生产库,375 先验英文态先行;分层=匿名实测+API 拦截模拟有档案态,见 §7-3),验完关 dev
- [x] ⑧ 本实施文档

## 3. 实现步骤

- [x] **3.1** 读接线点:/api/pathways 数据缓存、EmployerFacts 组装与名录名字匹配、users.profile 读法、Pro 判定、jobs 行取法。
- [x] **3.2** `/api/triple-verdict` 路由:组装 TripleJob/TripleCompany/TripleProfile + loadVerdictData(同一缓存对象);Pro 分层裁剪。
- [x] **3.3** `TripleVerdictModal` 客户端组件(懒取;拿不到数不渲空壳)。
- [x] **3.4** 四入口挂钮 + 打开事件(与既有弹框叠放层级一致)。
- [x] **3.5** i18n `tv.*` 三语。
- [x] **3.6** 漏斗埋点接既有 funnel。
- [x] **3.7** tsc + 全量测试 + dev 实测(锁态/无档案态/Pro 态)。

## 4. 涉及文件

| 文件 | 动作 |
|---|---|
| `cms/src/app/api/triple-verdict/route.ts` | **新增** |
| `cms/src/app/(frontend)/jobs/TripleVerdictModal.tsx` | **新增** |
| `cms/src/app/(frontend)/jobs/JobsTable.tsx` | 改:手机卡胶囊排尾 pill、PnpListSection 入口卡、CompanyBody 入口卡 |
| `cms/src/app/(frontend)/jobs/[id]/JobDetailView.tsx` | 改:PathwaysCard 上方入口卡 |
| `cms/src/app/(frontend)/jobs/i18n.ts` | 改:`tv.*` 三语 |
| `cms/src/lib/funnel.ts` | 改:新事件注册(若需) |

`tripleVerdict.ts` / `pathVerdict.ts` / `employerVerdict.ts` / `rules.ts` / collections / schema 零改动。

## 5. 现有代码(复用点)

| 件 | 复用 |
|---|---|
| 数据面 | `chatTools.loadVerdictData`(与 /api/pathways 同一缓存;判定层六张表禁每请求现算) |
| 锁区 | `ui/primitives.tsx` `LockedRows` + `ProCard`(打码惯例原件) |
| 弹框壳 | `jobs/Modal.tsx`(窄屏全屏、SCRIM/CARD token) |
| 升级链 | 既有 UpgradeModal/PricingModal 打开链(B 案零新计费面) |
| 对话预填 | `o2p:chat-open` CustomEvent(PathwaysCard 同款) |

## 6. 完成定义(DoD)

- [x] 验收标准 ①-⑧ 全勾
- [x] 生产库零写入(路由只读)
- [x] commit 后 `git show --stat` 自查(并行 session 暂存危害;6dccd68=8 文件全为本批)
- [x] push 后按 verify-deploy 惯例拉新路由验生产换版(f9fd91f 上线后 /api/triple-verdict?job=11039073 生产 200:免费 6 行齐、付费 6 行全 locked 零 params;home 5.3s 恢复)

## 7. 实测发现

1. **`loadVerdictData` 的 `designated_employers` 切片是 NL-only**(chatTools.ts `WHERE province='NL'`)——
   判定卡的名录命中不能吃缓存数据面,路由单独按 (province, 公司名双向 ILIKE) 实查一行。
   短公司名(连锁品牌)有误配面,首例数据核对记入观察项。
2. **全站此前没有 companies↔designated_employers 名字匹配**(named 快照的 named=岗位命中清单,另一件事)——
   本批是第一处;金标 Grand View Manor(名录=法定全称带 o/a 别名)实测命中。
3. **Pro 态本地建不了**(local-verify-toolkit 既有约束):锁区=匿名态实测 + Playwright 拦截 /api/triple-verdict
   改 hasProfile/loggedIn 验有档案锁态与 UpgradeModal 链;Pro 直渲分支靠服务端裁剪逻辑+tsc 保障,生产 Pro 号补验。
4. **Playwright `is_mobile=True` 仿真伪影**:375 视口下 innerWidth 变 568(布局视口缩放),弹框看似未满屏——
   纯 viewport 375 复测=满屏无溢出;后续 375 走查脚本别开 is_mobile。
5. 付费行显示顺序修一笔:组装器输出序=关别序(雇主 next 在 person 前),显示层按效果图定稿排
   (语言→经验→时间窗→换省→比路→雇主下一步),PAID_ORDER 排序不改数据。
6. 遗留(接批C §8 记账):`permitMonthsLeft` 复用 `users.profile.pgwpMonthsLeft`(>0 即折 status=pgwp);
   `familySize`/`expCanadaMonths` 等 11 槽档案无字段恒 null → 对应行如实 unknown+followups,不补默认。
