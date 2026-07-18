# E12-03 旗舰②(留学→PGWP→省提名)+ 范围化 DLI 学校数据

> 承接规划 P2。旗舰② = 留学路径通用配方 + **AIP 大西洋 trades 实例**(电焊例);学校数据**范围化**:
> 只建「PGWP 可申 DLI 子集」——不建全 DLI 目录(YAGNI,规划 §6)。

## 1. 目标与非目标

- 目标:① 新数据域 DLI(IRCC 官方 `dli-full-list.json`,单请求 httpx 直取)→ 全管线(raw→mart→collection→seed);
  ② 旗舰②两配方(study 通用 / aip-trades 大西洋实例)进 /pathways;③ 引擎出学校信号(目标省 PGWP 可申公立院校数、大西洋公立院校、AIP 指定雇主数=已有维度)。
- 非目标:**专业/项目级数据**(学制/学费/具体 trades 专业——要逐校抓官网,脆;留 P3 对比层)、全 DLI 目录、
  QC 单独路径话术(PEQ 体系另课题)、旗舰②按校推荐(信息层只摆官方名单)。

## 2. 数据源(2026-07-18 实测)

- **金源**:`https://www.canada.ca/content/dam/ircc/documents/json/dli/dli-full-list.json`(DLI 名单页 DataTables 的 ajaxSource,httpx 200)。
  1454 行,字段 Province/Institution/DLI #/City/Campus/**PGWP**(Yes/No)/Grad Program/Public/Private。
- **范围化取数**:PGWP=Yes 子集 = 495 行 → 按 DLI# 去重 = **295 所**;其中大西洋四省公立 26 所(NSCC/NBCC/Holland College/CNA/Memorial… 全在)。
- ⚠️ 编码:源 JSON 法语校名(Collège…)需强制 utf-8 解码,ETL 里 `r.encoding='utf-8'`,防 mojibake。
- 配方 sources(全 200):study permit / PGWP(after-graduation)/ CEC / AIP / DLI 名单页。

## 3. ETL / 数据链(照 E6-04 pnp_draws 全套先例)

- `etl/build_dli.py`(新):抓金源 → 过滤 PGWP=Yes → DLI# 去重(记 campuses 数)→ 省名→省码(未知省跳过,宁可留空)
  → `raw/dli/dli.json`(`{url, fetched, rows:[{province,name,dliNumber,city,campuses,isPublic,gradProgram}]}`)。
- `_paths.py` 加 `DLI = RAW / "dli"`;`09_build_mart.py` 直通 → `mart/dli.json`(缺文件→空表);
- 调度:挂 `etl/sources/pnp` 周更 steps(DLI 名单低频,与具名清单同节奏);只刷 raw,build 角色每轮 09→seed 消费。
- seed dims 加 `['dli','dli',[列白名单],map]`(坑 2:白名单显式列全)。

## 4. DB(先 DDL 后 push,B4/B7 教训)

- 新 collection `Dli`(slug 'dli',照 PnpDraws 样式,group Data (ETL)):province/name/dliNumber/city/campuses(number)/isPublic(checkbox)/gradProgram(checkbox)/url/fetched。
- 生产 DDL:`dli` 主表(列型对齐 Payload 产物)+ **payload_locked_documents_rels 加 dli_id 列+索引+FK**(B7 清单)。

## 5. 配方 / 引擎 / 前端

- `pathwayRecipes.ts` 加:**study**(audience overseas/studying;选 PGWP 可申院校→学签完成学业→PGWP 攒经验→CEC/省毕业生通道)、
  **aip-trades**(audience overseas/studying;大西洋公立院校读 trades 等文凭→AIP 指定雇主 offer→省背书→PR)。
- `pathways.ts` `evalPathways` 加第三参 `extras { dli?: DliStats; desigEmployers?: number }`:
  study 卡=目标省逐省「{prov} 有 {n} 所 PGWP 可申公立院校(官方名单↗,抓取日期)」/无目标省=全国总数;
  aip-trades 卡=大西洋公立 {n} 所(点名 NSCC/NBCC/Holland/CNA)+「本站 {n} 家 AIP 指定雇主可筛」(designated_employers 维度)。
