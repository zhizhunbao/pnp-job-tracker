# E3-03 · Stripe 时长包 Checkout（卡 + Alipay + WeChat Pay）

> Epic **E3 账号与订阅** · 负责人 Frank · 3 SP · Sprint 1 · 批次 B4
> 通用约定与索引见 [实现文档 README](../README.md)。决策 D8（2026-07-03 修订）：**v1 一次性时长包，不做订阅不做 Portal**——微信/支付宝走 Stripe 只支持一次性付款，且时长包更贴过渡型产品心智。

---

## 1. 整体目标

用户买 30 天 / 90 天 Pro（一次性买断，到期即止无自动续费）：Stripe Checkout（mode=payment），支付方式 卡 + Alipay（+ WeChat Pay 视 Dashboard 能否开通）。test 模式贯通（live 切换见 E3-06）。

## 2. 验收标准

- [ ] 登录用户选 30/90 天 → Checkout（4242 测试卡）→ 回跳 `/account?ok=1`，`/account` 显示 Pro 到期日。
- [ ] Checkout 页出现 Alipay 选项（test 模式可模拟支付）；WeChat Pay 开通情况在 Dashboard 确认并记录 §5。
- [ ] 未登录调 checkout → 401/跳登录；重复购买 = 到期日顺延（在 E3-04 验证）。

## 3. 实现步骤

- [ ] **3.1** Stripe Dashboard（test）：建 Product「Pro」+ 两个 **one-time Price**（30 天/90 天）→ `STRIPE_PRICE_30D` / `STRIPE_PRICE_90D`；Payment methods 开 card + alipay，申请 wechat_pay 并记录结果。
- [ ] **3.2** `npm i stripe`；env：`STRIPE_SECRET_KEY` / `STRIPE_PRICE_30D` / `STRIPE_PRICE_90D` / `NEXT_PUBLIC_SITE_URL`。
- [ ] **3.3** `api/billing/checkout/route.ts`：`getUser` 校验 → `checkout.sessions.create({ mode:'payment', line_items:[{price: 按参数选30/90, quantity:1}], payment_method_types:['card','alipay'(,'wechat_pay')], success_url, cancel_url, client_reference_id: user.id, customer_email: user.email, metadata:{days} })` → 303 重定向。
- [ ] **3.4** /account 与 /pricing（E5-01）挂两档购买按钮 + 到期日展示。~~Portal~~ 不做（无可退订之物；退款口径写进条款 E4-02）。

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
