# E1-02 · EE 类别抓取改 httpx

> Epic **E1 收尾与合流** · 负责人 Frank · 1 SP · Sprint 0 · 批次 B0
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

EE 类别抓取从「有头/无头 chromium crawl 镜像」改为 httpx（STATUS 已实测 canada.ca category-based-selection 页**无 Akamai 可直取**），使 `ee` 源用轻量 etl 镜像进 docker 自更，crawl 重镜像退回手动抓硬墙站专用。

## 2. 验收标准

- [ ] httpx 版抓取脚本产出与现 `raw/ee/federal-categories.json` 结构一致（9 类 94 职业量级）。
- [ ] compose `ee` 服务改用 `<<: *etl` 锚点（不再 build crawl Dockerfile），容器跑通一轮。
- [ ] 失败时不覆盖旧数据（先写 temp 再 replace）。

## 3. 实现步骤

- [ ] **3.1** 新脚本（仿各省 `etl/pnp/build_<prov>.py` 的 httpx+bs4 模式）替代 `_fetch_ee_categories` 的浏览器路径；沿用输出路径与 `_paths`。
- [ ] **3.2** 本地跑通对比新旧 JSON（类别数/职业数一致）。
- [ ] **3.3** compose：`ee` 服务换锚点，删 `BROWSER_HEADLESS`/`PYTHONUNBUFFERED` 等 crawl 专属 env；`docker compose up -d ee` 验证日志。
- [ ] **3.4** `etl/sources.py` 的 ee 源 steps 指向新脚本。

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
