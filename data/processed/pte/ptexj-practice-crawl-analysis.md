# 猩际(ptexj)登录态题库区探索

抓取日期:2026-09-02(America/Toronto)。承接 `duoink-ptexj-crawl-analysis.md`(09-01,只到用户中心壳页 1 页)。

## 结论

1. 猩际题库区的**列表元数据、预测/机经清单、考过票数、考试记录评论**登录后可读,且全是明文。
2. **题干正文在两层都拿不到**:API `list_v2` / `single_num_v2` 的 `item` 是 `e1` 密文(上次已知);渲染态里正文**逐词画在 `<canvas>` 上**(`WordContainer` + `user-select:none`),DOM 文本只剩标点。本次在此停止,未做 OCR,未碰加密。
3. 猩际网站与 Chrome 登录态**互斥**:在 crawl 浏览器登录后,Chrome 里同账号的会话立刻失效(跳 `/pte/login`)。登录态从此只住 `etl/crawl/.browser-profile`(统一 profile 铁律)。

## 边界

- 用 `etl/crawl` 域的有头持久浏览器(`get_browser_page` + `put_cached_page` 写门),Frank 亲手登录;脚本只做导航、读 DOM、记录请求。
- 未绕过登录、验证码、反调试(crawl 域对 cloudfront 主包的 `ondevtoolopen` 补丁本就命中猩际)、`e1` 加密、canvas 反爬。
- token / 邮箱 / device_id 在落盘前全部替换为 `[REDACTED]`;`data/crawl/` 不进 git。

## 站点结构

- React SPA(styled-components + antd),`id="root"`;静态包住 `dl26yht2ovo33.cloudfront.net/public/web/distFolder/production/`(`main-*.js.br` 路由表 + `Practice-*.js` 题库 chunk,后者二次混淆)。
- 路由表 77 条(从主包 `path:` 字面量倒出,非猜测):`/pte/user_center/*`(学习中心/模考/课程/单词本/通知)、`/pte/archives/*`(机构版学生档案)、`/pte/stream/*`(流式刷题)、`/pte/vip/*`、`/pte/blog|guide|bbs|course|search`,题库在站根 **`/practice`**。
- 题库入口(`/pte/index` 渲染态 `<a href>`,PTE Core 19 型):
  `read_alouds` `repeat_sentences` `describe_images` `answer_questions` `respond_situations` `core_swts` `write_emails` `fib_wr` `r_mcm` `ro` `fib_rd` `r_mcs` `core_ssts` `l_mcm` `l_fib` `l_mcs` `l_smw` `hiws` `wfds`
  开 `/practice/<model>` 自动跳到 `/practice/<model>/<题号>`(默认 tag=predict_core 的第一题)。

## API(`any.ptexj.com/api/v1/`,全 GET,鉴权走 query 的 token)

| 端点 | 参数 | 明文/密文 |
|---|---|---|
| `questions/tags_v2` | `model, exam_type=pte_core` | 明文:`tag`(all / exam_core「Core 机经」/ predict_core「Core 预测」/ question_list)、`order_method`(prob / updated_at / num / short_first / long_first / score_low / score_high)、`filter`(collection / practice / difficulty / new_prediction / category_explanation) |
| `questions/list_v2` | `model, tag, order_method, filter, page, page_size=20` | `questions[].item` **e1 密文**;`item_addition`(serial_number, exam_count, collection_*)与 `page_info`(total_count 等)明文 |
| `questions/single_num_v2` | `model, num, tag, order_method, data_version=2` | `item` 密文;`exam_count / need_vip / prev_num / next_num / count` 明文 |
| `answers/list` | `model, model_id, page` | 用户答案区(未存) |
| `comments/exam` | `commentable_type, commentable_id, page` | 「确认考过 + 日期」评论,明文 |
| `comments` / `comments/has_bookmarks` | 同上 | 练习讨论,明文(含人工翻译、答案解释) |
| `predictions` | `from_domain` | 用户中心首页调,未展开 |

用户中心/课程/博客/模考区另有 30 余端点(appconfigs、paid_classes、mock_exams/*、studies/*、words/word_sets…),与题库无关,清单在本轮 scratch,未入库。

## 渲染态能拿到什么

| 可得(明文) | 不可得 |
|---|---|
| 题号与短标题(`#302 Elephant`、`#68 Sportswomen`)—— 可与 duoink 的 `tt` 标题对 | 题干正文(逐词 canvas) |
| 预测档(「预测中等」)、考过票数(「考过 (413)」)、答题时间 | WFD 句子(只有音频;「答案」钮未点,未验证) |
| FIB 选项词、评论区人工翻译与解析(AI 解析里带原句片段如「And if the paper records don't ____」) | 音频源(未查) |
| 「确认考过 YYYY-MM-DD」评论 = 考场回忆日期信号 | |

## Core 预测清单规模(tag=predict_core,`page_info.total_count`)

RA 15 · RS 62 · DI 9 · ASQ 19 · RTS(respond_situations)21 · SWT 8 · Email 10 · RW-FIB 16 · R-MCM 1 · RO 25 · R-FIB 62 · R-MCS 4 · SST 4 · L-MCM 0 · L-FIB 38 · L-MCS 1 · SMW 0 · HIW 7 · WFD 31;合计 333。
快照:`data/raw/pte/ptexj/predict-core-counts.json`。tag=all 的总量本轮未拉(上次混合模型统计见 `model-counts-core.json`)。

## 产物

- crawl 层:`data/crawl/ptexj-pte/manifest.json` 67 页(用户中心 45 + 首页/搜索 3 + 19 题型题页),HTML 已脱敏。
- raw:`data/raw/pte/ptexj/predict-core-counts.json`。
- 本轮 scratch(不入仓):路由表、全端点清单、74 份 API 响应体样本。

## 对本项目的意义(待拍板,未立步)

- 猩际可作「最近考了」的**第四信号源**:`exam_count`(考过票数,ynwac votes 同类)+ `comments/exam` 日期(ynwac「[考试记录]」同类)+ predict_core / exam_core 清单(押题信号,duoink `f_c` 同类)。
- 对题靠**题型 + 短标题**(RA/DI/FIB 与 duoink `tt` 可对),WFD/RS 无标题无正文,对不上。
- 题干不可得,猩际**不能**成为题面来源;要不要为它开步(照 duoink 形:profile 登录态 + 渲染态/明文 API),Frank 拍。
