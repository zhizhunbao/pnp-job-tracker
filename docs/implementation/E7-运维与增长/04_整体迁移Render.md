# E7-04 · 整体迁移 Render(Postgres + mart 直传,Supabase 退役)

> Epic **E7 运维与增长** · 负责人 Frank · 3 SP · 批次 B9 · 立项 2026-07-11(深夜,Supabase egress 配额事故当天)
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

Supabase 免费档 egress(5GB/月)被真实流量打爆(2026-07-11,Storage 全 402,连带维度表被清事故,见功能盈利点检查.md 第 17 轮)。两案对比后拍板:**不交 Supabase Pro($25/月),整体迁 Render**——

- **库**:Supabase Postgres → **Render Postgres basic-256mb**($6/月 + 存储 $0.30/GB/月,整库 dump 仅 ~7MB;付费档自带 PITR)。与 Web 服务同区**内网互联**:egress 概念消失,SSR 拉 2 万行不再跨网(顺带吃 /jobs 延迟红利)。
- **mart 中转**:Supabase Storage → **ETL 直推 cms 上传端点**(gzip 后 ~5MB,`POST /api/mart/<name>`,x-seed-token 门禁,落 /tmp;seed 优先读 /tmp,回退本地 data/mart)。/tmp 随部署即弃无妨——上传与 seed 在同一轮管线里前后脚,用完即弃。
- **Supabase 整体退役**(观察期后删项目);少一个厂商、零月费依赖。

红线:users/purchases 等真实用户数据**只走全量 pg_dump 恢复**,不经 mart;割接前后逐表行数比对。

## 2. 验收标准

- [ ] Render Postgres 建立(区域=Web 服务同区),全量恢复后 **public 全部表行数与 Supabase 逐表全等**(users/jobs/companies/rankings/stats/pnp_* …)。
- [ ] Render env `DATABASE_URI` 切内网串、`SUPABASE_URL/SERVICE_KEY` 移除;本地 cms/.env 切外网串(带 IP allowlist);**offer2pr.com 全功能生产终验**(列表/弹窗/登录/匹配/榜单/统计/结账入口)。
- [ ] 新 `POST /api/mart/<name>`(token 门禁,gzip 解压校验 JSON,落 /tmp/mart)+ seed 读取链:/tmp/mart → 本地 ../data/mart;**upload_mart.py 改推端点**,E2E:上传 16 表 → seed ok:true 计数正常。
- [ ] docker/.env:`SEED_URL` 不变、`BACKUP_DATABASE_URI` 切 Render 外网串;备份容器重建后**当日 dump 落盘**。
- [ ] 三演练:① 恢复演练(Render dump → 临时库行数全等);② seed 防线仍有效(/tmp 缺表 + 无本地回退 → 事务回滚不空灌);③ 整轮无人值守管线(scrape→build→upload→seed→alerts)全绿 + healthchecks 全 ping。
- [ ] Supabase 项目保留只读观察 ≥1 周(回退口),之后删除并记档。

## 3. 实现步骤

- [ ] **3.1(用户)** Render Dashboard → New → Postgres:basic-256mb,区域=Web 服务同区,名 pnp-postgres;外网访问加本机 IP allowlist。
- [ ] **3.2** 割接窗口:暂停 docker 管线(防半程 seed)→ `pg_dump` Supabase 全量 → 恢复 Render → 逐表行数比对。
- [ ] **3.3** cms:新 `/api/mart/[name]/route.ts`(POST,x-seed-token,gunzip→JSON.parse 校验→写 /tmp/mart/<name>.json);`seed/route.ts` mart() 读取链改 /tmp/mart → 本地目录(移除 Supabase fetch 分支;404/缺文件语义与 22c8d6a 防线保持:读到空目录=缺表返回 [],**HTTP 上传失败在 ETL 侧就地失败不触发 seed**)。
- [ ] **3.4** `etl/upload_mart.py`:gzip 压缩逐表 POST 新端点(域名走 SEED_URL 同源;任一失败退出码 1,本轮不 seed——沿用现有语义)。
- [ ] **3.5** env 三处切换:Render(DATABASE_URI 内网串、删 SUPABASE_*)→ 部署;本地 cms/.env(外网串);docker/.env(BACKUP_DATABASE_URI)→ backup 容器重建。
- [ ] **3.6** 生产终验 + 三演练(§2)+ 恢复 docker 管线,观察一轮夜更全绿。
- [ ] **3.7** 记忆/文档收口:prod-migration-workflow 记忆更新(直连正式库=Render 串)、STATUS 头部、功能盈利点检查轮次记录;Supabase 观察期到期后删项目。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| `cms/src/app/api/mart/[name]/route.ts` | 新:mart 上传端点(token+gzip) |
| `cms/src/app/seed/route.ts` | mart 读取链改 /tmp → 本地(删 Supabase 分支) |
| `etl/upload_mart.py` | 改推 cms 端点(gzip) |
| Render env / `cms/.env` / `docker/.env` | 连接串与开关切换 |
| `docs/implementation/E7-运维与增长/04_整体迁移Render.md` | 本文档 |

## 5. 演练与割接记录

(执行时逐条记:割接时刻、行数比对表、三演练结果、回退口关闭时间)

## 6. 风险与回退

- **回退口**:Supabase 项目原样保留 ≥1 周,任何异常把 DATABASE_URI 切回即回滚(Storage 402 只影响 mart 中转,不影响回退后的库读写)。
- 256MB RAM 对本库(dump ~7MB、单 Web 实例 + 定时 seed)富余;若未来连接/内存吃紧,Render 升档即可(无迁移)。
- /tmp 方案的边界:上传后、seed 前若恰逢部署重启则本轮 seed 缺文件 → ETL 侧判失败、次轮自愈;不引入持久盘(会牺牲零停机部署)。
