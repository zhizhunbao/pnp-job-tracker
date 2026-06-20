# PNP Job Tracker

每日更新、按移民价值评分的加拿大科技职位追踪器。识别 **地域 / NOC / 是否指定雇主 / 移民通道 / 政策文件 / 官网 / 投递链接**，面向"雇主 offer 省提名"路线。

> 完整产品设计见 **[prd.md](prd.md)**。

## 安装

```bash
uv venv && uv pip install -e .          # 或 uv sync
```

## 流水线（脚本在 scripts/jobs/）

| 阶段 | 脚本 | 产出 |
|---|---|---|
| 公司目录穷举 | `kanata_north_directory.py` | `data/companies/kanata-north.*` |
| 一公司一文件夹 | `build_company_folders.py` | `data/companies/<region>/<slug>/` |
| careers + ATS 定位 | `careers_finder.py` | `…/careers.json` |
| ATS 真实在招岗 | `ats_jobs.py` | `…/jobs.json` |
| Job Bank 多源 | `jobbank_scraper.py` | `data/jobs/jobbank-*.json` |
| AIP 指定雇主名单 | `aip_designated_employers.py` | `data/companies/aip-designated-employers.*` |
| 富化 + 评分（待建） | `enrich.py` `score.py` | `data/jobs/latest.md` |
| 每日编排（待建） | `daily.py` | `data/jobs/daily/<date>.*` |

## 数据

- `data/companies/<region>/<slug>/` — 一公司一文件夹（profile/careers/jobs/linkedin/indeed）
- `data/crawl/*-immigration/` — 移民政策原文（供政策关联 + NL 指定雇主解析）
- `data/sources/valuable-urls.md` — 数据源总索引

## 状态

端到端跑通 Stage 1-3（渥太华 Kanata North）。下一步：`enrich.py` + `score.py`（NOC/指定雇主/通道/政策 + 评分）。详见 prd.md §10。
