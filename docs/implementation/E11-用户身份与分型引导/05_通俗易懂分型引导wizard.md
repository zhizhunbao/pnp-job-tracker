# E11-05 通俗易懂分型引导(零打字点选)

> 承接 `docs/用户信息与社交登录规划.md` §2.5 分型分叉 + §3.4 术语翻译。E11 第五件(规划标 L),依赖 E11-04(已上线)。
> 拆两块做:**① ProfileForm 大白话零打字改造**(本文档,已实施)/ **② 分型分叉 onboarding wizard**(E11-05b,待做,先出 mockup)。

## 1. 目标与非目标

- ① 目标:把现有账户「移民档案」表单的输入**全改零打字点选**(原则 B「能选不打字」)——职业热门 chips、英语/EE分/工签 区间单选、目标省 chips、分型单选(E11-04);官方码/术语藏进数据层,界面说人话。
- ② 目标(待做):分步 onboarding wizard,按分型(§2.5 A–E)只问该型相关字段,进度可见、每项可跳过、价值前置(「填完立刻看匹配」)。
- 非目标:新增字段(仍只收 currentStatus + 现有移民档案层;目标学校/经验/薪资 YAGNI)、按分型改岗位推荐权重(E12)、职业**分类下钻**(本次用热门 chips + 搜索兜底覆盖,下钻留 ②)。

## 2. 数据 / schema

- **零字段变更**。仅把已有 profile 字段(nocCodes/clb/crs/targetProvinces/pgwpMonthsLeft/currentStatus)的**采集 UI** 换成点选。无 DB 迁移、无 seed 改动。
- 大白话→值映射单一来源 = `account/profileOptions.ts`(wizard ② 复用):
  - 热门职业 14 条(NOC 2021 官方码,逐条对照 `data/mart/noc_descriptions.json` 核过)。
  - CLB 档:初级4/中级6/流利8/高分9。CRS 区间**存下界**(<400→399/400/450/500)。PGWP 区间:<6→3/6–12→9/1–2年→18/不清楚→null。

## 3. 后端 / API

- 无变更。保存仍走 `PATCH /api/users/:id { profile }`(selfOrAdmin)。crs 仅在选「算过」时写值,否则 null。
- ② wizard 取 userId 走 Payload `/api/users/me`(客户端 fetch);末步一次性 PATCH 整份 draft。**无新端点、无 schema 变更。**

## 3b. ② wizard 交互(已实施)

- **落点=弹框·首访自动弹**:JobsTable mount effect——`loggedIn && !profileOk && !localStorage[OB_SEEN_KEY]` → 弹一次;关/完成置 `OB_SEEN_KEY`('jobs_onboarding_v1',单一来源在 OnboardingWizard.tsx),不再自动弹。手动入口(推荐横幅「建档」、匹配视图未建档 toggle)直接开、忽略该键。
- **分叉**:第 1 步永远分型(§2.5),`BRANCH[status]` 决定后续步:overseas=[noc,clb,crs,prov] · studying=[prov,noc] · working=[noc,prov,pgwp] · jobhunting=[noc,clb,prov,pgwp] · pr=[noc,prov]。改分型 → 步骤列表实时重算(cur 用 min 夹取,不越界)。
- **每步**:进度条 + 价值前置一行(ob.value)+ 一问零打字点选(复用 profileOptions 组件)+ 跳过/上一步/下一步;末步「看我的匹配 →」。
- **末步**:置 OB_SEEN → PATCH(uid 拿不到则跳过保存不卡住)→ `hasProfile(draft)` 真则整页跳 `/?view=match`(SSR 重算 profileOk 亮匹配视图=价值前置兑现),否则回 `/`。
- **职业步**:热门 chips 一点即选(藏码)+ 已选回显 + 「没有?可跳过,稍后在账户里搜索」提示;**wizard 内不放搜索**(快速建档走热门,搜索留 account 的 ProfileForm),分类下钻同留 account。

## 4. 前端(① 已实施)

- `profileOptions.ts`(新):热门职业 + CLB/CRS/PGWP 区间选项 + 「值→高亮哪档」归属函数。
- `ProfileForm.tsx` 重构:
  - 职业=热门 chips 一点即选(**只显示职位名,藏 5 位码**;`nocTitle()` 官方名→热门标签→码兜底)+ 搜索降级为兜底(结果去码只显标题)。
  - 英语/EE分/工签=区间单选(统一 `chip()` 样式 + `BucketRow`);EE 分两段式(没算过=跳过 / 算过→区间)。
  - **数据完整性**:clb/crs/pgwp 用「值即 state」——返回用户已填精确值未主动改档时**原值保留**(不点不覆盖);CRS 存下界=保守,永不把区间当精确分造成假「高于抽选线」。
  - 分型(E11-04)置顶、目标省 chips 保留。
- i18n 三语:prof.noc/clb/crs/pgwp/prov 标签改大白话 + prof.jobPopular/job.*(14)/clbOpt.*/crsCalc.*/crsOpt.*/pgwpOpt.* 新键。

## 5. 运维

- 无。纯前端 + i18n,push=Render 自动部署。

## 6. 验收

- [x] `profileOptions.ts` 热门 14 码逐条对照 noc_descriptions 核过(NOC 2021)
- [x] ProfileForm 全改零打字点选;搜索兜底去码;typecheck 过(仅 .next jobs-data 残留噪声)
- [x] 返回用户精确 clb/crs/pgwp 未点选时原值保留(state 初值=精确值)
- [x] ① ProfileForm 大白话改造 typecheck 过;返回用户精确值不被区间冲掉
- [x] ② wizard 实现:分型分叉 BRANCH + 进度 + 跳过 + 价值前置 + 末步跳匹配;OB_SEEN 单一来源;typecheck 过
- [x] ② placement=弹框首访自动弹(mockup 已对齐);推荐横幅/匹配 toggle 未建档改开 wizard(原跳 /account)
- [ ] **待 Frank 登录实测 ①**:各档点选→保存→刷新回读高亮正确;热门 chip 加/删;搜索兜底;三语;窄屏不溢出
- [ ] **待 Frank 登录实测 ②**:无档账号首访 /jobs 自动弹一次(关后刷新不再弹);选不同分型→后续步分叉对;跳过可用;进度条走对;末步「看我的匹配」→ 存档 + 落到匹配视图;横幅「建档」/匹配 toggle 未建档也能开;三语;窄屏

## 7. 落地记录(2026-07-18)

- ① 实施:`account/profileOptions.ts`(新)+ `ProfileForm.tsx` 重构 + `jobs/i18n.ts` 三语。**无 schema 变更**(currentStatus 列 E11-04 已加)。
- ② 实施:`jobs/OnboardingWizard.tsx`(新,复用 profileOptions + Modal 壳)+ JobsTable 接线(state/首访 effect/横幅 CTA/匹配 toggle/render)+ i18n `ob.*` 三语。placement=弹框首访自动弹(拍板);修了一个重弹隐患(finish 也置 OB_SEEN)。typecheck 绿。
- 留后续:wizard 内职业搜索/分类下钻(现走热门 chips + account 搜索兜底);多组合/编辑态。
