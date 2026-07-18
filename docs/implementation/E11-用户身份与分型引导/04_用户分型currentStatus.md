# E11-04 用户分型 currentStatus

> 承接 `docs/用户信息与社交登录规划.md` §2.5(分型 A–E)+ §3.3/§3.4(求职意向层 · 术语翻译)。E11 第四件,依赖 E11-01(已上线)。
> 分型是「一步分型 → 后续按型走」的**分叉锚**,也是 E12 移民路径引擎的分型输入。本件只落**字段 + 单选入口 + 顾问 grounding 路径语境**;
> 完整零打字 onboarding wizard(分叉问法/价值前置/可跳过)是 E11-05。

## 1. 目标与非目标

- 目标:
  ① Users.profile 加 `currentStatus`(§2.5 A–E,存稳定 slug,界面大白话点选);
  ② ProfileForm 顶部加**零打字单选**「你现在是什么情况?」(原则 B:能选不打字);
  ③ 把分型喂进**顾问 grounding** —— 修身份红线(#50):顾问不再对所有人假设「留学生/PGWP」,读者是海外直申还是在职工签,路径话术不同。
- 非目标:onboarding wizard 分叉问法(E11-05)、按分型改岗位推荐权重(E12/后续)、match 评分消费 currentStatus(v1 只作 grounding 语境,不进分数)、目标学校等功能驱动字段(YAGNI)。

## 2. 数据 / schema

Users.profile group 新增(**本人可改**,无字段级锁,与现有 profile 同):
| 字段 | 类型 | 值 | 说明 |
|---|---|---|---|
| `profile.currentStatus` | text | `overseas`/`studying`/`working`/`jobhunting`/`pr` | §2.5 A–E 的稳定 slug;界面显示大白话,幕后存 slug(§3.4「直接存」)|

- slug ↔ 分型:overseas=A 海外直申 · studying=B 在加留学 · working=C 工签在职 · jobhunting=D 在加找工作 · pr=E 已PR/纯找工。
- 枚举**单一来源** = `lib/match.ts` 的 `CurrentStatus`/`CURRENT_STATUSES`(前后端同构;ProfileForm、advisor、未来 E11-05/E12 都引这一处)。
- **schema 推送**:沿用 E11-01 手法——不走 DB_PUSH(怕误推它项),手工 `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_current_status varchar;`(与 Payload text 字段 `character varying` 一致;老版 app 忽略多列,additive 安全)。seed 不碰 profile(用户自填,非 mart),**无需改 seed 列白名单**。

## 3. 后端 / API

- 无新端点。currentStatus 随现有 `PATCH /api/users/:id { profile: {...} }` 一并保存(update 已限 selfOrAdmin)。
- **顾问 grounding**(`api/advisor/route.ts`):对**任何登录用户**(非仅 Pro),读 `profile.currentStatus` → `statusEn()` 出一行英文路径语境 `readerCtx`,拼进 `pf` 注入 prompt。
  - 与既有 Pro 档案事实(`profileFacts`,hasProfile 门槛)**解耦**:身份语境是身份红线(安全)不是付费数据,免费用户设了也生效;profileFacts 保持 Pro-only、结构不变。
  - `readerCtx` 措辞:「读者自报处境 = …;以此为读者真实身份(覆盖泛化受众假设),据此措辞移民路径。仍不得断言档案未陈述的事实。」——不推翻 SYSTEM 的反编/身份红线,只补真实身份锚。
- `lib/match.ts`:`MatchProfile` 加 `currentStatus: CurrentStatus | null`;`normalizeProfile` 按枚举校验(非法值→null);新增 `statusEn(slug)` 出路径语境串(与 reasonEn 同址,英文事实喂 LLM)。match() **不用它评分**(v1)。

## 4. 前端

- **ProfileForm** 顶部(NOC 之上,分型是第一问)加单选按钮组:`t('prof.status')` 问句 + 5 个选项 chip(单选,复用省份 chip 视觉,选中蓝底)。
  - `ProfileValue` 加 `currentStatus?: string | null`;`initial.currentStatus` 回填;save 时并入 profile PATCH。
  - 零打字:纯点选,可不选(可空)。
- 账户页 `initial={me.profile}` 已含整个 profile,`Me.profile` 类型随 ProfileValue 自动带上 currentStatus,无需改 page.tsx 结构。

## 5. i18n

`jobs/i18n.ts` 三语加:`prof.status`(问句)+ `prof.st.overseas/studying/working/jobhunting/pr`(5 短标签)。大白话、不露 A–E/官方术语。

## 6. 验收

- [x] Users.profile.currentStatus 加成(Users.ts profile group);枚举单一来源 lib/match.ts
- [x] typecheck 过(源码零错误;仅 .next 残留 jobs-data 引用报错,E10 删路由的已知噪声,非本次)
- [x] match 评分不受影响(currentStatus 不进 match();test/int/match 走 normalizeProfile,currentStatus→null,快照不变)
- [ ] **DB 列 `profile_current_status` 存在**(varchar)—— 待生产 ALTER(见 §7,push 前必须先补列)
- [ ] ProfileForm 顶部单选渲染 + 保存后回读仍在(PATCH /api/users/:id)—— 待 Frank 登录实测
- [ ] 顾问对**设了 currentStatus 的登录用户**注入 readerCtx(海外直申样本:话术按 EE/FSW 而非默认 PGWP);未设=零注入,行为不变 —— 待 Frank 登录实测
- [ ] **待 Frank 登录实测**:改分型保存刷新仍在;顾问对不同分型话术分叉(需登录态)

## 7. 落地记录(2026-07-18)

- 代码侧(未 push):
  - `Users.ts` profile group 加 `currentStatus`(text,本人可改)。
  - `lib/match.ts`:`CurrentStatus`/`CURRENT_STATUSES` 枚举 + `MatchProfile.currentStatus`(v1 不进评分)+ `normalizeProfile` 按枚举校验 + `statusEn()` 出英文路径语境。
  - `api/advisor/route.ts`:对任何登录用户读 currentStatus → `readerCtx` 拼进 pf(免费也生效,profileFacts 仍 Pro-only);cache key 的 `pf ? :p<uid>` 逻辑天然给设了分型的免费用户按人隔离缓存,无需改。
  - `account/ProfileForm.tsx`:顶部零打字单选(5 选项,可空,再点取消);save 并入 profile PATCH;`ProfileValue` 加 currentStatus。
  - `jobs/i18n.ts`:prof.status + prof.st.{overseas,studying,working,jobhunting,pr} ×3 语。
- **待办(生产,push 前必做)**:`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_current_status varchar;`(additive 幂等;seed 不碰 profile,无需改白名单)。push=Render 自动部署,先补列再 push(B4 stripe_sessions 顺序反了导致生产 500 的教训)。
- 未做(留 E11-05):onboarding 分叉 wizard、免费层引导触点、ProfileForm 其余字段大白话改造。
