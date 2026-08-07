# E13-09 · pnp_eligible 口径根修正(五省普通通道进判定)

> 起因:E13-08 复核时发现 `pnp_eligible` 的 inclusion 模型对 MB/NS/NB/PE/NL 的 TEER 4-5 **系统性低估**
> ——五省全有不看职业清单的雇主/经验锚定普通通道,旧模型只认「TEER0-3 或清单命中」。
> Frank 2026-08-07 深夜拍板修口径根(顺序:E13-08 收口 → 本批 → E14)。
> 影响面 = 职位板 `pnpEligible` 标记、榜A「雇主担保可提名省份」列(E13-05)、与 E13-08 dead 口径的一致性。

## 1. 整体目标

`pnp_eligible` 从「TEER0-3 或清单命中」修成与官方通道全集一致:**九省皆有雇主锚定通道,
判否只剩排除清单命中与 QC**。同时把「拿 offer 即可」与「先省内工作 6 个月」分成两档,
榜A 单元格分两行直陈——不让用户把「先落地干半年」误读成「拿着 offer 就能提名」。

## 2. 口径:五省普通通道逐条(锚官方原句;BC/AB/SK/ON 排除式不变)

| 省 | 通道 | 档 | 原句锚 |
|---|---|---|---|
| NL | NLPNP Skilled Worker | **direct**(offer 即可,TEER 0-5)| 「Have a full-time job or job offer: In a TEER 0, 1, 2, 3, 4 or 5 occupation」gov.nl.ca/immigration/4-skilled-worker-category-eligibility-criteria |
| MB | MPNP SWM | **cond**(同雇主 6 个月)| 「offered you a full-time, long-term job after you have completed six months or more of continuous full-time employment with that company」immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility |
| NS | NSNP Skilled Worker | **cond**(TEER4-5 同雇主 6 个月;TEER0-3 本就 direct)| 「Workers in TEER 4 or 5 … must already have six months' experience with the employer」liveinnovascotia.com/skilled-worker |
| NB | NB Experience | **cond**(同雇主+居住 6 个月)| 「working full time … for an eligible New Brunswick employer … at least 6 months of full-time work experience with the supporting employer」gnb.ca …/nb-skilled-worker-stream.html |
| PE | Critical Worker | **cond**(TEER4-5 同雇主 6 个月)| 「TEER category 4 or 5; have a minimum of six months full-time, continuous work experience with the PEI employer」pei_workforce_application_guide.pdf(2026-01 版,文件服务器直取)|

- 排除清单(AAIP/BC/SK 排除集、NB 不受理 overlay)**先于一切判否**;QC 照旧 NON_PNP。
- 粗筛信号,非资格认定(语言/年龄/学历等门槛不进本判定)。
- 已知残留低估(不进本批):TEER0-3 泛通用假设对 MB(SWO 要清单+联结)略宽;NS 餐饮 sector 暂停未建模(暂停≠无路)。

## 3. 验收标准

- [x] `pnp_eligible` 抽查(2026-08-08 实测全过):`65200 T5` MB/NS/PE=true(cond)、NB=false(不受理)、NL=true;`44100 T4` 八省 true、**AB=false(AAIP 排除清单点名,联邦保育兜底归 any_pr_path 管)**;排除清单命中(`12200 T4` BC/SK、`85101 T5` AB)false 不动摇。
- [x] `pnp_direct` 抽查:`65200 T5` NL=true、MB/NS/PE=false;TEER0-3 与排除式省全 direct;清单命中 direct。实测全过。
- [x] 职位板 flag 翻案量落数(08 重跑 diff):**false→true 共 2,791 岗(52,190→54,981 / 75,626)**,
  全落五省 TEER4/5:NS 1,225(T5 654+T4 571)、NL 561、MB 533、NB 319、PE 153。零意外省/意外 TEER。
- [x] 榜A 单元格两行:桌面表格与手机卡片双端落地(手机顺手补了 E13-05 就缺的省份行);无 cond 灰行不出、两档全空「—」。
- [x] 与 E13-08 一致性:492 NOC × 9 省全量断言 `pnp_eligible=true ⊆ any_pr_path=true`,反例 0。
  附:44100 AB 两层各司其职——pnp false(AAIP 排除点名)、any_pr_path true(联邦保育兜底)。
