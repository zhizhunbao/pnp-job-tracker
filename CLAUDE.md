# CLAUDE.md — pnp-job-tracker 设计宪法

> AI 编程代理在本项目的行为准则与长期约定,每个 session 自动加载。2026-08-29 重构:按主题归位、矛盾归最新拍板、实撞压成判据;规则一条未删,长篇战例沉 git(重构前版本在历史里)。
> **状态/主线/计划/路标看 [STATUS.md](STATUS.md),产品看 [docs/prd.md](docs/prd.md)(用户故事版)。**
> **开工前先答:这是主线哪一格?**(判据:能不能把「有人真的掏钱」往前推一格 —— STATUS.md 主线段)。
> 这里只放**长期不变**的理念与约定;进度、数字、待办不写这里(会过时)。

---

## 原则 1:编码前先思考

- 需求**模糊时不写代码,先提问** —— 但提问有配额:**只问「答错了得推翻重做」的**,最多 3 个,每个自带推荐默认值;搜一分钟能查到的(测试框架、目录结构、既有约定)不算问题,是功课。
- 动手前**列可证伪的假设**(最多 5 条;「代码要可维护」这种不可证伪的不算),并**一句话复述执行范围**:只做被点名的对象,宁窄勿宽;提案未逐条点头 = 未批准。
- 先答三个定位问题:① 主线哪一格?② 动的是**数据层 `etl/`** 还是**展示层 `cms/`**?(清洗、换算、分类几乎全属数据层)③ 落在 **raw → clean → mart → DB → 页面** 哪一层?改错层 = 下游全体白干。
- 动 UI/动线前先找现成形态抄(职位板是全站基准);新动线/新组件先出效果图等点头(**产品/设计文档一律用户故事风格**,2026-08-29 立)。

## 原则 2:简单优先 —— Ponytail 决策阶梯

> 「最好的代码是你从没写过的代码」(github.com/DietrichGebert/ponytail)。动手前过阶梯:
> ① 这功能需要存在吗(YAGNI)→ ② 标准库 → ③ 原生/平台特性 → ④ 已装依赖 → ⑤ 一行解决 → ⑥ 才写最小实现。
> **永不上砧板:信任边界校验、数据丢失处理、安全、可访问性、数据完整性。**
> 本项目体现:清洗宁可留空不瞎猜;不为「可能用得上」加字段/脚本/依赖;先复用既有结构再考虑新建。

## 原则 3:只做外科手术式的修改

- **只改被要求的部分**;不顺手重构、不「改进」邻居代码;看不顺眼另立批次。
- **不许删既有注释** —— 决策记录挂在常量与分段正上方(带日期带人带理由),删注释 = 删「当初为什么」。
- 不随手改 import 顺序、空行、格式(格式归 Ruff / Prettier)。
- 提交后必看 `git show --stat`:并行 session 会往索引里 add 东西,别代人提交在建代码。

## 原则 4:目标驱动执行

- 开工前定**可验证的成功标准**(某页某列显示什么、某表多少行、tsc 绿)。写完自己验,别让 Frank 当 QA:
  - **代码闸**:`npx tsc --noEmit` 零错、`npm run lint` 零新增、`npx vitest run` 无新增红。**按改动类型选闸**(2026-08-19):纯注释/文档只跑 tsc+eslint(build ~2min、vitest 25-50s 白跑;但 tsc 不能省 —— JSDoc 写坏是语法错,`*/` 提前闭合报 TS1434)。动了代码跑四道全。
  - **页面闸**:先 375px 手机再桌面(小红书纯手机流量);排版验收英文优先(88% 流量);文案过四闸(不重复、不口语、术语统一、不解释)。
  - **生产闸**:**push ≠ 上线** —— 收口拉本轮新增路由确认换版。
- 说「完成」前确认真跑通;没跑通、跳过哪步,照实说。**出错不静默**:catch 必留痕,不许 fallback 默认值悄悄降级。
- **🔴 首例形制不进派工 prompt**(2026-08-27 Frank):子 agent 是放大器,spec 错它忠实放大错。凡涉形制,prompt 只许写「照抄某文件的形」并指认样张路径;没有样张 = 首例,**lead 先亲手做一件拍成样张**再派工。
- **新立域交付前自查**(Frank「每次都要我提醒」):零基线双零 + 框架值收域 + 超限拆件。

