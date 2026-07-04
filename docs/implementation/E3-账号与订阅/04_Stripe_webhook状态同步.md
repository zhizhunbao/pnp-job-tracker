# E3-04 · Stripe webhook → 订阅状态同步

> Epic **E3 账号与订阅** · 负责人 Frank · 3 SP · Sprint 1 · 批次 B4
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

webhook 是 `proUntil` 的**唯一写入方**（2026-07-03 时长包修订：单事件模型）：验签 `checkout.session.completed` → 到期日往后拨 N 天。掉线可靠 Stripe 重试对账。

## 2. 验收标准

- [x] 验签失败 → 400；**同一 session 事件重放幂等**（按 event.id 或 session.id 去重，到期日不重复叠加）。
- [x] `checkout.session.completed`（且 `payment_status=paid`）→ `proUntil = max(now, 现值) + metadata.days`（未过期续买=顺延，过期再买=从今起算）。
- [x] Stripe CLI（`stripe listen` 转发真实事件）通过；Alipay 测试支付走通同一路径（+90 天顺延实测）。

## 3. 实现步骤

- [x] **3.1** `api/stripe/webhook/route.ts`：`await req.text()` 拿 **raw body**（不能先 json()）→ `stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET)`。
- [x] **3.2** 单事件处理：`client_reference_id` 定位用户 → 幂等检查（processedSessions 记录在 user 或轻量表）→ `payload.update({ overrideAccess: true, data: { proUntil } })`。
- [x] **3.3** 未知事件类型 → 200 直接 ack；处理异常 → 500 让 Stripe 重试。
- [x] **3.4** 本地 `stripe listen --forward-to localhost:3000/api/stripe/webhook` 联调；test Dashboard 建正式 endpoint（只订阅 checkout.session.completed）。
- [x] **3.5** 跑通 README「支付回归清单」（时长包版：注册→购买→到期日拨动→Pro 解锁→改系统时间/临时改 proUntil 验证到期降级→续买顺延）。

## 4. 涉及目录 / 文件

| 路径 | 角色 | 状态 |
|---|---|---|
| `cms/src/app/api/stripe/webhook/route.ts`（新） | 验签 + 状态同步 | ✅ 已建 |

## 5. 现有代码

- 状态字段的 access 已锁 admin（E3-01）——webhook 用 `overrideAccess: true` 绕过是唯一合法写路径，正是设计意图。

## 6. 完成定义（DoD）

- [x] §2 全勾 + 支付回归清单留档（见 §8）+ push。**M2 支付链路本地贯通**（生产复验待 Render env 填入）。

---

## 7. 实施记录（2026-07-04，代码侧完成 + 本地全路径实测）

- 幂等实现：Users 加隐藏 `stripeSessions`（json，admin 字段锁）记录已拨过的 session.id；webhook 是 proUntil 唯一写入方（overrideAccess）。
- 超出文档的一处：**同时订阅 `checkout.session.async_payment_succeeded`**（同一处理器）——alipay/wechat 属异步支付方式，completed 时可能还 unpaid；不处理会丢单（付了钱不到账 = 数据完整性，不上砧板）。completed 时 `payment_status!=paid` 只 ack 不拨。⚠️ Dashboard 建 endpoint 时**两个事件都要勾**。
- 本地实测（自签 HMAC 伪造事件走真实验签路径，13/13 过）：假签名 400 ✅；首购 30 天 proUntil=now+30d ✅;同 session 重放不叠加 ✅;未到期续买 90 天顺延到 +120d ✅;unpaid 不拨、async 到账再拨 ✅;未订阅事件 200 ack ✅;用户不存在 200 ✅。
- **剩余 = 手动办理**：Stripe test key 填 env 后 `stripe listen --forward-to localhost:3000/api/stripe/webhook` + `stripe trigger checkout.session.completed` 复核（§3.4），test Dashboard 建正式 endpoint（订阅上述两事件），跑一遍 4242 + Alipay 模拟支付勾 §2/§3.5。

## 8. 真实回归记录（2026-07-04）

- `stripe listen --forward-to localhost:3000/api/stripe/webhook` 转发真实事件：4242 卡支付 → `checkout.session.completed` 200，proUntil 2026-12-01→**2026-12-31（+30 天整，时分秒保留 = max(现值)+days 成立）**；Alipay 模拟支付 → 同路径 **+90 天到 2027-03-31**。无关事件（payment_intent.created/charge.updated 等）全部 200 ack。
- 幂等/异步分支此前已用自签 HMAC 伪造事件 13 项验证（重放不叠加、unpaid 不拨 async 补拨、幽灵用户 ack）。
- **生产 webhook endpoint 已建**（test 模式，用户授权）：`we_1TpYVOGfQhhawEigoe68vKtD` → `https://pnp-cms.onrender.com/api/stripe/webhook`，订阅 completed + async_payment_succeeded 两事件，专属 whsec 待填 Render env。
