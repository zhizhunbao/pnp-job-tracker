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

- [x] Render Postgres 建立(区域=Web 服务同区),全量恢复后 **public 全部表行数与 Supabase 逐表全等**(users/jobs/companies/rankings/stats/pnp_* …)。✅ 2026-07-16(28 表全等,见 §5)
- [x] Render env `DATABASE_URI` 切内网串、`SUPABASE_URL/SERVICE_KEY` 移除;本地 cms/.env 切外网串(带 IP allowlist);**offer2pr.com 全功能生产终验**(列表/弹窗/登录/匹配/榜单/统计/结账入口)。✅ 五页 200 + /jobs 1.7s(切库前 3.6-6.8s)
- [x] 新 `POST /api/mart/<name>`(token 门禁,gzip 解压校验 JSON,落 /tmp/mart)+ seed 读取链:/tmp/mart → 本地 ../data/mart;**upload_mart.py 改推端点**,E2E:上传 16 表 → seed ok:true 计数正常。✅(jobs 走分片,见 §5 OOM 记档)
- [ ] docker/.env:`SEED_URL` 不变、`BACKUP_DATABASE_URI` 切 Render 外网串;备份容器重建后**当日 dump 落盘**。(env 已切 ✅;⚠️ 等用户 `docker compose build && up -d`——镜像需换 postgresql-client-18,PG 18 服务器 pg_dump 17 拒 dump,Dockerfile 已改)
- [ ] 三演练:①✅ 恢复演练(Render dump → 临时库 28 表行数全等);②✅ seed 防线(mart 双目录全无 → 500「mart no data source…rolling back」,维度表零损);③ 整轮无人值守管线(scrape→build→upload→seed→alerts)全绿 + healthchecks 全 ping(⏳ 今晚观察)。
- [ ] Supabase 项目保留只读观察 ≥1 周(回退口),之后删除并记档(→ 2026-07-23 后)。

## 3. 实现步骤

- [ ] **3.1(用户)** Render Dashboard → New → Postgres:basic-256mb,区域=Web 服务同区,名 pnp-postgres;外网访问加本机 IP allowlist。
- [x] **3.2** 割接窗口:~~暂停 docker 管线~~(权限闸不放行 docker stop;改用「两轮 seed 间隙 + pg_dump 一致性快照 + 割接后用户表增量核对」等价手法,实测零漂移)→ `pg_dump` Supabase 全量 → 恢复 Render → 逐表行数比对。✅ 2026-07-16(见 §5)
- [x] **3.3** cms:新 `/api/mart/[name]/route.ts`(POST,x-seed-token,gunzip→JSON.parse 校验→写 /tmp/mart/<name>.json);`seed/route.ts` mart() 读取链改 /tmp/mart → 本地目录(移除 Supabase fetch 分支;404/缺文件语义与 22c8d6a 防线保持:读到空目录=缺表返回 [],**HTTP 上传失败在 ETL 侧就地失败不触发 seed**)。✅ 2026-07-16(本地 E2E 过,见 §5)
- [x] **3.4** `etl/upload_mart.py`:gzip 压缩逐表 POST 新端点(域名走 SEED_URL 同源;任一失败退出码 1,本轮不 seed——沿用现有语义)。✅ 2026-07-16(同上)
- [x] **3.5** env 三处切换:Render(DATABASE_URI 内网串、删 SUPABASE_*)→ 部署;本地 cms/.env(外网串,Supabase 串注释保留=回退口);docker/.env(BACKUP_DATABASE_URI)。✅ 2026-07-16(backup 容器重建待用户 compose build,镜像换 pg client 18)
- [x] **3.6** 生产终验 + 三演练(§2:①② 过,③ 今晚夜更观察)。✅ 2026-07-16(管线没停过,夜更自动继续)
- [x] **3.7** 记忆/文档收口:prod-migration-workflow 记忆更新(直连正式库=Render 串)、STATUS 头部;Supabase 观察期到期后删项目(⏳ 2026-07-23 后,唯一遗留)。

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

- **2026-07-16 · 3.3/3.4 代码侧完成 + 本地 E2E**:新端点 `/api/mart/[name]`(gzip 魔数判定不依赖 header;`[a-z0-9_]{1,64}` 名校验防路径穿越;临时名写入再 rename 原子落盘);seed mart() 读取链 = `<tmpdir>/mart` → `../data/mart`,**两目录都不存在 → 抛错整事务回滚**(22c8d6a 防线延续;有目录而单表缺 = 同旧 404 返回 [])。本地 dev 实测:upload_mart.py 推 16 表全 ✓(jobs 64MB→gz 13MB),tmp 落盘与 data/mart 逐字节相等(jobs 27,771 行);无 token=401、`..%2F` 名=400、坏 JSON=400。compose 删 build 容器 SUPABASE_* 两行(SEED_URL/SEED_TOKEN 本就透传,upload_mart 复用)。
  - ⚠️ 记档:**本地机器 `%TEMP%\mart` 若残留会被 seed 优先读**(优先级高于 data/mart)——本地正常流程不产生它(SEED_URL 未设=upload 跳过),手工测过端点后记得删;本轮测试产物已删。
  - jobs 表 gz 后 13.7MB(立项估 ~5MB 偏小),本地过网无碍;Render 请求体上限 100MB,富余。
