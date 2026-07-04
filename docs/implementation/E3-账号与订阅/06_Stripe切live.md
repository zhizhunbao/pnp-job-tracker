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
