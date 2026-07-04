# E7-02 · Analytics 与转化埋点

> Epic **E7 运维与增长** · 负责人 Frank · 2 SP · Sprint 2 · 批次 B6
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

看得见访客与转化：轻量 analytics（无 cookie 弹窗负担）+ 两个转化事件（注册、Checkout 发起）。

## 2. 验收标准

- [ ] 页面浏览按路径可见（/jobs、/pricing、/rankings/*）。
- [ ] 「注册成功」「Checkout 发起」两事件入报表。
- [ ] 隐私政策（E4-02）如实描述所用工具与匿名口径。

## 3. 实现步骤

- [ ] **3.1** 选型（约定：自托管优先省订阅费）：compose 加 `umami`（postgres 复用现有实例，建独立 db）；备选 Plausible cloud（省事花小钱）。
- [ ] **3.2** layout 加 script（仅生产 env 注入）；caddy 加 analytics 子域或路径。
- [ ] **3.3** 事件：注册成功回调 + E5-01 Checkout 按钮点击处 `umami.track(...)`。
- [ ] **3.4** E4-02 隐私文案核对一致。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| `docker/docker-compose.prod.yml` · Caddyfile | umami 服务 |
| cms layout · account/pricing 组件 | script + 事件 |

## 5. 现有代码

- 无 analytics 先例；注意 script 别进本地开发（env gate）。

## 6. 完成定义（DoD）

- [ ] §2 全勾 + push。
