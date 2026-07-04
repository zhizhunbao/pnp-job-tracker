# E3-03 · Stripe 时长包 Checkout（卡 + Alipay + WeChat Pay）

> Epic **E3 账号与订阅** · 负责人 Frank · 3 SP · Sprint 1 · 批次 B4
> 通用约定与索引见 [实现文档 README](../README.md)。决策 D8（2026-07-03 修订）：**v1 一次性时长包，不做订阅不做 Portal**——微信/支付宝走 Stripe 只支持一次性付款，且时长包更贴过渡型产品心智。

---

## 1. 整体目标

用户买 30 天 / 90 天 Pro（一次性买断，到期即止无自动续费）：Stripe Checkout（mode=payment），支付方式 卡 + Alipay（+ WeChat Pay 视 Dashboard 能否开通）。test 模式贯通（live 切换见 E3-06）。

## 2. 验收标准

- [x] 登录用户选 30/90 天 → Checkout（4242 测试卡）→ 回跳 `/account?ok=1`，`/account` 显示 Pro 到期日。
- [x] Checkout 页出现 Alipay 选项（test 模式可模拟支付）；WeChat Pay 开通情况在 Dashboard 确认并记录 §5。
- [x] 未登录调 checkout → 401/跳登录；重复购买 = 到期日顺延（在 E3-04 验证）。

## 3. 实现步骤

- [x] **3.1** Stripe Dashboard（test）：建 Product「Pro」+ 两个 **one-time Price**（30 天/90 天）→ `STRIPE_PRICE_30D` / `STRIPE_PRICE_90D`；Payment methods 开 card + alipay，申请 wechat_pay 并记录结果。
- [x] **3.2** `npm i stripe`；env：`STRIPE_SECRET_KEY` / `STRIPE_PRICE_30D` / `STRIPE_PRICE_90D` / `NEXT_PUBLIC_SITE_URL`。
- [x] **3.3** `api/billing/checkout/route.ts`：`getUser` 校验 → `checkout.sessions.create({ mode:'payment', line_items:[{price: 按参数选30/90, quantity:1}], payment_method_types:['card','alipay'(,'wechat_pay')], success_url, cancel_url, client_reference_id: user.id, customer_email: user.email, metadata:{days} })` → 303 重定向。
- [x] **3.4** /account 与 /pricing（E5-01）挂两档购买按钮 + 到期日展示。~~Portal~~ 不做（无可退订之物；退款口径写进条款 E4-02）。

## 4. 涉及目录 / 文件

| 路径 | 角色 | 状态 |
|---|---|---|
| `cms/src/app/api/billing/checkout/route.ts`（新） | 发起时长包 Checkout | ✅ 已建 |
| ~~`cms/src/app/api/billing/portal/route.ts`~~ | ~~自助管理~~ | 不做（D8：无订阅无 Portal） |
| `cms/src/lib/stripe.ts`（新） | 单例 client | ✅ 已建 |

## 5. 现有代码

- 无。注意 Stripe key 只进服务端 env；前端只拿 URL 跳转。

## 6. 完成定义（DoD）

- [x] §2 全勾（订阅状态落库依赖 E3-04，同批验收）+ push。（2026-07-04 真实回归通过，见 §8）

---

## 7. 实施记录（2026-07-04，代码侧完成）

- 代码全部就位并过 `npm run build`：`lib/stripe.ts`（key 未配置返回 null，站点无支付配置也正常跑）、`api/billing/checkout`（登录校验→mode=payment→返回 {url} 前端跳转）、/account 两档购买按钮 + `?ok=1` 回跳提示（三语）。
- 本地实测：未登录 401 ✅、未知 plan 400 ✅（真实 Checkout 跳转待 test key）。
- WeChat Pay 待 Dashboard 确认：确认开通后设 `STRIPE_WECHAT_PAY=1` 即启用（代码已带 client:web 参数）。
- **剩余 = 手动办理（§3.1）**：Dashboard 建 Product「Pro」+ 30/90 天两个 one-time Price、开 card+alipay、申请 wechat_pay；把 `STRIPE_SECRET_KEY / STRIPE_PRICE_30D / STRIPE_PRICE_90D` 填进 cms/.env（本地）与 Render env(生产)，再跑一次 4242 全流程勾 §2。

## 8. 真实回归记录（2026-07-04，test key 全链路）

- Product/Price 用 API 建（省 Dashboard 手点）：`prod_UpCiFof1mmH07M`；30 天 `price_1TpYJWGfQhhawEig3gBeks8Q`（CA$19）/ 90 天 `price_1TpYJWGfQhhawEig8oGsYnVd`（CA$39）——**占位价，正式定价 E5-01 定夺后建新 price 换 env 即可**。
- 4242 全流程 ✅：/account 发起 → Checkout（卡/WeChat Pay/Alipay 三选项均渲染）→ 支付 → 回跳 `/account?ok=1` → webhook 拨 +30 天。
- Alipay 模拟支付 ✅：选 Alipay → Stripe 测试授权页 AUTHORIZE → 回跳 → 同一 webhook 路径拨 +90 天（test 模式同步结算，completed 即 paid）。
- **WeChat Pay：test 模式 API 直接可用**（含 client:web 的 session 创建成功，Checkout 页显示 WeChat Pay 选项）；live 可用性等 E3-06 切 live 时确认。本地 `STRIPE_WECHAT_PAY=1` 已开。
- 环境：本地 cms/.env 已配 STRIPE_* 五项；生产 Render env 待填（key/两 price/webhook secret `we_1TpYVOGfQhhawEigoe68vKtD` 专属 whsec/`STRIPE_WECHAT_PAY=1` 可选）。
