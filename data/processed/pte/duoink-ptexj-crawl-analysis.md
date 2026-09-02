# 多墨与猩际 PTE 题库抓取分析

抓取日期：2026-09-01（America/Toronto）

> 范围修正：后续核验确认猩际登录账户的 `exam_type` 是 `pte_core`。本报告早期查询同时包含共享模型和 Academic 专属模型，因此猩际数量只能视为“混合模型目录”，不能当作严格的 Academic 总数。PTE Core 结论以 `pte-core-crawl-analysis.md` 为准。

## 结论

不能认定现有 PTE 题目“全部来自多墨或猩际”。本次登录态抓取证明：

1. 多墨和猩际各自维护大型、独立的题库系统，数量与内部 ID 体系明显不同。
2. 其他题库与多墨存在大量重合，但不是全量包含关系。重合更符合“多个平台汇集同一批 PTE 机经、考生回忆及官方练习材料”，不能据此把多墨认定为原始出处。
3. 猩际当前前端仍保留 APEUni 命名、旧 API 域名与 `_apeuni_session`，说明 `ptexj.com` 是 APEUni/猩际同一产品体系的现行站点，不是第三个独立来源。
4. 猩际官方对“机经预测”的说明也是根据近期考生回忆整理、筛选和编辑，而不是宣称题目原创：<https://www.ptexj.com/blog/about_pte_prediction?locale=zh-CN>。

因此，追溯“真正来源”需要按题逐条寻找更早的公开文本、Pearson 官方材料、学术/新闻原文或最早可验证发布日期；仅比较题库平台只能证明传播关系，不能证明原创关系。

## 抓取范围与边界

- 使用仓库 `etl/crawl` 抓取两站入口 HTML、前端 JS 和路由。
- 使用用户本人登录后的持久 Chromium 会话访问正常可见页面与前端 API。
- 未绕过验证码、登录、反调试或接口加密。
- 多墨允许从 Vue Store 读取页面已解密的题库目录。
- 猩际允许读取题型数量、分页和考试频次元数据，但逐题 `item` 与 `q_full_text` 返回 `e1` 密文；本次在此停止。
- 会话、token、cookie 和账户字段均未写入仓库。

## 站点结构

### 多墨

- SPA 入口：`https://duoink.co/pte/`
- API：`https://api-global.duoink.co/1.1/`
- 题库函数：`PTE.Exps.GetEntryList`、`PTE.Exps.GetEntry`
- 当前 PTE Academic：23 个目录、7,892 条列表记录。
- WFD：1,650 条；Vue Store 中包含对象 ID、题号、正文、创建/更新时间、频次、难度、主题和适用考试类型。

### 猩际 / APEUni

- SPA 入口：`https://www.ptexj.com/pte/`
- API：`https://api.ptexj.com`、`https://any.ptexj.com`
- 题库接口：`questions/info`、`list_v2`、`single_num_v2`、`tags_v2`、`audios`、`q_full_text`
- 本次混合查询：22 个共享/Academic 模型、17,487 条列表记录；另查到 Core `respond_situations` 108 条。该总数不代表单一考试类型。
- WFD：3,219 条、65 页，每页 50 条。
- 列表元数据为明文；题目主体单独加密。

## 主要题型数量对比

| 题型 | 多墨 Academic | 猩际混合模型 |
|---|---:|---:|
| RA | 520 | 1,443 |
| RS | 965 | 2,844 |
| DI | 466 | 1,223 |
| RL | 242 | 550 |
| ASQ | 943 | 2,361 |
| SGD | 59 | 101 |
| RTS（Academic） | 154 | 226 |
| SWT | 227 | 414 |
| WE | 190 | 448 |
| R-FIB | 431 | 1,046 |
| RW-FIB | 560 | 1,135 |
| RO/RP | 313 | 772 |
| SST | 294 | 593 |
| L-FIB | 178 | 288 |
| HIW | 114 | 336 |
| WFD | 1,650 | 3,219 |

数量是平台当前的“列表记录数”，不保证去重，也不能直接视为 Pearson 真题数量。

## WFD 重合分析

比较方法：小写化、统一标点和空白后做精确匹配；另以字符相似度 90% 作为“近似变体”提示。近似变体不能直接当作同题，例如 `earlier` 与 `later` 可能使句意相反。

| 数据集 | 候选句 | 与多墨精确相同 | 90% 以上近似 |
|---|---:|---:|---:|
| YNWAC `id,isImportant,text` 组 | 183 | 10（5.5%） | 16（8.7%） |
| YNWAC `id,isFrequent,isImportant,text` 组 | 137 | 76（55.5%） | 95（69.3%） |
| PTEBank 两篇 WFD 文章 | 114 | 63（55.3%） | 90（78.9%） |

解释：

- PTEBank 与多墨共享了相当大的一批传统 WFD 句子，但仍不是完全相同的题库。
- YNWAC 两个文本组的来源/用途不同；其中一组与多墨高度重合，另一组重合很低。
- 这些结果支持“共享上游机经池”，不支持“所有题目由多墨原创并被其他站复制”。
- 猩际逐题内容受 `e1` 加密保护，本次只能确认其 WFD 数量和元数据，不能诚实给出猩际↔多墨的逐题重合率。

## 产物

- 多墨匿名 crawl：`data/crawl/duoink-pte/manifest.json`
- 猩际匿名 crawl：`data/crawl/ptexj-pte/manifest.json`
- 多墨 Academic 目录统计：`data/raw/pte/duoink/catalog-counts.json`
- 多墨 WFD 1,650 条去账号化导出：`data/raw/pte/duoink/wfd-academic.json`
- 猩际混合模型统计：`data/raw/pte/ptexj/model-counts.json`

`data/crawl/` 中保留同一轮抓取的 HTML、JS、manifest 和工作缓存；`data/raw/pte/` 是后续 ETL 应读取的去账号化源数据快照。

## 后续来源追踪建议

对每条 WFD 建立 `normalized_text + earliest_seen + source_url + source_type`：

1. 先在 Pearson 官方材料和公开 Sample/Question Bank 中查找精确文本。
2. 再查 PTEBank、多墨、猩际、YNWAC 的最早发布日期或对象创建时间。
3. 对新闻、学术和大学网页句子查找更早的原文页面。
4. 将结论标成 `Pearson official`、`public source text`、`candidate recall`、`platform-only` 或 `unresolved`，不要把最早发现的平台自动写成原创者。