- [ ] 生产换版实测:榜A 两行可见;`/?pnp=yes` 计数变化与翻案量同数量级(整点批跑完后验)。→ 待 Frank 过图 push。

## 4. 实现步骤

- [x] **4.1 ETL 判定** `etl/08_score.py`:两常量 + `pnp_eligible` universal 分支 + `pnp_direct`,锚句注释齐。
- [x] **4.2 拆列** `etl/11_build_stats.py`:direct/cond 两列(492 全国行,cond 非空 134 行)。
- [x] **4.3 SQL** 已代跑生产(幂等;`pnp_provs_cond` exists 回读过)。
- [x] **4.4 seed/读取层**:三处齐,seed 200/155s。
- [x] **4.5 前端**:桌面两行 + 手机卡两行 + i18n 三语;tsc 干净。
- [x] **4.6 文案跟改**(Frank 08-08「文案不需要改一下吗」——三处旧口径写死在字面):
  ① 详情弹框 `ch.pnp.whyOpen`(「不设职业清单」对翻案岗撒谎)→ 分三类:排除式省沿用 / NL 新
  `whyDirect`(offer 即可)/ MB·NS·NB·PE 新 `whyCond`(先同雇主 6 个月);② `ch.pnp.no` 去
  「TEER {teer}」(v2 走不了的原因=排除清单,非 TEER 本身);③ 匹配理由 `match.r.prov.generic`
  (TEER 0-3 字样)→ TEER4-5 拆 `open/nl/cond` 三键。均三语。⚠️ 弹框/匹配的翻案岗实拍要等
  整点批把 jobs 标记刷过之后(生产验收项)。**同批:手机端 NOC 代码改灰胶囊**(OccBoard 卡,
  与通道档药丸并排,Frank 08-08 拍)。
- [x] **4.6b 文案二轮(Frank 08-08 实时走查连拍)**:① 榜题全缩(「部分省无任何移民通道」等,三语);
  ② 两列改「有移民通道的省 / 无移民通道的省」(原「有路可走/走不了」没宾语,用户看不懂);
  ③ 「在架」→「在招」全站术语统一(电商黑话清除,pulse 四处);④ 手机卡 TEER 也上灰胶囊(与 NOC 并排)。
  ⚠️ 通道档药丸「点名」措辞 Frank 收起未拍,原样保留——待他定夺(备选:对齐「紧缺清单」)。
- [x] **4.7 上线**:Frank 过图拍板(含「点名」→「紧缺清单」)→ push `ca36869` → 生产 3 分钟换版
  playwright 实拍:榜A 首行「拿 offer 可 BC、SK、ON、NL / 先省内工作 6 个月 MB、NB、NS、PE」、
  新药丸「省紧缺清单/省+联邦紧缺清单」上屏(`e13-09-prod-desktop-zh.png`)。
- [ ] **4.8 尾验(整点批后)**:jobs 标记翻案 +2,791 落库后复验 `/?pnp=yes` 计数与弹框三分文案
  (whyDirect/whyCond 实拍一个 MB TEER5 岗)。

## 5. 涉及目录 / 文件

`etl/08_score.py` · `etl/11_build_stats.py` · `docs/sql/e13-09-occ-pnp-provs-cond.sql` ·
`cms/src/app/seed/route.ts` · `cms/src/app/(frontend)/stats/{shared,lib}.ts` · `cms/src/app/(frontend)/start/StartView.tsx` · `cms/src/app/(frontend)/jobs/i18n.ts`

## 6. 现有代码 / 备注 + 完成定义(DoD)

- 锚句全部已实取(E13-08 夜 + 本批 PE PDF);crawl 周更雷达已覆盖五省页(mb-mpnp/ns-root/nb-imm/nl-imm;PE 走 PDF,WAF 挡地图爬)。
- `any_pr_path`(E13-08 v2)已按排除清单口径独立实现,本批不动它;一致性断言进验收。
- `channel_tier`/`pnp_stream`/`score()` 语义不变(具名清单维度)。
- **DoD**:验收 6 条全勾;榜A 两行生产可见;flag 翻案量有数;文档如实记录。