---

## 项目上下文

### 这是什么

**offer2pr.com** —— 每日更新的**全加拿大全职业职位板**,移民价值视角:能走「雇主 offer → 省提名」的岗打 `pnpEligible` 标记(PNP 只是信号之一)。Job Bank 全 10 省全职业日抓增量 + ATS;数据按 国→省→市→区 分层不写死地域。全国单文件 `raw/jobbank/postings.json`(province 作字段,posting_id 增量去重)。

### 架构:两段式,数据层与展示层严格分离

```
etl/ (Python: 抓取 → 清洗 → 评分, 写 data/) ──> cms/ (Payload + Next.js + Postgres) ──> 公开页
```

- `etl/` 域即役(一域一门,调度看各域 META/METAS;2026-08-31 批C~L 十一批收官:**全部代码住域,每域五件套** constants/scheme/functions/main/__init__,根上零散件清零),`etl/paths/` 是**唯一路径真相**(任何脚本不写死路径)。
- **分层(数据仓库式)**:raw(抽取)→ clean/(清洗按关注点)→ **mart(`09_build_mart.py` 产出 data/mart/,列对齐 DB,一文件=一张表)** → load(seed)。
- `lib/mart`(壳在 `app/api/seed`)是**纯加载器**:只读 mart json → 灌库,不拼装不清洗。不带 `?reset=1` = 增量对账(未出现的岗 → closed)。
- **DB**:事实表 jobs/companies;维度表 provinces/cities/districts/noc_categories/sources/experience_levels/designated_employers。Payload 管 schema/admin。
- **分类/标签在数据层算**:NOC 大中小类+TEER 在 `etl/noc.py`(单一来源);来源显示标签在 mart 洗。前端只读字段,筛选选项读维度表(颜色等纯显示留前端)。

### 目录结构

```
pnp-job-tracker/
├── etl/                       # 数据层(Python):27 域全五件套 —— 抓岗 jobbank/ats,汇装 mart(跨源清洗+评分+27 表),调度 sched,闸 gate
│   ├── <域>/                  #   一域一役:__init__ META/METAS 声明 role/interval,main 门;auto_update 自动发现(2026-08-31 批F:sources/ 役册退役)
│   ├── pnp/ crawl/ news/      #   省 PNP 事实构建;官方站 URL 探索(政策雷达);官方新闻
│   └── noc/ names/ paths/ log/ fetch/ crawl/  #   基建叶六片(职业分类法/公司名归一/路径+锁/日志/抓取件/官方站缓存),形制闸 INFRA 名单即此
├── data/                      # raw/<源>/ 原始 → processed/ 当前态 → mart/ 最终表;crawl/<slug>/manifest.json = 官方 URL 清单(**找官方数据先 grep 这里**)
├── cms/
│   ├── src/collections/       #   Payload collection = 表 schema
│   ├── src/app/api/           #   服务端接口,一功能一目录一壳(og/sitemaps/seed 也在此,壳=一行转发)
│   ├── src/app/(frontend)/    #   公开页。**白名单三文件:page.tsx / layout.tsx / main.css**(eslint + pre-push 双闸,加名过 Frank)
│   │   └── <路由>/page.tsx    #   页面门:只拼装 components 桶(page-compose 五闸)
│   ├── src/components/        #   组件桶 44 个:通用(button/table/card/modal/select/shell/banner…)+ 业务(jobs/employers/chat…);og 桶含 server 门(HTTP 芯住组件桶首例)
│   ├── src/lib/               #   领域模块:一域一目录+桶;db/(database+sql)、i18n/(zh/en/ko 一语一文件)、ruling/ points/ jobs/(判定评分)、agent/ consult/ llm/(对话)…
│   └── tests/                 #   int(vitest)、e2e(playwright)、eval(评测批)
└── docs/                      # prd.md + design/(一案一文件带日期)+ sql/(生产 DDL,永不清仓)
```

### 核心理念:清洗下沉到数据层(最重要的一条)

