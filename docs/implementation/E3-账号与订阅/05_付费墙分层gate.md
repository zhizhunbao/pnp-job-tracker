# E3-05 · 付费墙分层 gate

> Epic **E3 账号与订阅** · 负责人 Frank · 4 SP · Sprint 1 · 批次 B5（与 E5-00 同批：**头牌就位再锁墙**）
> 通用约定与索引见 [实现文档 README](../README.md)。决策 D4（边界细节公测后可调，故一律 env/常量化）。
> **2026-07-03 提案采纳**：付费头牌 = **档案匹配（E5-00）**；AI 顾问降为个人化层组成部分（档案感知），仍在 Pro 内。宣传主打点相应调整（E5-01 定价页对照表同步）。

---

## 1. 整体目标

免费/付费分层生效，**gate 一律服务端执行**，前端只做展示引导。免费层保住引流（列表+筛选+PNP 粗标），付费层锁高价值功能（AI 顾问/事实弹框/vs 中位列）。

## 2. 验收标准

- [ ] 免费用户：列表+基础筛选+citation 可用；**档案匹配每日限前 N 岗（激活钩子）**；advisor 超试用次数 → 402 + 升级提示（三语）；vs 中位等 Pro 列隐藏并显示升级引导。
- [ ] Pro 用户：全功能解锁（**匹配列/「对我意味着什么」块无限** + advisor 档案感知 + 事实弹框 + Pro 列 + 跨城市对比 E5-04）；advisor 仍受个人日上限（防滥用）。
- [ ] **直接调 API 绕过前端同样被拦**（curl 验证 advisor/jobtext）。
- [ ] 分层参数（试用次数 M、Pro 列清单）全部 env/常量，改分层不改逻辑。

## 3. 实现步骤

- [ ] **3.1** advisor/jobtext route：`getUser` + `isPro`；免费用户走试用计数（内存 Map，键=userId，日 M 次，超 402）；Pro 走个人日上限；未登录沿用 E2-02 的 IP 限流。
- [ ] **3.2** `/jobs` page.tsx：服务端按 `isPro` 决定 SELECT 列与传给前端的列配置（Pro 列对免费用户不出 SQL，数据不到浏览器）。
- [ ] **3.3** 前端：Pro 列位置显示锁标+升级链接；弹框内 402 响应渲染成升级卡片（三语）。
- [ ] **3.4** 分层常量收口 `cms/src/lib/plan.ts`（FREE_ADVISOR_TRIES / FREE_MATCH_JOBS_PER_DAY / PRO_COLUMNS…）。
- [ ] **3.5** 匹配层 gate：page.tsx 按 isPro 决定 match 计算范围（免费=前 N 岗）；「对我意味着什么」块对免费超额岗渲染升级卡片。

## 4. 涉及目录 / 文件

| 路径 | 角色 | 状态 |
|---|---|---|
| `cms/src/app/api/advisor/route.ts` · `api/jobtext/route.ts` | 服务端 gate | 改 |
| `cms/src/app/(frontend)/jobs/page.tsx` | SELECT/列配置按 isPro | 改 |
| `jobs/JobsTable.tsx` | 锁列展示 + 升级引导 | 改 |
| `cms/src/lib/plan.ts`（新） | 分层常量 | 新建 |

## 5. 现有代码

- 列自选/列偏好机制已存在（COLS cookie/PREF_KEY）——Pro 列 gate 要在**服务端列配置源头**做，不能只在偏好层藏（否则改 cookie 绕过）。
- 坑 5（README）：改 SELECT 记得同步 JobRow 类型。

## 6. 完成定义（DoD）

- [ ] §2 全勾（含 curl 绕过测试）+ push。与 E3-03/04 合并验收 = **M2**。
