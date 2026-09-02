# PTE Core 题库抓取分析

抓取日期：2026-09-01（America/Toronto）

## WFD 是什么

WFD 是 **Write From Dictation（听写句子）**：考生听一遍录音，在输入框中写出完整句子。它同时涉及 Listening 和 Writing；拼写、漏词、多写词、单复数和词序都会影响得分。

## 多墨 PTE Core

- 20 个题型，1,634 条目录记录。
- WFD 276 条。
- Core 使用独立频次字段 `f_c`；导出文件将其命名为 `core_frequency`。
- `core_frequency >= 2` 对应目录显示的 237 条 Hot WFD。

### WFD 频次分布

| Core 频次 | 数量 | 解释 |
|---:|---:|---|
| 0 | 6 | 未标高频 |
| 1 | 33 | 较低频 |
| 2 | 52 | Hot |
| 3 | 185 | 最高频 Hot |

### 最近标注的 WFD

以下是多墨 `recent_seen_at`（原始字段 `e`）最新的一组，日期均为 2026-06-29，且 `core_frequency=3`：

1. `#10624` Please get us a meeting room for the next hour.
2. `#10622` You will get your uniform on the first day of school.
3. `#10619` Being a vegan means not consuming any animal products.
4. `#10616` The meeting for first-year economics students is on Tuesday.
5. `#10615` All the new students will be gathering at the canteen before the class starts.
6. `#10611` The weather report advised us to prepare for a big freeze.
7. `#10610` The university canteen offers so many options.
8. `#849` The cart carries a single object.

该日期和频次是多墨平台标记，并非 Pearson 官方考试记录；适合作为复习优先级，不应理解为“未来必考”。

## 猩际 PTE Core

登录账户的 `exam_type` 已验证为 `pte_core`。按 Core 对应模型查询：

- 20 个模型，共 15,486 条列表记录。
- WFD 3,219 条。
- Core 专属模型包括 `respond_situations=108`、`write_emails=80`、`core_swts=80`、`core_ssts=63`。
- 共享题型的列表可能包含跨考试类型复用的题目，因此总数不能直接理解为“独立 Core 真题数”。
- 单题正文仍以 `e1` 密文返回，本次没有绕过站点加密。

## Raw 数据

- 多墨 Core 题型统计：`data/raw/pte/duoink/catalog-counts-core.json`
- 多墨 Core WFD 276 条：`data/raw/pte/duoink/wfd-core.json`
- 猩际 Core 模型统计：`data/raw/pte/ptexj/model-counts-core.json`

后续分析应以以上三个 Core 文件为主；Academic 文件仅保留作历史或交叉对照。

## 与此前两个开放来源对比

对比对象：`ynwac-bank.json` 与 `ptebank-bank.json`。文本先做 HTML/实体、大小写、标点和空白归一化；“近似”采用字符相似度 `>=90%`。以下数量按去重后的句子计算，因此会略小于原始记录数。

| 来源/句库 | 原始记录 | 去重句子 | 与多墨 Core 完全一致 | 加上近似匹配 | 该来源被多墨覆盖 |
|---|---:|---:|---:|---:|---:|
| YNWAC 组 18（带 `isFrequent`，判断为 WFD） | 137 | 133 | 93 | 115 | 86.5% |
| YNWAC 组 13（RS/WFD 原标签不明） | 183 | 183 | 2 | 5 | 2.7% |
| PTEBank WFD 两篇样本帖 | 114 | 113 | 10 | 20 | 17.7% |

反向看，多墨 270 个去重 Core WFD 中：

- 115 个（42.6%）能在 YNWAC 组 18 找到；
- 21 个（7.8%）能在 PTEBank 找到；
- 只有 4 个（1.5%）能在 YNWAC 组 13 找到，说明该组更像 RS，而非 Core WFD。

YNWAC 组 18 的 79 个去重 `isFrequent` 句子中，72 个（91.1%）与多墨 Core WFD 相同或高度近似。这说明两站的高频层高度同源，但不能仅凭重合判断谁最先发布；更合理的解释是它们共享或相互同步考生回忆池。

### 最近一组题的跨源确认

多墨 `recent_seen_at=2026-06-29` 的最新 8 题中，下面 5 题也在 YNWAC 组 18 完全出现：

1. `#10624` Please get us a meeting room for the next hour.
2. `#10619` Being a vegan means not consuming any animal products.
3. `#10616` The meeting for first-year economics students is on Tuesday.
4. `#10615` All the new students will be gathering at the canteen before the class starts.
5. `#10611` The weather report advised us to prepare for a big freeze.

另外 3 题未在 YNWAC 或 PTEBank 当前快照中达到 90% 相似：`#10622`、`#10610`、`#849`。PTEBank 的 WFD 内容来自 2019 年两篇样本帖，因此没有覆盖这组 2026 平台标注题并不意外。

### 各来源的“近期/高频”标注能力

| 来源 | 可见标注 | 可用于判断什么 | 限制 |
|---|---|---|---|
| 多墨 Core | `core_frequency`、`recent_seen_at` | 高频优先级、平台最近收录/回忆日期 | 不是 Pearson 官方考试日志 |
| YNWAC | `isFrequent`、少量 `isImportant` | 人工策展的高频/重点层 | 单题没有可靠考试日期 |
| PTEBank | 文章发布日期/修改日期 | 题单发布年代 | WFD 只是 2019 样本帖，不代表近期命中 |
| 猩际 | Core WFD 列表记录数 3,219 | 规模比较 | 单题正文和标注以 `e1` 密文返回，未绕过加密，无法做逐题交叉验证 |

结论：就当前可验证文本而言，YNWAC 组 18 是多墨 Core WFD 的高度重合下游/同源镜像；PTEBank 只提供较老且很小的交叉样本；猩际的列表规模最大，但因正文不可验证，不能据此证明其他题库都来自猩际。
