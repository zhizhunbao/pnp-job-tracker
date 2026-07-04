# E3-03 · Stripe 订阅 Checkout + Customer Portal

> Epic **E3 账号与订阅** · 负责人 Frank · 4 SP · Sprint 1 · 批次 B4
> 通用约定与索引见 [实现文档 README](../README.md)。决策 D8：全托管页，自己不建账单 UI。

---

## 1. 整体目标

订阅/退订/换卡全走 Stripe 托管页：Checkout 发起订阅，Customer Portal 自助管理。test 模式贯通（live 切换见 E3-06）。

## 2. 验收标准

- [ ] 登录用户点「订阅」→ Stripe Checkout（4242 测试卡）→ 回跳 `/account?ok=1`。
- [ ] `/account` 的「管理订阅」→ Portal 可退订/换卡。
- [ ] 未登录调 checkout → 401/跳登录；同一用户复用同一 stripeCustomerId（不重复建客户）。

## 3. 实现步骤

- [ ] **3.1** Stripe Dashboard（test）：建 Product + 月付 Price → `STRIPE_PRICE_ID`；开启 Customer Portal。
- [ ] **3.2** `npm i stripe`；env：`STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `NEXT_PUBLIC_SITE_URL`。
- [ ] **3.3** `api/billing/checkout/route.ts`：`getUser` 校验 → 无 customerId 则 `customers.create({email})` 回写 user → `checkout.sessions.create({ mode:'subscription', line_items:[{price, quantity:1}], customer, success_url, cancel_url, client_reference_id: user.id })` → 303 重定向。
- [ ] **3.4** `api/billing/portal/route.ts`：`billingPortal.sessions.create({ customer, return_url })` → 303。
- [ ] **3.5** /account 与 /pricing（E5-01）挂按钮。

## 4. 涉及目录 / 文件

| 路径 | 角色 | 状态 |
|---|---|---|
| `cms/src/app/api/billing/checkout/route.ts`（新） | 发起订阅 | 新建 |
| `cms/src/app/api/billing/portal/route.ts`（新） | 自助管理 | 新建 |
| `cms/src/lib/stripe.ts`（新） | 单例 client | 新建 |

## 5. 现有代码

- 无。注意 Stripe key 只进服务端 env；前端只拿 URL 跳转。

## 6. 完成定义（DoD）

- [ ] §2 全勾（订阅状态落库依赖 E3-04，同批验收）+ push。
