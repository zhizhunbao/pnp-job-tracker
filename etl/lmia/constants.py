"""
lmia 域常量 —— 域词汇表(五件全溶,照样张 etl/company/;2026-08-30 批D)。

原 build_esdc_lmia_employers.py 的 CKAN_PKG / IN_XLSX_DIR / OUT_TABLE / 两条正则原样搬来,
函数体字面量(列名判词、文案 f-string、超时、探针名)同批提名。
唯一特批 import = `paths`(件套以 lmia.constants 包名被引,门先把 etl/ 摆上路径)。

源(免费,季度更新,加拿大开放政府许可;E6-02):
  https://open.canada.ca/data/en/dataset/90fed587-1364-4f33-a9ee-208181dc0b97
列(实查 2025Q4):Province/Territory · Program Stream · Employer · Address ·
  Occupation(NOC 码-名)· Incorporate Status · Approved LMIAs · Approved Positions。
语义红线(实现文档 §0):产出的是「雇主雇过外国人的历史事实」,不是「能担保」判定;
聚合保留股别/季度/职位数,展示层必须带这些语境。
"""
import re
from pathlib import Path

import paths

CKAN_PKG = ("https://open.canada.ca/data/api/action/package_show"
            "?id=90fed587-1364-4f33-a9ee-208181dc0b97")
"""输入①:CKAN 包详情(列出各季度 xlsx 资源 URL)。"""

IN_XLSX_DIR = paths.LMIA
"""输入②:季度源缓存 tfwp_YYYYqN_pos_en.xlsx(gitignore,已缓存季度不重下)。"""

OUT_TABLE = paths.LMIA / "lmia-employers.json"
"""输出:按雇主聚合的维护表(gitignore,可由缓存重建;09 消费)。"""

NORM_MODULE_NAME = "flag_aip"
"""norm_name 宿主模块的 importlib 名(沿用旧名:原宿主 clean/05c_flag_aip.py 数字开头,
常规 import 拉不动才走 importlib;2026-08-31 批H2 宿主归户成 aip/flag_aip_jobs.py 后
常规 import 拉得动了,但那会变成 lmia → aip 的域间 import(check_shape 硬红),
故仍走 importlib 按路径拉,模块名保持不变。"""

NORM_MODULE_PATH = Path(__file__).resolve().parent.parent / "aip" / "flag_aip_jobs.py"
"""聚合键 = norm_name(与 AIP 匹配同一把尺子,mart join 时对 companies 用同一函数)——
单一来源住宿主文件,这里只拉不复制。2026-08-31 批H2 宿主从 etl/clean/05c_flag_aip.py
迁到 etl/aip/flag_aip_jobs.py(clean 横切层清算,「谁的数据谁管」),本常量随迁改路径;
函数体一字未动,聚合键口径不变。
⚠ 这条边(lmia 读 aip 域的一个文件)是**待判的收拢账**:norm_name 现有三个消费者
(aip 自己打标、lmia 聚合键、mart 汇装 join),按「数消费者」判据够格抽成基础设施叶子,
但抽哪、叫什么归 Frank 拍 —— 批H2 只搬家不收拢。"""

ENV_KEEP_QUARTERS = "LMIA_QUARTERS"
"""保留季度数的环境键(LMIA_QUARTERS=12 可扩窗)。"""

KEEP_QUARTERS_DEFAULT = "8"
"""只取近 N 个季度(默认 8,约两年)—— 更老的雇佣史对「现在还愿不愿意」的证据价值衰减。"""

QUARTER_RE = re.compile(r"tfwp_(\d{4}q\d)_pos_en\.xlsx$", re.I)
"""从资源 URL 认季度(只要 *_pos_en.xlsx 那一份)。"""

NOC_RE = re.compile(r"^(\d{4,5})")
"""Occupation 形如 "63200-Cooks",取前缀数字当 NOC。"""

SKILLED_STREAM_RE = re.compile(r"high wage|global talent|permanent resident", re.I)
"""技能类口径(榜单排序用):只计 High Wage / Global Talent / PR-only 三股 ——
Low Wage(鱼厂/快餐百人计)与农业/SAWP 会淹没技能类担保榜;PR-only 股=为支持 PR 申请
办的 LMIA,最强移民信号。"""

HEADER_FIRST_COL = "Province"
"""表头行的首列判词(表头在第 2 行,前面是标题/空行)。"""

MIN_CELLS = 8
"""一行至少这么多格才是数据行(尾部注释行不足此数)。"""

CKAN_TIMEOUT_S = 60
"""CKAN 包详情超时。"""

DOWNLOAD_TIMEOUT_S = 180
"""季度 xlsx 下载超时(单份 0.5-1.4MB,慢在服务端)。"""

XLSX_NAME_TPL = "tfwp_{quarter}_pos_en.xlsx"
"""季度缓存文件名(季度小写)。"""

TEXT_ENCODING = "utf-8"
"""落盘编码。"""

JSON_COMPACT = (",", ":")
"""紧凑分隔符:本表 16MB 级,缩进会白涨几倍体积(沿用原值,未走 paths.write_json ——
它只支持 indent,见交付报告的收口项)。"""

SOURCE_LABEL = "ESDC TFWP positive LMIA employers (open.canada.ca 90fed587)"
"""产出表的出处标注(消费端展示语境用)。"""

IN_TPL = "IN:  {dir}  (近 {n} 季度: {first}..{last})"
"""输入路径报行。"""

OUT_TPL = "OUT: {path}"
"""输出路径报行。"""

DOWNLOAD_TPL = "下载 {quarter}: {url}"
"""季度源下载行(已缓存则不打)。"""

QUARTER_TPL = "  {quarter}: {n} 行"
"""单季解析报行。"""

DONE_TPL = "建表完成:{n} 个雇主 → {name} ({mb:.1f} MB)"
"""收口报行。"""

PROBE_NAMES = ("tim hortons", "google canada", "maple leaf foods")
"""收口探针雇主名(一个必中、两个常缺,看聚合键有没有跑偏)。"""

PROBE_HIT_TPL = "  探针 [{probe}]: ✓ {positions} 职位/{quarter}"
"""探针命中行。"""

PROBE_MISS_TPL = "  探针 [{probe}]: —"
"""探针未命中行。"""
