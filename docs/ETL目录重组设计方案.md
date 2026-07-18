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
  pnp/      scrape_ab_aaip_lists.py scrape_sk_sinp_lists.py scrape_ns_nsnp_lists.py scrape_prov_pnp_draws.py   # 已就位,迁时改名(原 build_ab/sk/ns/draws)
  ee/       scrape_ircc_ee_categories.py scrape_ircc_ee_draws.py       # ← 迁+改名(原 build_ee_*)
  wages/    build_esdc_wage_medians.py                                 # ← 迁+改名(原 build_wages)
  lmia/     build_esdc_lmia_employers.py                               # ← 迁+改名(原 build_lmia)
  noc/      build_statcan_noc_descriptions.py (noc.py 分类库留根:被 05/08 引用,是库不是抓取)
  fsa/      build_geonames_fsa_districts.py                            # ← 迁+改名(原 build_fsa_districts)
  dli/      scrape_ircc_dli_pgwp_list.py                               # ← 迁+改名(原 build_dli)
  meta/     verify_field_source_pages.py                               # ← 迁+改名(原 build_field_sources,本质=验证来源着陆页)
  company/  enrich_company_websites.py                                  # ← 迁+改名(原 enrich_companies)
  sources/  <源>/__init__.py                                           # 调度单元(只改 steps 里的路径)
```

- 与 `data/raw/<源>/` 一一对应(_paths 的布局注释同款心智):**raw 哪个源目录,etl 就哪个域目录**。
- 编号主管线(抓岗→清洗→评分→mart)**不迁**:01–11 的顺序编号本身就是分类,拆散反而丢执行顺序语义。

## 2.5 母/子脚本框架(2026-07-18 Frank 拍板:「每个 docker 一个脚本抓,共用一个母脚本,子脚本只填具体字段」)

**模板方法模式,新源的长法**(E12-06 news 为首个原生样板——**✅ 2026-07-18 已落地**:`etl/_scrape_base.py` + `etl/news/` 六子脚本,见 E12-06 §10;存量源不强迁、新写/大修时就范):

```python
# etl/_scrape_base.py(母脚本,单一来源)——管一切通用件:
#   httpx client(UA/timeout/retry/频控)· og:image/feed 解析助手 · 按 URL 累积去重
#   原子写盘 · 逐子源 try/except 隔离(一子源挂不影响他源)· 最少行数防线 · 汇总打印

# etl/news/scrape_sk_sinp_news.py(子脚本)——只填这个源特有的字段:
SOURCE = {
    "region": "SK",
    "list_url": "https://…/news",         # 列表页(或 feed URL)
    "kind": "html",                        # html | atom | rss
    "parse": parse_sk,                     # 列表 HTML → [{title, date, url}](选择器搞不定才写函数)
}
```

- **母脚本负责**:怎么抓、怎么去重、怎么写盘、怎么隔离故障、怎么报数——改一处全源受益。
- **子脚本负责**:抓哪、怎么从这个站的 HTML 里挑出行——每站结构不同,parse 无法纯声明,给「选择器优先、函数兜底」两档。
- **容器对应**:一源一 compose service(SOURCE=<源>)→ 调度单元 META → 入口脚本(母驱动子)——与 §3 一致。
- **命名规范(2026-07-18 Frank:见名知意)**:`<动词>_<机构/源>_<数据内容>.py`——动词定语义(`scrape_`=抓原始页/feed,`build_`=构建维护表/衍生数据);文件名单独出现(日志/报错栈/编辑器标签)也自述。
  例:`scrape_ircc_newsroom.py` / `scrape_sk_sinp_news.py` / `build_ircc_dli_pgwp_list.py` / `build_esdc_lmia_employers.py`。
  存量脚本(`build_dli.py`/`build_lmia.py`…)随 §4 迁移时**一并改名对齐**(git mv 双改:归目录+改名);sources/META 路径同步。

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