**「脏活在脚本里干完,seed 只入库,前端只显示。」**

1. **谁的数据谁清洗**(2026-08-31 Frank,clean/ 目录随批J 退役):单源清洗住**源域的段**(JB 解析/护栏在 jobbank,ATS 薪资抽取在 ats),跨源清洗住 **mart 域的段**(地点/薪资归一/试点打标 —— ATS 和 JB 过同一套,拆给单源=复制共享映射表)。每段 IN_*/OUT_* 全路径常量住域 constants(经 `paths` 解析,运行时打印)。
2. **一个「清洗关注点」一个段**(不是每字段一个、也不是每来源一个):一个关注点往往产出多个互相依赖的字段,同段一次算清。
4. 发现前端在清洗/换算 = 技术债,下沉成清洗脚本。

## 数据约定

- **铁律:URL → 数据 → SQL,顺序不许倒**(2026-08-04)。找官方数据先 grep `data/crawl/<slug>/manifest.json`(crawl 役周更,全文在 html_cache/),**禁止凭印象猜 URL**;抓下来先落 raw/mart 再进库,消费端只读库。
- **「官方不公布」是需要举证的断言**(举证 = URL + 官方原句),举不出只能写「本站未收录」—— 两者在用户那里意思相反(前者=官方的问题该警惕中介,后者=我们的问题该去官网),搞反 = 拿假前提教用户防中介。抓不到(WAF)一律 `not-collected`。
- **补全数据与保鲜永远是主线**(2026-08-03):缺数据当场抓,别说「本站未收录」了事。
- **公司级数据一律懒查询,禁批量预抓**(Frank 铁律);存量队列项执行前过懒化透镜。
- **地点**:大渥太华社区(Kanata/Nepean/Orléans…)是「区」,统一 city=Ottawa;精确地址需含街号否则 address 留空;社区判定文本优先,邮编只用高置信郊区 FSA 兜底(central Ottawa 不猜)。
- **来源真相**:Job Bank 聚合 indeed/Talent 等 → 统一显示「Job Bank」,`source` 保留原始板;`origin` 是发布渠道不代表雇主真假;中介已按公司名过滤。
- **评分/PNP**:NOC → TEER → 每 TEER 评分(mart 域评分段)。`pnpEligible` = TEER 0-3 或紧缺低 TEER 清单;排除式省(AB;ON 排除集空=全职业)默认可、清单内不可 —— **粗筛信号,非资格认定**(QC 自成体系不属 PNP)。未匹配 NOC 标「未分类」,不硬塞。
- **雇主机会口径**(2026-08-29,详见 [雇主板设计稿](docs/design/雇主板重构-20260829.md)):裸 LMIA 总量永不入排序(农业/医疗水量霸榜);证据必须按职业大类交叉;「名录」一词退役,统一「指定雇主」。

## 代码组织约定

> 判据一条:**读的人要能少翻。** 以下全是推论。

- **文件名说「装什么」,不说「是什么构造」**:`colors.ts`/`columns.ts`/`prompts.ts` 行;顶层与共享叶子禁 `constants.ts`/`utils.ts`/`json.ts`(域内七件套例外,见下)。文件名用单词,同类装同一文件。`types.ts` 只在 ① 形状被多文件共用且 ② 没有更自然宿主时才建 —— 默认不建,类型跟主人走。
- **名字的清晰度看它在不在能自解释的组里**(fields/answers/decisions 并排即懂);起名先问邻居是谁。
- **一个模块 = 一个目录 + `index.ts` 桶**;目录名说领域,文件名说角色;外部一律从桶 import。「只想看接口」靠桶,不靠把签名抄一份放文件顶部(两份真相必脱节)。
- **只有一个消费者的东西不导出、不进共享叶子。**
- **文件内顺序**:`'use client'` → 文件头注释 → import → **按关注点分段**(段内 type → 数据 → 函数),不按构造分类排序。超 ~200 行加段横幅。导出就地写,不集中 export 块。
- **段横幅**(2026-08-19,全站一种):三行 `//` 框 + `N.` 编号;段内**不再切小节横线**(`// ── 名 ──` 已退役)。样板 `lib/db/sql.ts`(27 段)。

