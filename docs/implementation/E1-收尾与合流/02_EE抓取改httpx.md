# E1-02 · EE 类别抓取改 httpx

> Epic **E1 收尾与合流** · 负责人 Frank · 1 SP · Sprint 0 · 批次 B0
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

EE 类别抓取从「有头/无头 chromium crawl 镜像」改为 httpx（STATUS 已实测 canada.ca category-based-selection 页**无 Akamai 可直取**），使 `ee` 源用轻量 etl 镜像进 docker 自更，crawl 重镜像退回手动抓硬墙站专用。

## 2. 验收标准

- [x] httpx 版产出与旧浏览器版**完全一致**：9 类 94 职业，逐类数目相同（37/11/25/5/4/3/4/2/3）。
- [x] compose `ee` 服务已换 `<<: *etl` 锚点；容器实测整轮通过（categories ✓ 9类94职业 + draws ✓ 13类别 423轮）。
- [x] 失败安全：解析空 → 跳过写盘保留旧表（打 ⚠ 提示人工核查）。

## 3. 实现步骤

- [x] **3.1** 新建 `etl/build_ee_categories.py`（httpx+bs4；关键发现:DataTables 只是前端分页,原始 HTML 行全量,无需展开）。
- [x] **3.2** 对比一致（9 类 94 职业,逐类相同;sample 字段结构同构）。
- [x] **3.3** compose 换锚点 + 容器重建,首轮日志两步全 ✓。
- [x] **3.4** `etl/sources/ee/__init__.py`（源注册是包不是单文件）：method crawl→httpx,steps = build_ee_categories + build_ee_draws（draws 原先未进调度,顺带纳入）;回退路径写入 docstring。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| `etl/crawl/_fetch_ee_categories.py` | 被替代（保留作硬墙备用或删） |
| `etl/pnp/build_ee_categories.py`（新） | httpx 抓取 |
| `docker/docker-compose.yml` `ee` 服务 · `etl/sources.py` | 接线 |

## 5. 现有代码

- `build_ee_draws.py` 已是 httpx（IRCC 开放 JSON）——同源风格可直接抄。
- STATUS 坑注：canada.ca 该页实测 httpx 200；若上线后回 403，回退 crawl 镜像即可（compose 改回一行）。

## 6. 完成定义（DoD）

- [ ] §2 全勾 + docker 一轮自更成功 + push。
