# E3-04 · Stripe webhook → 订阅状态同步

> Epic **E3 账号与订阅** · 负责人 Frank · 3 SP · Sprint 1 · 批次 B4
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

webhook 是用户订阅状态的**唯一写入方**：验签后把 Stripe 事件同步到 `subscriptionStatus` / `subscriptionEndsAt`，掉线可对账。

## 2. 验收标准

- [ ] 验签失败 → 400；重放同一事件幂等（状态不抖）。
- [ ] `checkout.session.completed` → status=active + 回写 customerId；`customer.subscription.updated` → 同步 status 与 `current_period_end`；`customer.subscription.deleted` → canceled。
- [ ] Stripe CLI（`stripe trigger`）三事件全过；Dashboard 手动改订阅（如取消到期）→ 状态跟着变。

## 3. 实现步骤

- [ ] **3.1** `api/stripe/webhook/route.ts`：`await req.text()` 拿 **raw body**（不能先 json()）→ `stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET)`。
- [ ] **3.2** 三事件处理：定位用户（completed 用 `client_reference_id`；subscription.* 用 `customer` → 查 stripeCustomerId）→ `payload.update({ collection:'users', overrideAccess: true, data })`。
- [ ] **3.3** 未知事件类型 → 200 直接 ack（避免 Stripe 重试风暴）；处理异常 → 500 让 Stripe 重试。
- [ ] **3.4** 本地 `stripe listen --forward-to localhost:3000/api/stripe/webhook` 全流程联调；test Dashboard 建正式 endpoint。
- [ ] **3.5** 跑通 README「支付回归清单」全链。

## 4. 涉及目录 / 文件

| 路径 | 角色 | 状态 |
|---|---|---|
| `cms/src/app/api/stripe/webhook/route.ts`（新） | 验签 + 状态同步 | 新建 |

## 5. 现有代码

- 状态字段的 access 已锁 admin（E3-01）——webhook 用 `overrideAccess: true` 绕过是唯一合法写路径，正是设计意图。

## 6. 完成定义（DoD）

- [ ] §2 全勾 + 支付回归清单留档 + push。完成 = **M2 支付链路贯通**（与 E3-05 同批）。
