# E3-01 · Users collection 扩展 + entitlement 工具

> Epic **E3 账号与订阅** · 负责人 Frank · 2 SP · Sprint 1 · 批次 B3
> 通用约定与索引见 [实现文档 README](../README.md)。决策 D7：Payload 自带 auth，不引第三方。

---

## 1. 整体目标

[Users.ts](../../../cms/src/collections/Users.ts)（现为裸 `auth: true`）扩展为可公开注册、带角色与订阅状态的用户模型；提供服务端共用的鉴权/权益工具。

## 2. 验收标准

- [ ] 公开可注册（REST `POST /api/users`），新用户 `role=user`、`subscriptionStatus=none`。
- [ ] Payload admin 后台仅 `role=admin` 可进；普通用户读/改仅限自己，且改不了 role/订阅字段。
- [ ] `getUser(req)` / `isPro(user)` 可在服务器组件与 API route 共用。
- [ ] 现有管理员账号已补 `role=admin`（**否则自己被锁在后台外**）。

## 3. 实现步骤

- [ ] **3.1** Users.ts 加字段（**2026-07-03 时长包修订**：不需要订阅状态机，一个到期日就是全部真相）：
  - `role` select(user/admin) default user，`saveToJWT: true`，update 仅 admin；
  - `proUntil` date（Pro 到期日，update 仅 admin；webhook 走 overrideAccess 往后拨）；
  - `stripeCustomerId` text（可选留空——mode=payment 不强制建 customer，有邮箱收据即可）。
- [ ] **3.2** access：`create: () => true`；read/update = 本人或 admin（普通用户 update 白名单限 email/password）；delete 仅 admin；`admin: ({req}) => req.user?.role === 'admin'`。
- [ ] **3.3** ⚠️ 重启 dev（schema 推送）→ 给现有管理员补 role=admin（admin UI 或 SQL）→ 再验证 3.2。
- [ ] **3.4** 新建 `cms/src/lib/entitlement.ts`：`getUser(req)`（`payload.auth({ headers })` 解 `payload-token` cookie）；`isPro(user)` = `proUntil > now`（时长包语义，一行）。

## 4. 涉及目录 / 文件

| 路径 | 角色 | 状态 |
|---|---|---|
| `cms/src/collections/Users.ts` | 字段 + access | 改 |
| `cms/src/lib/entitlement.ts`（新） | 服务端权益判定 | 新建 |

## 5. 现有代码

- Payload `auth: true` 自带 register/login/logout/me REST 端点与 httpOnly cookie 会话——本项零自研鉴权逻辑。

## 6. 完成定义（DoD）

- [ ] §2 全勾（含管理员不被锁）+ push。
