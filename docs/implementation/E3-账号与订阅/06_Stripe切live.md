# E3-06 · Stripe 切 live 真实收款（M3）

> Epic **E3 账号与订阅** · 负责人 Frank · 1 SP · Sprint 2 · 批次 B5（前置：E4-02/03 合规齐备）
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

合规四件套上线后，Stripe test → live，完成一笔真实订阅 + 真实退订，正式收费开闸。

## 2. 验收标准

- [x] live key 生效、live webhook endpoint 验签通过。(投递 1/失败 0,984ms)
- [x] 一笔**真实付款**入账 → Pro 解锁(CA$19,admin 号,proUntil=+30d 精确);~~Portal 退订~~(D8 无订阅)→ **真实退款演练**:Dashboard 全额 Refund ✅ + admin 手动清 proUntil → 账户页回免费版 ✅。
- [x] 定价页显示价与 Stripe live Price 一致($19/$39 CAD,D5 已定)。

## 3. 实现步骤

- [x] **3.1** 前置核对:E4-02 合规页在线、E4-03 自查完毕、退款口径写进条款。
- [x] **3.2** live Product `prod_UpEXEb8j3hFyBG`($19=price_1Tpa4dGre9TF1l9zHOsx7tR4 / $39=price_1Tpa5sGre9TF1l9zFjycLhSf)+ live webhook `we_1TpaA9Gre9TF1l9zVVoSM7Uz`(两事件);Render env 已换(密钥用户自持,未经助手)。
- [x] **3.3** 真实卡全流程 ✅ + 真实退款验证 ✅(2026-07-04 晚)。
- [ ] **3.4** Stripe 邮箱收据/品牌设置(名称/图标/支持邮箱)——**追办**,不阻塞 M3。

## 4. 涉及目录 / 文件

仅 env 与 Stripe Dashboard 配置，无代码改动（有则说明 E3-03/04 写死了 test 假设，回去修）。

## 5. 现有代码

- 依赖 E3-03/04/05 全部收口。

## 6. 完成定义（DoD）

- [x] §2 全勾 → **M3 正式收费开闸(2026-07-04)** 🎉(3.4 品牌设置追办)

---

## 7. 切换准备记录(2026-07-04,代码侧就绪)

- 前置已齐:E4-02 四件套在线、E4-03 自查落档、退款口径(7 天未滥用可退)已进条款;定价 $19/$39 CAD 已定,NEXT_PUBLIC_PRICE_DISPLAY 一致。
- **代码加韧性兜底**:live 下 alipay/wechat 若未获批,Checkout 创建失败自动退回纯卡并打日志(否则一个未开通的支付方式会炸掉全部收款)。除此无 test 假设写死,切 live = 只换 env。
- **剩余 = 用户手动**:① Dashboard(live)确认激活通过;② live Product「Pro」+ $19/$39 one-time Price;③ live webhook endpoint(两事件:completed + async_payment_succeeded)拿 whsec;④ Render env 换 STRIPE_SECRET_KEY(live)/STRIPE_PRICE_30D/90D(live)/STRIPE_WEBHOOK_SECRET(live whsec),**STRIPE_WECHAT_PAY 建议先删**(live 可用性未确认,有兜底但别故意触发);⑤ 真实卡付一笔 $19 → Pro 解锁;⑥ Dashboard 真实退款一笔 → **人工在 admin 把该用户 proUntil 清掉**(退款运维口径:无 charge.refunded 自动处理,v1 人工,量大再自动化);⑦ Stripe 品牌/收据设置。完成勾 §2 = M3。

---

## 8. M3 实录(2026-07-04 晚)

- 切换零代码改动成立:E3-03/04 无 test 假设,只换 env(外加一处预防性兜底:live 下 alipay/wechat 未获批时 Checkout 自动退纯卡)。
- 真实链路:admin 号 /account 购 30 天(CA$19,Visa)→ live webhook 一次投递成功(984ms)→ proUntil=2026-08-03(+30d 精确)→ 账户页 ⭐Pro。
- 退款运维口径 v1(人工)演练闭环:Dashboard 全额 Refund(Requested by customer)→ admin 后台清 Pro Until → 账户页回免费版。**注意:退款不会自动降级,必须人工清**(收到退款申请时两步都要做);量大再上 charge.refunded 自动化。
- live 与 sandbox 是两个账户(live=acct_1TRO7u../sandbox=acct_1TRO87..),Product/Price/webhook 互不相通,都要各建一套。