- `pathways/page.tsx`:payload.find dli(limit 2000)聚合 byProv/atlantic + designated_employers 计数 → 传引擎。
- B 分型(studying)从此有「与你的处境相关」卡(旗舰① audience 不含 studying,正确分流)。

## 6. 验收

- [x] build_dli 本地实跑:295 所(公立 266/大西洋公立 26),法语校名 utf-8 无损(真 è 字符核过),12 省码全映射,<100 所防线
- [x] 09 出 mart/dli 295 行;seed 白名单列全;**生产 DDL 先行**(dli 12 列照 pnp_draws 形状 + locked_rels.dli_id+索引+FK,事务执行 ✓)
- [x] /pathways 六卡本地 dev 实测(匿名态):study/aip-trades 卡 audience=海外/在读、五源出处齐;**dli 表缺护栏生效**(不 500 优雅降级);零 console 错;验完关 dev
- [x] typecheck 绿(payload-types 重生成);三语;措辞无结论句
- [ ] 生产 seed 后 dli=295;/pathways 学校信号可见(数据链跑完复核)
- [ ] **待 Frank**:B 型建档号实测「与你的处境相关」分组+学校信号;**ETL 盒 git pull 新代码**(见 §7 节奏坑)

## 7. 落地记录(2026-07-18)

- commit `f7723a0`(主体)+ `ccd702d`(seed 防线升级)。生产 DDL 已先行执行。
- **节奏坑与修法(重要)**:compose 把 repo volume 挂载(容器跑宿主机实时代码),但宿主机**不自动 git pull**——
  ETL 盒拉新代码前,其小时轮上传的 mart **没有 dli.json**;而 seed 维度语义原是「文件缺=当表不存在→清空重灌 0 行」,
  会把手动灌的 dli 每小时抹掉。**修法(`ccd702d`)**:seed 改「**文件缺失=跳过保留现有行**;文件在但内容 []=显式清空」——
  正常管线 09 全键输出(空表也给 [])零行为变化,只护分表/手动上传与新表过渡期。
- 首灌走手动:本地 mart/dli.json gzip POST `/api/mart/dli`(token)→ 触发 seed(增量)。ETL 盒 pull 后,
  raw/dli/dli.json 已在 repo → 其 09 即产 dli.json 进正常轮;周更 pnp 源里 build_dli 保持新鲜。
- 设计取舍:统计口径=公立院校(话术围绕公立);dliAtl 点名过滤 /college/i(NSCC/NBCC/Holland/CNA 类);
  offerFirst 缺口限 OFFER_FIRST 配方集(study 卡第一步是入学);AIP 卡 regionProvs 限大西洋防各卡重复命中;
  noneNamed 不在地区限定卡上说(措辞会失真)。
- 留 P3/E12-04:专业/学制/学费(逐校抓,脆)、政策源抓取核验+last_reviewed 过期告警、顾问联动(E12-05)。

### 事故记录(2026-07-18,已当场恢复,窗口 ~10 分钟)

- **经过**:首灌走「传 dli 单表 → 触发 seed」;seed 触发时 Render 只部署到 `f7723a0`(含 dli dims、**不含** `ccd702d` 跳过语义)——部署就绪探针用的标记(旗舰②卡出现)只能证明第一笔上线,区分不了第二笔。旧语义「文件缺=清空重灌 0 行」把 **14 张维度表全清**(jobs/companies 因「jobs mart 空跳过下架」防线无损)。
- **恢复**:本地 mart(09 刚构建,维度=repo 维护表当前态)全量 15 表 gzip 直推 `/api/mart/*` → 重灌 seed → 计数全对(provinces 10/cities 2197/pnp_occupations 183/ee 94/dli 295/rankings 291/stats 119),DB+四页 200 复核过;rankings/stats 基于本地 jobs 快照略旧,小时轮自动刷新。
- **教训(记档)**:① 触发生产 seed 前,**部署标记必须能证明「本次依赖的那笔 commit」已上线**(标记要选第二笔特有的产物,或直接查 /api 响应版本);② 更稳的顺序=**永远全量 dims 上传再 seed**(任何语义下都安全),单表上传只在 skip 语义确认上线后用;③ 依赖「防线 commit」的操作,防线自己要先实测(这次防线代码是对的,但没等到它部署)。