**什么值得收拢成「单一来源」**

- 判据是**有没有重复**,不是整不整齐;**🔴 没数出重复不抽公共**(2026-08-20 Frank)—— 分早了比不分贵。**可量判据:数消费者**,一个消费者的不是公共。
- **形状与行为分开判**:形状(type)重复先忍着,各域自己声明;**行为(函数)重复不许** —— 复制判定/算分 = 给全站口径开岔。
- 只有**另一种介质**才值得整体搬走:SQL(`lib/db/sql.ts`)、CSS(`main.css`)、文案(`lib/i18n/`)、数据(data→mart→DB)。同语言的常量函数按领域走。
- ⚠️ **JSON 存不下注释** —— 把带注释的常量搬成 .json = 丢决策记录;真该 JSON 的只有移民事实,去处是 data→mart→DB。
- **可翻译文案只有一个家 `lib/i18n/`**(2026-08-22:按**语言**分文件 zh/en/ko,域是文件内分段;身份+三语一体的表按域管进各域 constants)。判据:**加一门语言要改几个地方?** 答案不是一就没收拢。三语对齐靠类型强制(`Record<keyof typeof xxZh, string>`,漏翻=tsc 红)。推论:**能让编译器管的不写检查脚本**。
- **提示词不是文案**:给模型看的归 `prompts.ts`,不进 i18n。

### 域内文件的标准形态(终态 2026-08-23 定,样板 `cms/src/lib/agent/`)

> 进了说清领域的目录,按构造分文件反而最好定位。**终态九个名字**(闸 `domain-file-names`):
> `constants.ts` / `variables.ts` / `prompts.ts` / `schemas.ts` / `types.ts` / `functions.ts` / `routes.ts` + `index.ts`、`server.ts` 两门。
> (rows.ts / callbacks.ts 2026-08-23 撤编,并回 functions.ts 当尾段:行构造器段 + 回调段;比较器用逐行特批牌。)
> 九个抽屉都装不下 = 那东西不属于这个域。

- **`variables.ts` 是域里唯一放变量的地方**(2026-08-20):写成**一个容器对象**(`CACHE`),不是几个 `export let`(跨模块只读活绑定,赋值当场编译错);一个域有多少可变状态一眼数清。
- **`functions.ts` 顶层只有 `function`**;常量归 constants,形状归 types;复杂对象写构建函数。**行构造器 `to*`**:值级清洗(json 解析、默认值、字段提取)全在 to* 做完,**其余函数入参一律已有效**(2026-08-22;闸 `no-db-vocab-in-functions`:db 词汇只许 to* 体内);剩下的判空只许是业务取舍,不许是「这格可能脏」。
- **`routes.ts`**:HTTP 芯,顶层只许 `*Route` 导出(闸 `routes-shape`,只放行 `../db/server` 的 `getDb`)。
- **🔴 `types.ts` 与 `constants.ts` 不许 import**(2026-08-20,闸 `no-import-in-leaf`):形状本域自声明,只声明真读的格;常量只装 JSON 装得下的(标量、字符串表、正则),带库泛型的拆成标量 + 构建函数。一个域的依赖只剩一条边:functions → 别人。✅ 2026-08-25 全站执行完毕:跨域 type import 清零(亲手构造喂外域引擎的**全格照抄**,零读格的透传**不透明化** `= object`,断言只住装配点)。`Lang` 三字面量各域自抄。
- **两个门都只是门,门里只有转发**(2026-08-20):混 payload 依赖的桶会把连接池打进浏览器包(tsc 全绿 build 才炸,08-18 实撞)。**真解法:functions 根本不 import payload** —— 取数函数收 `db: Queryable` 参数,连接池由调用方(routes/页面门)注入(**方案 A,2026-08-23 定形**;`db/pool.ts` 挂 `server-only` 毒丸双保险)。带 payload 的进程内缓存是路由层基建,不属于域。
- **`'use client'` 文件对 `/server` 只许 `import type`**;桶闸在 `cms/eslint.config.mjs`,加新桶/新 server 门同步加行。含服务端芯的**组件桶**同样可开 server 门(og 先例:HTTP 芯住组件桶,ImageResponse JSX 进不了 lib .ts;component-file-names 闸允 server.ts,判据=真有沾库芯)。

