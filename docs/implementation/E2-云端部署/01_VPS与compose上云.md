# E2-01 · VPS 选型与 compose 整体上云（含域名 HTTPS）

> Epic **E2 云端部署** · 负责人 Frank · 7 SP · Sprint 0 · 批次 B1
> 通用约定与索引见 [实现文档 README](../README.md)。决策 D2：整体搬现有 compose，不重构。

---

## 1. 整体目标

现有 docker 全栈（postgres/cms/jobbank/pnp/ee/build）整体搬上一台常开 VPS，caddy 反代 + 自动 HTTPS，正式域名可访问，日更链路云上自转。Postgres 留 compose 内（不引 Neon），备份见 E7-01。

## 2. 验收标准

- [ ] `https://<域名>/jobs` 公网可访问，全站 HTTPS（HTTP 301）。
- [ ] postgres / cms 端口**不发布公网**（仅 caddy 出 80/443）。
- [ ] 云上完整日更链路自转一轮：抓 → 洗 → 评分 → mart → seed → 前端可见新数据。
- [ ] 重启 VPS 后全栈自起（`restart: unless-stopped` + docker 开机自启）。

## 3. 实现步骤

- [ ] **3.1 选型开通**：单台 VPS（2 vCPU / 4GB / 40GB，加东或美东；Hetzner/OVH/DO 择一）+ 域名注册，A 记录指 VPS。**同时去申请 Stripe 账户（B4 卡点，提前办）。**
- [ ] **3.2** VPS 装 docker + compose plugin；`git clone` 仓库；`cms/.env` 手工放置（不进 git）。
- [ ] **3.3** 新增 `docker/docker-compose.prod.yml`（override）：
  - postgres：删 `ports`；密码从 env 读（替掉硬编码 `pnp/pnp`，连带 cms 的 `DATABASE_URI`）。
  - cms：删 `ports`。
  - 新增 `caddy`：`caddy:2-alpine`，发布 80/443，挂 `Caddyfile`（`<域名> { reverse_proxy cms:3000 }`）+ `caddy_data` 卷。
- [ ] **3.4** 数据冷启动：scp 本地 `data/` 快照（快）或云上全量抓一轮（慢但干净）。
- [ ] **3.5** `docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile unattended up -d --build`；核对 §2。
- [ ] **3.6** 资源压测：观察一轮完整 ETL 的内存/磁盘峰值，不够升配。

## 4. 涉及目录 / 文件

| 路径 | 角色 | 状态 |
|---|---|---|
| `docker/docker-compose.prod.yml`（新） | 生产 override | 新建 |
| `docker/Caddyfile`（新） | 反代 + 自动证书 | 新建 |
| `docker/docker-compose.yml` | 不动（开发态保持原样） | 已有 |

## 5. 现有代码

- compose 已具备无人值守全栈能力（`unattended` profile），本项只是「换宿主 + 收端口 + 加反代」。
- 笔记本睡眠暂停调度的问题在常开 VPS 上自然消失（STATUS 运维注意③）。

## 6. 完成定义（DoD）

- [ ] §2 全勾 + 与 E2-02 同批完成后才对外公布 URL（安全不留窗口期）。
