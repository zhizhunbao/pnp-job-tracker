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
- **生产实弹 ✅(2026-07-19 晨,Frank 亲测)**:「可以登录了」——同意屏→回站登录态全链通。
- **途中坑(重要,已修 70f3c97)**:env 填了按钮不亮——**Render 的 Docker 构建只把 env 传给 Dockerfile 里
  声明了 ARG 的变量**;NEXT_PUBLIC_* 是 next build 编译期烤进 client 组件的,没 ARG=构建期拿不到=静默回退值
  (服务端路由却通,因为运行时 env 在——极具迷惑性)。修=builder 段登记 ARG+ENV 四件
  (GOOGLE_CLIENT_ID/PRICE_DISPLAY/SITE_URL/SUPPORT_EMAIL)。**以后新增 client 用的 NEXT_PUBLIC 变量必须同步登记 Dockerfile**。

## 6 · 遗留
- **微信登录(E11-06)= 办不了,搁置**(2026-07-19 Frank:「我在加拿大没法办」)——微信开放平台网页登录
  要中国企业主体(营业执照+¥300/年认证),个人/海外个人无入口;代注册挂靠有封号风险不碰。
  远期口子:若日后注册加拿大公司,可试开放平台**海外企业主体**认证,AppID 到手代码与 Google 同构半天接完。
  现实覆盖:邮箱+Google 已够——付费主力(在加人群)Google 无障碍;国内用户瓶颈在跨境访问站点本身,非登录方式。
- ~~oauth=fail 目前回登录框无 toast 文案~~ ✅ 已闭环(2026-07-19):AuthForm 挂载读 `?oauth=fail` → 现有 err 红框显示三语提示(acct.err.oauth),读完 replaceState 摘参数刷新不复现;本地 playwright 验过(图 e11-验收-oauth失败提示.png)。