**类型与写法铁律**(闸全在 REFACTORED 名单内 error,存量走 `cms/eslint-suppressions.json` 基线,只紧不松):

- **`any`/`unknown`/`undefined` 全禁**;`unknown` 不下传,信任边界当场收窄成显式联合。唯一豁免形态 = 逐行 `eslint-disable` + 理由(外部库定死的形状),不设整层豁免。
- **`?` 只许在 type 属性签名上**(2026-08-25):一格三分逐格判 —— **必填**(默认档)/ **`?:` 真可选**(这格可能压根不存在)/ **`| null` 空是事实**(格子在,记的就是「没有」—— 官方未公布、DB NULL)。分界:**缺席=没被记录;null=记录了「没有」**。别全写 null 也别全写 `?:`(不表态=没写)。`| undefined` 不许显式写;可选参数 `(x?: T)` 禁;`?.` 禁(取值处写显式 if)。**数据链上(to* 之后)禁 `?:`** —— 只有必填与 `| null` 两态;`?:` 只活在 tsx props、线格式(缺席=不发键是协议语义)、归一前形状与外部库形状。三态格不许静默折两态。
- **🔴 禁 `!x` 与 `x!`,禁 `??`/`??=`**(2026-08-21):判空 `== null`(唯一的 `==` 例外,双杀 null/undefined),空串 `=== ''`,空数组 `.length === 0`,布尔 `=== false`;`??` 展开写。其余一律 `===`/`!==`。
- **🔴 禁三目**(2026-08-21):流程位 if/else;值位提成具名小函数;特区仅 `lib/db/functions.ts` 词汇表与 tsx。
- **🔴 控制语句一律大括号且体换行**(curly all + 1tbs);函数行数上限 75。
- **函数一律 `function 名()` 声明式,不许匿名**(`.map(f)` 传具名函数可以;内联回调提成具名或改 for)。
- **一个函数一个参数,出入参用自己的 type**(`XxxIn`/`XxxOut`);库定死签名的除外,行上标明外部规定。
- **不许对象展开 `...`** —— 字段写全。库类型在 types.ts 起本地名。
- **tsx 组件体内禁声明内嵌函数**(2026-08-26,闸 `no-nested-function`):迁本域 functions.ts,闭包变量改显式入参;`make*` 工厂体内与库回调实参豁免。
- **`as` 允许但先问它在补什么**:实测多数是「本该写注解的地方拿断言顶了」;跨边界形状(DB 行、库逆变)留着并写清为什么。**禁 `as unknown as X` 双重断言**。`as const` 只在靠字面量窄化时用。
- **默认值词汇表只有四词**(`lib/db`:`text`/`count`/`numOrNull`/`show`):🔴 官方可空数值必须 `numOrNull` 保 null —— 折 0 = 替官方编数。
- **不用 `class`**:失败抛原生 Error,身份挂 `name`,造错走 `lib/error` 的 `fail()`,判定写类型谓词 `isXxx(err): err is Xxx`(谓词签名语言规定,是「一参一型」唯一例外);跨模块与 vi.mock 下 `instanceof` 失灵,`name` 不会。外部库要求的垫片除外。
- **不许成员变量/共享可变状态**;唯一例外 = 外部库回调交回结果的接缝,类型上写明特批(样板 `lib/agent` Inbox)。
- **try/catch 只加在真会抛的地方**(I/O、外部调用、模块入口);纯函数不许套 —— catch 返回兜底值把异常变假事实。
- **日志与失败不写在域里**:`console.log` 只有 `lib/log.ts` 一处,造错判错只有 `lib/error.ts` 一处;域里连 logFailure 包装都不留。
- **域之间不互取常量、不互借取数函数**(共享叶子 `lib/location`、`lib/db` 例外 —— 基础设施判据:换掉它业务一个字不用改);跨域只留一条边:上层把函数注进去。

**注释的形状**(2026-08-19 定型,照 `@anthropic-ai/sdk`):