- **2026-07-16 · 生产两连 OOM → jobs 分片方案(`d3bbc39` + `87afd61`),日更当天恢复**:
  - **撞墙①**:端点 v1 生产 502——jobs 解压 64MB 做 `JSON.parse`+重 `stringify`,512MB Starter 撑爆。修:完整性交 gzip CRC+首尾数组括号轻校验,原字节直落盘(坏 JSON 终防线=seed 读取 parse 失败→整事务回滚)。
  - **撞墙②**:seed 亦 502(5-8s 稳定复现)——jobs mart 自上次成功 seed(07-05,12k 行)已涨到 27,771 行,整文件 parse+映射行数组 ~300MB 峰值,同样 OOM。**这与迁库无关,是数据涨出来的结构性问题**。
  - **修(87afd61)**:upload_mart 对 >6MB 表按行分片(jobs→11 片 ~5.5MB/片),片序 `name__part0..N-1`,**`name__meta`(声明片数)最后传=提交语义**——半程失败旧 meta 仍指旧完整片集,seed 不读半新半旧;seed `martPaths()` 选路(有 meta 走分片,meta 声明的片缺失=抛错回滚),jobs 逐片 parse→映射→入库→释放,峰值降到单片级;端点写入清对侧旧形态(单文件⇄分片切换不留残);**新防线:jobs mart 空(空 seenIds)时跳过 30 天下架对账**——空清单会把所有 30 天以上旧岗一锅端。
  - **恢复日更**:本地 dev 直连生产库跑通全链(分片上传 16 表→合并校验逐字节等→seed ok:true 27,771 岗/companies 19,413/closed 18,101s)——**offer2pr.com 职位板 07-11→07-16 当天恢复**,SSR 实证 50 条 07-16 岗。Render 侧后台复核:18:23 首次尝试即 `RENDER_SEED_OK`(28,012 岗,无 OOM)。
- **2026-07-16 · 割接执行记录(当天立项外全部完成)**:
  - **时间线**:18:2x 用户建库(basic-256mb + 1GB 存储 $6.30/月,Virginia 同区)→ 18:4x dump Supabase(`--schema=public -Fc`,16MB,backups/cutover-supabase-2026-07-16.dump)→ 恢复 Render(唯一 ignorable 错误=CREATE SCHEMA public 已存在)→ **28 表行数逐表全等**(jobs 30,482/companies 19,599/users 9)→ 18:4x 用户 Render env 切内网串+删 SUPABASE_*(首次保存报错,重试即过)→ 18:53 新实例连上新库(pg_stat_activity 实证)→ 用户表增量核对**零漂移** → 五页终验 200 → 新库 seed E2E **25s** ok:true。
  - **性能红利实测**:/jobs SSR 3.6-6.8s → **1.7s**;seed 42-63s(Supabase)→ **25s**。
  - **演练**:① Render dump(需 pg_dump 18,一次性 postgres:18-alpine 容器)→ 本地临时库 drill_e704 恢复 → 28 表行数与 Render 现库全等 ✅;② 本地 dev 指向临时库、mart 双目录藏空 → seed 500「mart no data source…rolling back」、维度表零损 ✅;③ 夜更全绿观察 ⏳ 今晚。
  - **连带发现:pg_dump 17 拒 dump PG 18 服务器** → 夜备份链会在新库上全挂;`docker/etl/httpx/Dockerfile` 已改走 PGDG 源装 postgresql-client-18,**待用户 `docker compose build && docker compose up -d` 生效**(backup 容器同时吃到新 BACKUP_DATABASE_URI)。
  - **割接窗口手法修正**:权限闸不放行 docker stop 管线容器 → 等价改「两轮 seed 间隙操作 + pg_dump 一致性快照 + 割接后 users/users_sessions/saved_searches 计数与 max(updated_at) 核对」,实测零漂移;管线全程没停,夜更无缝。
  - **回退口**:Supabase 项目原样保留(cms/.env 注释行即回退串),观察 ≥1 周(→07-23)后删项目。

## 6. 风险与回退

- **回退口**:Supabase 项目原样保留 ≥1 周,任何异常把 DATABASE_URI 切回即回滚(Storage 402 只影响 mart 中转,不影响回退后的库读写)。
- 256MB RAM 对本库(dump ~7MB、单 Web 实例 + 定时 seed)富余;若未来连接/内存吃紧,Render 升档即可(无迁移)。
- /tmp 方案的边界:上传后、seed 前若恰逢部署重启则本轮 seed 缺文件 → ETL 侧判失败、次轮自愈;不引入持久盘(会牺牲零停机部署)。
