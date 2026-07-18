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
- [ ] **待 Frank 登录实测**:各档点选→保存→刷新回读高亮正确;热门 chip 加/删;搜索兜底;三语标签;窄屏 chips 换行不溢出
- [ ] ② 分型分叉 wizard(E11-05b):先出 mockup 对齐,再实现

## 7. 落地记录(2026-07-18)

- ① 实施:`account/profileOptions.ts`(新)+ `ProfileForm.tsx` 重构 + `jobs/i18n.ts` 三语。typecheck 绿。**无 schema 变更**(currentStatus 列 E11-04 已加)。
- ② 待做:onboarding 分叉 wizard(placement=modal 首登 / 独立 /onboarding / account 内分步 待定,mockup 先行)。