- 文件头一个 `/** */` 块:这文件是什么 + `@author` + `@time`(git 创建时刻)。
- **每个声明都要注释,一个不落**(常量、type、函数、type 的每个属性、常量表的每个键);一律多行 `/**` 块,不写单行;两块之间空一行;不为短而压缩。
- 函数 JSDoc = 做什么 + `@param` + `@returns`,**不逐条复述入参字段**(归 XxxIn 的属性,写两处必脱节)。
- 段横幅下不放悬空说明块;长篇背景归 docs,代码留一句指路。🔴 正文不许出现 `*/`(路径用反引号裹)。

### 命名与排序(2026-08-23 拍板;理念:按内容分类)

- **函数七词表**(角色固定词,业务动词自由):`xxxRoute` HTTP 芯 / `loadXxx(db)` 连库现查 / `getXxx` 带单件缓存 / `toXxx` 行构造器 / `xxxOf` 纯派生 / `isXxx` 谓词 / `makeXxx` 返回函数的工厂。get 与 load 分界:get 可能给缓存,load 保证现查。
- **常量名 `主题_角色`**,角色后缀固定(`_RE`/`_SEP`/`_MAX`/`_MIN`/`_TTL_MS`/`_LIMIT`);边界名家族用前缀(`P_` 查询参数、`HDR_` 头名);带单位的数字单位入名(`_MS`/`_LEN`/`_ROWS`);映射表 = 键_值(`PROV_NAME`)。
- **变量**:默认唯一容器叫 `CACHE`(格 camelCase 每格 JSDoc);第二种状态才有第二个容器,名字说内容,禁 STATE/DATA。
- **types 七后缀 + 三段律**:`XxxDbRow`(pg 原始)→ `XxxFact`(to* 洗净)→ `XxxRow`(对外);`XxxIn`/`XxxOut` 契约、`MaybeXxx = Xxx | null`、`XxxJson`、`XxxFn`;可跳段但名副其实;清单用复数。
- **routes 名 ↔ URL 机械映射**:`/api/stats/fine` ⇔ `statsFineRoute`;单方法不带方法词,多方法方法殿后 Route 前。
- **排序**:constants/types/functions 三文件段横幅**同名同序(镜像)**;段内 **step-down**(被调函数出现在首个调用者之后);types 段内 In 挨 Out、三段律相邻;routes 按 URL 字典序。

### 页面域形制(2026-08-26~29 拍板)

- **(frontend) 白名单三文件:page.tsx / layout.tsx / main.css**(eslint route-file-names + pre-push 双闸,清单封闭加名过 Frank)。路由目录只剩 page.tsx,组件全住 `components/` 桶。
- **页面门只拼装**(五闸:page-compose-only / page-no-logic / page-strings-from-bucket 裸串禁 / forbid-elements / jsdoc-comments-only):门里禁其他函数、禁常量、禁 JSX 展开 `{...props}`、代码内不留注释,壳件拼装(Frame/Header/Footer)在门里。
- **meta 三形**:静态 B 形 `export const metadata = XXX_META`(内容住桶 constants);动态 A 形 `generateMetadata` 在门里声明,体 = await 拆参 + 一行 return 桶函数;C 形 `= fn` 禁(框架接线形不进桶签名)。框架名特赦仅 NEXT_FNS(generateMetadata/generateViewport/generateImageMetadata/generateStaticParams)。
- **api 壳 = 一行转发**:`export { xxxRoute as GET } from '...'` + 段配置导出(每个导出带 JSDoc)。og/sitemaps/seed 都在 `app/api/` 下;robots 在 Disallow /api/ 下按需开洞(爬虫要读的资源 Allow 点名)。
- **satori 特区先例**:og 桶(图渲染管线)豁免 forbid-dom-props / no-bare-strings 两条 —— 「外部渲染管线物理约束」型域级豁免(css module 在图管线物理不存在)。

### 样张登记(2026-08-27 拍板;派工与新写一律照抄真文件,不现场拍形)

> 样张 = 过了全部闸、上生产的真文件。派工公式:**主样张整读 + 按目标文件特征点名增量样张**。样张里逐行挂理由的特批行不是形,不抄。

