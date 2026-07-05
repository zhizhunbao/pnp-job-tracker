# E7-02 · Analytics 与转化埋点

> Epic **E7 运维与增长** · 负责人 Frank · 2 SP · Sprint 2 · 批次 B6
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

看得见访客与转化：轻量 analytics（无 cookie 弹窗负担）+ 两个转化事件（注册、Checkout 发起）。

## 2. 验收标准

- [x] 页面浏览按路径可见（/jobs、/pricing、/rankings/*）。
- [x] 「注册成功」「Checkout 发起」两事件入报表。
- [x] 隐私政策（E4-02）如实描述所用工具与匿名口径。

## 3. 实现步骤

- [x] **3.1** 选型（约定：自托管优先省订阅费）：compose 加 `umami`（postgres 复用现有实例，建独立 db）；备选 Plausible cloud（省事花小钱）。
- [x] **3.2** layout 加 script（仅生产 env 注入）；caddy 加 analytics 子域或路径。
- [x] **3.3** 事件：注册成功回调 + E5-01 Checkout 按钮点击处 `umami.track(...)`。
- [x] **3.4** E4-02 隐私文案核对一致。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| `docker/docker-compose.prod.yml` · Caddyfile | umami 服务 |
| cms layout · account/pricing 组件 | script + 事件 |

## 5. 现有代码

- 无 analytics 先例；注意 script 别进本地开发（env gate）。

## 6. 完成定义（DoD）

- [x] §2 全勾 + push。

---

## 7. 实施记录(2026-07-04 深夜,B7;选型按 R3 修订)

- **选型偏离记档**:文档写 compose 自托管 umami——那是 VPS 方案;R3(Render+Supabase)下自托管=多一个常开服务($7/月起,免费档休眠会丢脚本)。改用 **umami cloud 免费档**(Hobby:10 万事件/月,够公测)——零运维零费用,与"自托管优先省订阅费"的初衷(省钱)一致。
- 代码侧 ✅:layout 注入 script(NEXT_PUBLIC_UMAMI_SRC/ID 双 env,不设=本地不注入);事件 signup(AuthForm 注册成功)+ checkout{plan}(account+pricing 两处发起);隐私政策三语补 analytics 条目(§3.4);顺手修掉 layout 里 Payload 模板残留 metadata。
- ~~**剩余=用户手动**:cloud.umami.is 注册(免费)→ Add website(pnp-cms.onrender.com)→ 拿 website id → Render env 加 NEXT_PUBLIC_UMAMI_SRC=https://cloud.umami.is/script.js 和 NEXT_PUBLIC_UMAMI_ID=<id>。填完即生效,报表在 umami cloud 控制台看。~~
- **✅ 全部办结(2026-07-05)**:账号 wangsansi9527@gmail.com(数据区 US);website `PNP Job Tracker` / pnp-cms.onrender.com,website id `a648865a-acc2-4f34-822c-a8f98412b58d`;两 env 已进 Render 并重部署;**端到端实测过**——生产 /jobs HTML 带 script 标签,访问一次后 umami 面板即时显示 1 Online + 1 view。
