# E3-04 · Stripe webhook → 订阅状态同步

> Epic **E3 账号与订阅** · 负责人 Frank · 3 SP · Sprint 1 · 批次 B4
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

webhook 是 `proUntil` 的**唯一写入方**（2026-07-03 时长包修订：单事件模型）：验签 `checkout.session.completed` → 到期日往后拨 N 天。掉线可靠 Stripe 重试对账。

## 2. 验收标准

- [ ] 验签失败 → 400；**同一 session 事件重放幂等**（按 event.id 或 session.id 去重，到期日不重复叠加）。
- [ ] `checkout.session.completed`（且 `payment_status=paid`）→ `proUntil = max(now, 现值) + metadata.days`（未过期续买=顺延，过期再买=从今起算）。
- [ ] Stripe CLI `stripe trigger checkout.session.completed` 通过；Alipay 测试支付走通同一路径。

## 3. 实现步骤

- [ ] **3.1** `api/stripe/webhook/route.ts`：`await req.text()` 拿 **raw body**（不能先 json()）→ `stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET)`。
- [ ] **3.2** 单事件处理：`client_reference_id` 定位用户 → 幂等检查（processedSessions 记录在 user 或轻量表）→ `payload.update({ overrideAccess: true, data: { proUntil } })`。
- [ ] **3.3** 未知事件类型 → 200 直接 ack；处理异常 → 500 让 Stripe 重试。
- [ ] **3.4** 本地 `stripe listen --forward-to localhost:3000/api/stripe/webhook` 联调；test Dashboard 建正式 endpoint（只订阅 checkout.session.completed）。
- [ ] **3.5** 跑通 README「支付回归清单」（时长包版：注册→购买→到期日拨动→Pro 解锁→改系统时间/临时改 proUntil 验证到期降级→续买顺延）。

## 4. 涉及目录 / 文件

| 路径 | 角色 | 状态 |
|---|---|---|
| `cms/src/app/api/stripe/webhook/route.ts`（新） | 验签 + 状态同步 | 新建 |

## 5. 现有代码

- 状态字段的 access 已锁 admin（E3-01）——webhook 用 `overrideAccess: true` 绕过是唯一合法写路径，正是设计意图。

## 6. 完成定义（DoD）

- [ ] §2 全勾 + 支付回归清单留档 + push。完成 = **M2 支付链路贯通**（与 E3-05 同批）。