| 形 | 样张 |
|---|---|
| lib 域标准形态 | `cms/src/lib/agent/` |
| 组件桶 + 页面拼装门 | `cms/src/components/companies/` + `app/(frontend)/companies/[slug]/page.tsx` |
| 表格列构造(洗行→展示行→哑单元格) | `cms/src/components/employers/` functions.ts 列构造段 + 任一 `*cell.tsx` |
| 多视图 + hooks 桶 | `cms/src/components/account/` |
| 挂件(懒加载/手柄工厂) | `cms/src/components/chat/` |
| 段横幅与编号分段 | `cms/src/lib/db/sql.ts` |
| 常量表(主题_角色、逐键 JSDoc) | `cms/src/components/chat/constants.ts` |
| 整页外框/正文轨 | `cms/src/components/shell/` |
| api 壳一行转发 | `cms/src/app/api/og/[file]/route.ts` |

### 新建域 / 替换域:先判边界(2026-08-19 立)

> 判据:**依赖只能指向活得更久的那个。**

- 动手前三问:① 这域**回答什么问题**(一句话说不清=边界没找到)② 和已有域**边界切在哪**(切法要是判据:样板 llm/agent/consult 两刀 =「有没有工具循环」「怎么跑还是跑什么」;⚠️ 别按「用哪个模型/后端」切 —— 会变的事实,当天作废)③ **寿命多长,谁先死**?
- **🔴 替换域时「将死的依赖幸存的」,永不反向**:幸存件先搬新域,老域反过来从新域取;老域每删一文件,新域桶少一行导出。
- 一个域被当地基用就是**基础设施**(判据:换掉它业务一个字不用改),叶子依赖不违反域间禁令。
- 🔴 **域该大改时不原地重构 —— 建新域整个替换**(2026-08-20;样板 consult 替 chat):四步 ① 新域打真数据验过 ② 老域改依赖新域 ③ 切消费者 ④ 删整个目录;每步四道闸。推论:**别把搬家当重构**(要么纯移动不改一字,要么重写);健康的域照常改(判据:是不是整域形状要变)。
- 收拢判据前提变了要回来重判;**判定写日期**,好知道它基于什么前提。

## 展示约定

- 站点定位**日更职位板**:默认排序发布时间最新在前,同日岗保持入库序;通道档(1-5)只在点「通道」列时作主键,列序发布时间第一、通道最后。评分、vs 工资中位等移民维度是差异点,优先保护。
- **新页骨架照职位详情页**:Shell 套壳(禁自造容器)+ 右上角返回 + H1 + 白卡;卡片表格一律职位板形态。
- **🔴 通用形态单一出口**(2026-08-28 总律):钮、表、卡、弹窗遮罩、下拉、胶囊、外框、正文轨、表卡切换 —— 全站只许通用桶一个实现,业务桶只消费;「不够用」的正确动作是回去扩通用件,不是 fork。同一形态第二个实现 = 违规。非弹窗 fixed 形态各有其家(popover 挂件/抽屉/伪全屏)不硬套 modal。**分期节奏**:一批只做一种变换(搬家批验行为不变、换装批验值不变、收拢批验形归一)—— AI 跨不动复合步骤,两种变换叠一批必漂移;新写代码从立律起必须经通用桶。
- **文案**:一行放得下不折行;多信息不用「·」「/」杂糅,一行一条;名字不截断,加载区必占位;解释类默认删,只留四类(法律免责、≠资格认定、tooltip、空态引导);代码不裸奔 —— 人话名主文案,代码(NOC/省码/TEER)灰字小注。术语「指定雇主」不叫「名录」(2026-08-29)。
- **收费原则(2026-08-14)**:**简化用户操作的才收费**;事实与结论一律免费(结论是转化诱饵);付费买代劳与自动化(盯梢、一键生成、对照代查、预填)。答题前注册闸是地基。

## 技术栈与闸门

