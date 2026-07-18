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

- [ ] build_dli 本地实跑:raw/dli/dli.json 295 行上下、法语校名无乱码、省码全映射
- [ ] 09 出 mart/dli.json;seed 白名单列全;**生产 DDL 先行**(dli 表 + locked_rels.dli_id)
- [ ] /pathways 六卡:B 分型建档号「与你的处境相关」= study/aip-trades;学校信号带官方名单出处+抓取日期
- [ ] typecheck;三语;措辞红线(无结论句);本地 dev 匿名态验证(验完关)
- [ ] **待 Frank**:生产 seed 后 dli 表灌满;B 型建档号实测信号

## 7. 落地记录

（实施后补）
