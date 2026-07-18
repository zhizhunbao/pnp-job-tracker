# ETL 目录重组设计方案(第 21 轮 #55)

> 2026-07-18 Frank:「每一类抓取都拆分成一个 docker 一个脚本,分目录分类管理」。
> 本文档=设计方案(design-before-refactor),**未实施**;拍板后一个 session 迁完+全链验证。

## 1. 现状问题

- `etl/` 根目录 26 个脚本混放:编号管线(01–11)、8 个 `build_*` 源构建器(ee/wages/lmia/fsa/noc/dli/field_sources)、基础设施(auto_update/upload_mart/backup_db/_paths)——**找一个源的脚本要扫全根目录**。
- 但**调度已经是「每源一单元」**:`etl/sources/<源>/__init__.py` 的 META(method/interval/steps)一源一档,互不牵连(一源炸不影响别源 step)——这层是对的,保留。
- `etl/pnp/` 已是「一域一目录」先例(build_ab/sk/ns/draws 住里面)。

## 2. 方案:按数据域归目录(调度层不动)

**原则:实现(脚本)按域归目录;调度(sources/META)与容器(角色制)保持现状。**

```
etl/
  _paths.py auto_update.py upload_mart.py backup_db.py audit_data.py   # 基础设施,留根
  01..06 08 09 10 11 *.py                                              # 编号主管线,留根(顺序语义)
  clean/                                                               # 清洗(已有,不动)
  pnp/      build_ab.py build_sk.py build_ns.py build_draws.py         # 已就位
  ee/       build_ee_categories.py build_ee_draws.py                   # ← 从根迁入
  wages/    build_wages.py                                             # ← 迁
  lmia/     build_lmia.py                                              # ← 迁
  noc/      build_noc_descriptions.py (noc.py 分类库留根:被 05/08 引用,是库不是抓取)
  fsa/      build_fsa_districts.py                                     # ← 迁
  dli/      build_dli.py                                               # ← 迁
  meta/     build_field_sources.py                                     # ← 迁(字段级来源注册表)
  company/  enrich_companies.py                                        # ← 迁(官网富化)
  sources/  <源>/__init__.py                                           # 调度单元(只改 steps 里的路径)
```

- 与 `data/raw/<源>/` 一一对应(_paths 的布局注释同款心智):**raw 哪个源目录,etl 就哪个域目录**。
- 编号主管线(抓岗→清洗→评分→mart)**不迁**:01–11 的顺序编号本身就是分类,拆散反而丢执行顺序语义。

## 3. 容器:维持角色制,不做每类一容器

| Frank 提议 | 判断 |
|---|---|
| 每类抓取一个 docker | **不建议**:现 5 容器(build/jobbank/httpx 低频组/enrich/backup)已按「镜像需求+频率」分角色;故障隔离靠 sources/META 的 per-source steps(一源失败不断别源)。拆成 15+ 容器 = compose 膨胀、内存 ×3、无人值守排障面变大,换不来新隔离性(违 Ponytail) |
| 例外 | 某源需要**独立重启节奏/独立镜像依赖**时单拆(先例:enrich 已拆独立角色 6h)——按需拆,不预拆 |

## 4. 迁移步骤(拍板后执行,估 1 短 session)

1. `git mv` 8 个脚本入域目录;每脚本头部 `sys.path.insert` 改成 `parent.parent`(照 `etl/pnp/build_draws.py` 现成写法)。
2. `etl/sources/*/META.steps` 路径同步(ee/pnp/enrich 三处)。
3. 全链本地验证:逐脚本 `python etl/<域>/build_*.py` 实跑 + `09_build_mart` 全表行数与迁移前逐表相等。
4. ETL 盒 git pull(容器 volume 挂载实时代码,**无需重建镜像**——脚本无新依赖)。
5. 风险:低(纯移动+改 import 路径;调度/容器/数据零变)。回滚=git revert。

## 5. 不做什么(YAGNI)

- 不迁编号主管线、不动 clean/、不拆容器、不改 sources/META 结构、不引任务框架(airflow 之类)。

## 6. 拍板点

- [ ] 域目录清单(§2)认可?(尤其 meta/company 两个命名)
- [ ] 容器维持角色制(§3)认可?
- [ ] 迁移窗口:非发帖敏感期任一 session 均可(全程不影响生产,ETL 盒 pull 前旧路径照跑)
