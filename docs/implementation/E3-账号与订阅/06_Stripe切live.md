# E3-06 · Stripe 切 live 真实收款（M3）

> Epic **E3 账号与订阅** · 负责人 Frank · 1 SP · Sprint 2 · 批次 B5（前置：E4-02/03 合规齐备）
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

合规四件套上线后，Stripe test → live，完成一笔真实订阅 + 真实退订，正式收费开闸。

## 2. 验收标准

- [ ] live key 生效、live webhook endpoint 验签通过。
- [ ] 一笔**真实付款**入账 → Pro 解锁；Portal 真实退订 → 到期降级。
- [ ] 定价页显示价与 Stripe live Price 一致（D5 数值此时已定）。

## 3. 实现步骤

- [ ] **3.1** 前置核对：E4-02 合规页在线、E4-03 自查完毕、退款口径写进条款。
- [ ] **3.2** Stripe live 激活（账户 B1 已申请）：建 live Product/Price、live webhook → 换 `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID`。
- [ ] **3.3** 真实卡全流程回归（README 支付清单）+ 真实退订验证。
- [ ] **3.4** Stripe 邮箱收据/品牌设置（名称/图标/支持邮箱）。

## 4. 涉及目录 / 文件

仅 env 与 Stripe Dashboard 配置，无代码改动（有则说明 E3-03/04 写死了 test 假设，回去修）。

## 5. 现有代码

- 依赖 E3-03/04/05 全部收口。

## 6. 完成定义（DoD）

- [ ] §2 全勾 → 标记 **M3 正式收费开闸**。

---

## 7. 切换准备记录(2026-07-04,代码侧就绪)

- 前置已齐:E4-02 四件套在线、E4-03 自查落档、退款口径(7 天未滥用可退)已进条款;定价 $19/$39 CAD 已定,NEXT_PUBLIC_PRICE_DISPLAY 一致。
- **代码加韧性兜底**:live 下 alipay/wechat 若未获批,Checkout 创建失败自动退回纯卡并打日志(否则一个未开通的支付方式会炸掉全部收款)。除此无 test 假设写死,切 live = 只换 env。
- **剩余 = 用户手动**:① Dashboard(live)确认激活通过;② live Product「Pro」+ $19/$39 one-time Price;③ live webhook endpoint(两事件:completed + async_payment_succeeded)拿 whsec;④ Render env 换 STRIPE_SECRET_KEY(live)/STRIPE_PRICE_30D/90D(live)/STRIPE_WEBHOOK_SECRET(live whsec),**STRIPE_WECHAT_PAY 建议先删**(live 可用性未确认,有兜底但别故意触发);⑤ 真实卡付一笔 $19 → Pro 解锁;⑥ Dashboard 真实退款一笔 → **人工在 admin 把该用户 proUntil 清掉**(退款运维口径:无 charge.refunded 自动处理,v1 人工,量大再自动化);⑦ Stripe 品牌/收据设置。完成勾 §2 = M3。
