# E2-01 · 上云：Render + Supabase（R3 架构）

> Epic **E2 云端部署** · 负责人 Frank · 7 SP（含 ~3 SP R3 改造） · Sprint 0 · 批次 B1
> 通用约定与索引见 [实现文档 README](../README.md)。决策 D2（2026-07-03 二次修订）：**Render(常驻 web + ETL worker) + Supabase(Postgres + Storage)**——用户选定免运维路线；底价 ~$17/月（web $7 + worker $7 + 10GB 盘 $2.5 + Supabase 免费档）。
> ⚠️ **免费档陷阱（定案依据）**：Render 免费 web 会休眠（50s 冷启动，杀 SEO/转化）、worker 与持久盘无免费档 → 必须最低付费档；Supabase 免费档真可用（500MB 库/1GB Storage，日更保活）。
> VPS 方案（0 改动 $6-12/月）保留为备选：`docker-compose.prod.yml`/`Caddyfile` 已提交不删，回退=按旧版本文档执行。

---

## 1. 整体目标

```
Render Worker(ETL 四源合并,挂10GB盘放 raw/processed) ──mart/*.json 上传──▶ Supabase Storage(私有bucket)
                                                     └─curl 触发─▶ Render Web(cms,无盘) ──seed 从 Storage 拉──▶ Supabase Postgres
域名 CNAME → Render(自动 TLS,不再需要 caddy)
```

共享磁盘需求被拆解：raw/processed 只有 ETL 自己读写（worker 本地盘）；**唯一交接点 = mart**，走 Supabase Storage。seed 改造后 cms 彻底解耦文件系统（搬哪都行，顺手的架构收益）。

## 2. 验收标准

- [ ] `https://<域名>/jobs` 常驻可访问（无冷启动），全站 HTTPS。
- [ ] 云上完整链路自转一轮：worker 抓→洗→评分→mart→**上传 Storage**→触发 seed→**cms 从 Storage 拉→灌 Supabase Postgres**→前端可见新数据。
- [ ] 本地 dev 行为不变（seed 无 SUPABASE env 时照旧读本地 `data/mart/`）。
- [ ] Supabase 侧：库表由 Payload 正常推 schema；Storage bucket 私有（service key 才能读写）。
- [ ] worker 重新部署后 ETL 状态不丢（postings.json 在持久盘）。

## 3. 实现步骤

- [ ] **3.1 开账号**：注册 Render + Supabase（都免费起步）；Supabase 建项目 → 记 `DATABASE_URI`（**连接池端口 6543**）+ `service_role` key，建私有 bucket `mart`；域名注册 + CNAME 指 Render。**同时提交 Stripe 开户申请（B4 卡点）。**
- [x] **3.2 mart 上传**：`etl/upload_mart.py` 已建（httpx PUT Storage REST，x-upsert；上传前校验 JSON 合法；任一失败退出 1 → 本轮不触发 seed，防 Storage 半新半旧；无 env 自动跳过）；已挂进 build 源 steps（09 之后）。`_paths` 补 `MART` 常量。jobs.json 现 28.3MB < Supabase 单对象 50MB 默认上限（水位注意）。
- [x] **3.3 seed 双模式**：`mart(name)` 改 async——SUPABASE_* 已设从 Storage 拉（cache no-store），否则读本地（缺表两模式同义返回 []）；三个调用点 await 化；本地增量 seed 回归通过（见 §5）。
- [x] **3.4 worker 合并**：`docker/render/Dockerfile.etl`（COPY 源码——Render 无 bind-mount）+ `etl-supervisor.sh`（**bash** shebang，`wait -n` 是 bash 特性 dash 不认——踩过）；四进程各用 META interval，任一退出整容器退出交 Render 重启。
- [ ] **3.5 库切 Supabase**（~0.5 SP）：cms `DATABASE_URI` → Supabase 池化连接（sslmode=require）；本地先连一次验证 Payload 推 schema + 重灌无异常，再上 Render。
- [ ] **3.6 Render 配置**：Web Service（cms Dockerfile，starter 常驻，custom domain，env：DATABASE_URI/PAYLOAD_SECRET/SEED_TOKEN/SUPABASE_*/LLM_*）+ Background Worker（Dockerfile.etl，env：SEED_URL=web 内网地址、SEED_TOKEN、SUPABASE_*）。
- [ ] **3.7 数据冷启动**：本地跑一次 `upload_mart.py` 推现有 mart → 触发云端 seed（分钟级出全量站点）；worker 首轮增量接管。
- [ ] **3.8 端到端核对 §2 + 一轮资源观察**（worker 内存峰值，starter 512MB 不够升 standard $25——postings.json 15k 帖解析可能贴边，实测定）。

## 4. 涉及目录 / 文件

| 路径 | 角色 | 状态 |
|---|---|---|
| `etl/upload_mart.py`（新）· `etl/sources/build` steps | mart → Storage | 新建/改 |
| `cms/src/app/seed/route.ts` | mart() 双模式（远程/本地） | 改 |
| `docker/render/Dockerfile.etl` + supervisor（新） | worker 合并镜像 | 新建 |
| Render/Supabase Dashboard 配置 | 托管侧 | 手工 |
| `docker/docker-compose.prod.yml` · `Caddyfile` | VPS 备选路径（保留不删） | 已有 |

## 5. 现有代码 / 备注

- **本地回归（2026-07-03）**：seed async 化后本地增量跑通——jobs 12019 / companies 8809（基线 +115，自动机正常增长），维度表与基线全等，closed=0。
- **$7 起步档（用户提出,已支持）**：Storage 交接层使 ETL 位置解耦——公测期可只上 Render web（$7），ETL 留家里 docker（upload_mart 推 Storage + SEED_URL 指云端），代价=笔记本合盖不更新；M4 前再上 worker（+$9.5）转真无人值守。

- E2-02 的 seed token、限流、auto_update 带 token **原样适用**（与部署形态无关）。
- E1-02 EE 改 httpx 后 worker 镜像无需 chromium，轻镜像即可。
- Supabase 免费档水位：库 500MB（现 12k 岗含 JD 正文，注意观察）、Storage 1GB（mart ~几十 MB，富余）；超限升 Pro $25/月——届时应已有收入。
- **可选加固**：worker 每轮把 postings.json 快照到 Storage、开机恢复 → 连持久盘都可省（-$2.5/月）+ 状态异地备份；v1 不做（YAGNI，盘更简单）。

## 6. 完成定义（DoD）

- [ ] §2 全勾 + 数据回归基线对照（jobs≈11904 量级）+ 上线安全清单相关项 + push。与 E2-02 收尾项共同构成 B1 完成。