**数据层(Python)**:3.11+,uv(`.venv/`);Ruff line-length 120 / py311。httpx + BS4/lxml;pymupdf / openpyxl / loguru;浏览器兜底 `.[browser]`。路径一律 pathlib 从 `paths` 域取。**依赖唯一真相 `pyproject.toml`**。**加新源 = 开域**(2026-08-31 批F,sources/ 役册退役:mkdir etl/<域> + `__init__` META(一域多役用 METAS,load 先例)+ scrape/build 步 + main 门,见 [etl分域设计稿](docs/design/etl分域-20260829.md) §6.5 开域手册),别改调度器。批量翻译走本地模型(Ollama)不烧付费 API。

**展示层(TypeScript)**:Next 16 App Router(standalone)+ React 19 + Payload 3 + Postgres;TS strict。测试 vitest(int)+ playwright(e2e)+ 评测批(vitest.eval);**判定层测试**穷举输入断言性质 + 手写金标 + 变异探针,**禁快照矩阵**。动态加载文件要进 `next.config.ts` 的 `outputFileTracingIncludes`。站级聚合禁每请求现算(TTL 缓存);**上新筛选参数必查索引**(热筛选列缺索引打爆连接池 = 生产 500)。生产加列/建表:`docs/sql/` 手写 DDL 先行;新维度表给 `payload_locked_documents_rels` 补列,否则 seed 500 无 body。

**写法闸只查已重构域**(2026-08-21):名单 = `eslint.config.mjs` 的 `REFACTORED` 常量;未重构区连 warn 都不出(噪音淹真账);报告 = `cd cms && npm run lint:report`。

## 跑起来

```bash
# ⚠️ 本地 dev 直连正式库(Render Postgres,cms/.env 已配)
cd cms && npm run dev                    # localhost:3000(读写生产!测试号 @test.local);本机只准一个 dev 实例,验完即关
# 改 collection 字段:显式 DB_PUSH=1 单次推(删列/改类型手写 SQL,提示删列必答 N);改 Jobs 字段后重启 dev 再重灌
# seed 必带 token(直连生产,reset=1 会清库慎用):curl -H "x-seed-token: $SEED_TOKEN" localhost:3000/api/seed
# 无人值守全栈(仓库根):docker compose up -d --build(批N 一域一容器 15 ETL 容器;本地 postgres/cms 闲置件 08-31 拍板删除,dev 直连生产库、seed 直打 offer2pr.com)
# 完整 ETL:python etl/sched/main.py --only now(2026-08-31 批K 调度器域化;编号主管线已全数入域,mart 域=跨源清洗+汇装)
```

## 禁止事项 (Do NOT)

- 未被要求的重构;顺手改格式/import 顺序;**删既有注释**(尤其带日期的决策记录)
- 凭印象猜官方 URL;无举证写「官方不公布」;在前端或 seed 里清洗/换算/分类;消费端绕过 DB 直读 raw
- 脚本写死路径;顶层/共享叶子建按构造命名的文件;给非模块目录随手配 types.ts
- 不判边界就新建域;按模型/后端切边界;让幸存域依赖将死域;原地大改一个域
- functions.ts 放变量;constants.ts 放 JSON 装不下的结构;types/constants 里 import
- 没数出重复就抽公共;把行为复制一份当「自己声明」
- 匿名函数、any/unknown、双重断言、对象展开、纯函数套 try/catch、tsx 内嵌函数、三目(词汇表与 tsx 除外)、`?` 出 type 属性签名(`?.`/可选参数仍禁)、`| undefined`、class、域里 console.log/造错、成员变量传结果
- 声明缺注释或写单行 `/** */`;JSDoc 复述入参字段;注释正文 `*/`;段内分类横线;拿 `as` 顶注解
- 给单消费者加导出;带注释常量搬 .json;文案散在 i18n 外;prompt 混进 i18n;不从桶 import;桶里混服务端依赖;client 文件值导入 /server
- 自造页面容器/表格形态;新页缺右上角返回;(frontend) 白名单外加文件;页面门里写逻辑/常量/裸串
- 批量预抓公司级数据;未经协商加依赖;fallback 静默降级;catch 不留痕
- 把「已上线」「已收款」当既成事实;碰生产破坏性操作(`?reset=1`、DB_PUSH 删列)一律停下问 Frank
- python 批量编辑用贪婪跨块正则(`/\*\*(?:.*?)*?名/` 实撞两次吃掉无关声明)—— 按行定位或 git show 重建
