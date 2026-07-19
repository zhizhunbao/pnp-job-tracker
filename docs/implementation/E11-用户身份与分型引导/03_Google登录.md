# E11-03 · Google 登录(#54 并入)

## 1 · 目标
「让登录更方便」(Frank 2026-07-19):Google 一键登录/注册,只上 Google 一枚(LinkedIn/FB 不做——受众不符+维护成本)。前置:#54 AuthForm careerbeacon 骨架改版已上线(8ab6398),Google 钮位 env 门控。

## 2 · 链路
```
AuthForm「使用 Google 继续」(NEXT_PUBLIC_GOOGLE_CLIENT_ID 有值才渲染)
→ GET /api/auth/google:302 到 accounts.google.com 同意屏(scope=openid email profile,
  state=uuid 进 httpOnly cookie 防 CSRF;redirect_uri 显式取 NEXT_PUBLIC_SITE_URL——老坑:别信 origin 回退)
→ GET /api/auth/google/callback:state 核对 → code 换 access_token(oauth2.googleapis.com/token,
  带 GOOGLE_CLIENT_SECRET)→ openidconnect userinfo → email_verified 必须 true
→ 按邮箱查找/创建用户 → 写会话条目 + 签 payload-token → 302 回首页(SSR 即登录态)
```

## 3 · 关键决策
- **会话签发=镜像 Payload 3.85 login op**:官方根导出 `getFieldsToSign`+`jwtSign`;useSessions 默认开,
  JWT 无 sid 会被 jwt 策略拒收 → local API `payload.update` 写 `sessions` 条目(过期条目顺手清)+ sid 进签名。
  不用「改密→payload.login」借道——**已存在的邮箱账号关联登录绝不动其密码**(红线)。
- 新用户:`loginProvider=google` + 随机密码(用户不持有;想设密码走忘记密码流)+ 带回 name/picture 进
  displayName/avatar(E11-01 字段现成);老用户只补空值不覆盖。
- 邮箱小写归一;任何失败 302 `/?login=1&oauth=fail`(回登录框,不落错误页)。

## 4 · env
| 变量 | 位置 | 值 |
|---|---|---|
| NEXT_PUBLIC_GOOGLE_CLIENT_ID | Render + 本地 .env(公开值) | 343715577783-u3vp…apps.googleusercontent.com |
| GOOGLE_CLIENT_SECRET | 仅 Render(Frank 亲手,不经助手) | GCP console 生成 |
GCP:项目 offer2pr / OAuth client `offer2pr-web`(Web);redirect URIs=生产+localhost:3000 两条;同意屏 External。

## 5 · 验证
- 本地烟测(2026-07-19,dev):①/api/auth/google 302→accounts.google.com,client_id/redirect_uri/scope/state 全对+state cookie 落 ✓;②callback 缺 env/参数 → 302 oauth=fail ✓;③登录框 Google 钮 env 门控点亮 ✓(图 54-验收-登录-google钮.png)。build 过。
- **生产实弹(Frank,待办)**:Render 加两 env(见 §4)→ 自动重部署 → 点「使用 Google 继续」走完同意屏 → 回站已登录、头像/昵称带回;再点一次=老用户直进。若撞 redirect_uri_mismatch,等 GCP 传播(5 分钟~数小时)重试。

## 6 · 遗留
- 微信登录(E11-06)待企业资质;Apple 不做。
- oauth=fail 目前回登录框无 toast 文案(P3,量起来再加三语提示)。
