# 统一源框架 — 目标架构(v2,决策已定,待实施)

> 目的:把「抓数据」收敛成**一套套路**,任何源按同一契约接入(注册 → docker 定时 → raw → 清洗 → mart → seed)。
> **铁律:抓取只存原始(raw),清洗在 processed,两步绝不混。** 按「先文档后动手」推进,落地见第 9 节。
> 关联:[CLAUDE.md](../CLAUDE.md) · [STATUS.md](../STATUS.md)。

## 0. 铁律:抓取 ≠ 清洗(最重要)
- **raw/** = 原样存下抓到的东西(HTML / Markdown / CSV 原文件),**不解析、不清洗、不去重**,按**日期快照不可变**。
- **processed/** = 清洗后的结构化数据(解析成字段、合并、去重、累积)。
- `etl/clean/` 脚本读 raw → 写 processed;`09_build_mart` 读 processed → mart;seed 读 mart。
- ⚠️ 现状 `05` 是「边抓边解析」写进 `postings.json`(raw 里却是清洗过的)——**违背铁律,属待拆技术债**(见第 9 节 JB)。

## 1. 三种抓取方式 = 三个目录(`etl/scrape/<method>/`)
| 方式 | 抓什么 | 工具 | raw 产出 | 例子 |
|---|---|---|---|---|
| **httpx** | 有固定 DOM 的列表/详情页 | httpx + BS4 | 原始 `.html` | Job Bank、ATS careers |
| **crawl** | 自由文本/政府站(可能有风控) | BFS + httpx→浏览器兜底 | `.html` **和** `.md`(D1) | PNP 省级页、政策原文 |
| **dataset** | 开放数据文件 | httpx 下载 | 原文件 `.csv/.zip` | ESDC 工资、GeoNames、AIP |

> 三种方式天生不同(抓页面 vs 下文件),不强行统一成一种;统一的是**契约 + 目录 + raw/processed 分层**。

## 2. raw/ 目录约定:`方式 / 源 / 日期`
```
data/raw/
  httpx/
    jobbank/<YYYY-MM-DD>/listing-*.html      # 当天抓的原始列表/详情页
    ats/<YYYY-MM-DD>/...
  crawl/                                       # D2:crawl 输出迁到 raw 下
    oinp/<YYYY-MM-DD>/
      manifest.json                            #   发现的 URL 清单
      pages/<slug>.html                        #   D1:原始 HTML
      pages/<slug>.md                          #   D1:转出的 Markdown(都存)
    sinp/<YYYY-MM-DD>/ ...
  dataset/
    wages/<YYYY-MM-DD>/wage2025.csv
    fsa/<YYYY-MM-DD>/CA.txt
    aip/<YYYY-MM-DD>/aip-*.json
  reference/                                    # 「我们维护的表」仍跟踪(build 产出)
    wages.json · fsa-districts.json · designated-employers/
```
- **日期目录**:每次抓取一份**快照**,raw 不可变、可回溯;**累积/去重/合并放 processed**(不再像现在往单个 postings.json 原地覆盖)。
- 所以你说的「raw 下没看到新数据」——现在 `05` 是原地覆盖 `raw/jobbank/postings.json`(没新文件、且里面是清洗过的)。新结构下每轮会落 `raw/httpx/jobbank/<日期>/` 一份原始快照。

## 3. 源注册表 `etl/sources.py`(D4:「独立 sources」是什么)
**就是一个单独的清单文件**,把「有哪些源、各自怎么配」集中声明,和「跑循环的 auto_update」分开。形如:
```python
SOURCES = [
  Source(name="jobbank", method="httpx",   clean="clean/jobbank.py", interval="2h"),
  Source(name="oinp",    method="crawl",    seeds=[...], clean="clean/pnp.py", interval="weekly"),
  Source(name="wages",   method="dataset",  url="...", build="build_wages.py", interval="monthly"),
  ...
]
```
**为什么独立成文件**(而不是塞进 `auto_update.SOURCES`):
- 一处看全所有源 + 频率 + 清洗器,加源只改这一处;
- `auto_update.py`(调度)、docker compose(生成 service)、清洗/build 都**读同一份**,不重复定义;
- 「源有哪些」和「怎么调度跑」解耦 —— 改调度不动源清单,反之亦然。

## 4. `auto_update.py` = 调度器,不是抓取器(你的疑问)
它**不自己抓数据**,是个循环:读 `sources.py` → 按每个源的 `method` 调对应抓取器(`scrape/httpx|crawl|dataset` 里的脚本)→ 按 `interval` 定时 → 再触发清洗/build/seed。真正抓数据的逻辑在 `scrape/<method>/` 下的脚本里。可理解为「编排/定时层」。

## 5. 反爬(D3)
crawl 方式:httpx 优先,命中 403/挑战 → headless 浏览器兜底。**过不了的验证码 → 记日志、跳过该页**,后期再人工处理(现 `browser_fetch` 的有头+人工那套留作手动重抓,不进容器)。

## 6. docker 映射
- 镜像按**方式**分:`docker/httpx/`(轻)、`docker/crawl/`(headless 浏览器,重)、dataset 复用 httpx 镜像。
- compose:**一个源一个 service**,`env=SOURCE`,`interval` 按真实频率。
- `build` service(清洗+评分+mart+seed)单例,**已实现**。
- dataset/PNP 省级源:**低频**(月级/周级),别套 2h。

## 7. 初始源清单(进 sources.py)
| 源 | 方式 | 频率 | 说明 |
|---|---|---|---|
| jobbank | httpx | 2h | 全国全职业(现有,待拆 raw/clean)|
| ats | httpx | 日/周 | Kanata 公司第一方 |
| **oinp / sinp / aaip / bcpnp / …** | crawl | 周/月 | **各省 PNP 单独抓、单独更新**;填 `pnp_streams`/`policy_docs` 空表 |
| wages | dataset | 年 | ESDC 工资 |
| fsa | dataset | 极少 | GeoNames |
| aip | dataset | 偶尔 | AIP 指定雇主 |

## 8. 待实施(分步,JB 最后,每步可回滚)
1. 建 `etl/sources.py` 契约 + `raw/<method>/<source>/<date>/` 约定(不改现有抓取)。
2. `etl/scrape/{httpx,crawl,dataset}/` 三目录;crawl 输出迁 `raw/crawl/`,出 `.html`+`.md`;建 `docker/crawl/Dockerfile`(headless)。
3. **新源验证**:拿一个省 PNP 页(如 oinp)走全框架跑通 → 证明契约。不碰 JB。
4. dataset 源(wages/fsa/aip)做成低频 service。
5. **最后拆 JB**:`05` 拆成「抓→raw/httpx/jobbank/<date>/*.html」+「clean/jobbank.py 解析→processed」。fetch 仍用 httpx(D5),但解析下沉、raw 只存原始。回归基线:拆前后 mart `jobs.json`(2084 岗)diff 一致。

## 9. 已定决策
- **D1** page 源 raw 同时存 `.html` 和 `.md`。
- **D2** crawl 输出迁到 `raw/crawl/<source>/<date>/`。
- **D3** 验证码过不了 → 记日志跳过,后期人工。
- **D4** 源注册表独立成 `etl/sources.py`,auto_update / docker / 清洗都读它。
- **D5**(已确认)JB 无风控,fetch **继续用 httpx 老方法**(不上浏览器);**解析从抓取里拆到 clean→processed**,raw 只存原始 HTML。即第 8 节第 5 步那样拆 `05`。

## 10. 不做(YAGNI)
- 不把开放数据 CSV 塞进 crawl/`.md`。
- 不给无风控的 JB 上浏览器。
- 维度表/PNP 省级源不上日更/2h。
