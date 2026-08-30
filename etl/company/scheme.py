"""
company 域行形状(三件套形制**全站样张**,2026-08-30)。

⚠ 抽屉名 Python 方言定 **scheme.py** 不叫 types.py(2026-08-30 两拍):types.py 会遮蔽
标准库 types 模块(域目录=脚本 sys.path[0],httpx/bs4 内部 import types 当场炸,实撞);
名字 Frank 拍 scheme(压过 shapes 提议)。cms 侧照旧 types.ts,这是两方言唯一的名字分叉;
运行时校验若来,另开抽屉不占此名。

进这个文件的判据:**形状被本域 ≥2 个文件共摸**。目录行 CompanyRow 由
scrape_kanata_directory 写、folders/careers/enrich 读 —— 四文件同一形,够格。
enrich 自己的缓存记录形状是单消费者,留在它文件里。
本文件只许 import typing/标准库(叶子不 import 业务件,cms 同律)。
"""
from typing import TypedDict


class CompanyRow(TypedDict):
    """公司目录一行(raw/companies/kanata-north.json 的元素;目录站抓下来的原样九格)。

    total=True:目录抓取时九格全写(空值写空串,不缺席)—— 消费端不必防缺键;
    careers 阶段回写 careers_page/ats 等增补格时仍是这九格打底。
    """

    name: str
    """公司名(目录站原文)。"""

    website: str
    """官网 URL;目录没给则空串。"""

    email: str
    """联系邮箱;可能空串(个人信息,只进 Admin 不公开展示)。"""

    phone: str
    """联系电话;可能空串(同上)。"""

    sectors: str
    """行业标签原文(目录站的分类字符串,is_tech 的判据原料之一)。"""

    address: str
    """街道地址原文;可能空串。"""

    careers_page: str
    """careers 页 URL;scrape_company_careers 补写,抓不到为空串。"""

    description: str
    """公司简介原文(is_tech 的判据原料之二)。"""

    region: str
    """地域标识(如 kanata-north;数据分层「区」级)。"""

class CareersProbe(TypedDict):
    """careers 定位一步的结果行(careers 段写、一司一档段读 —— 两段共摸,入册)。"""

    careers_url: str
    """招聘页 URL;没找到为空串。"""

    ats: str
    """识别出的 ATS 平台名(greenhouse/lever/…);自建或未知为空串。"""

    status: str
    """首页 HTTP 状态码,或 "ERR <异常名>"。"""

    note: str
    """备注(如 no careers page found);无事为空串。"""


class EnrichRecord(TypedDict, total=False):
    """官网富化缓存一行(processed/company_enrich.json 的值;对外文件契约 —— 09 汇装直读)。

    total=False:这是归一前形状 —— 各格按抓取阶段渐进出现(found 只有找官网命中才有,
    description/sectors 只有 status=ok 才有),缺席=那一步没走到,如实保留。
    """

    name: str
    """公司名(postings 里的 employer 原文)。"""

    website: str
    """官网 URL(自带或找官网命中)。"""

    found: str
    """官网来路:jd(JD 正文线索)| searched(DDG 搜索)—— mart 透传给前端小字。"""

    status: str
    """found(刚找到官网待抓)| ok(抓到简介)| fail(抓不到)| nosite(找不到官网,冷却)。"""

    note: str
    """失败原因(no meta / http 4xx / 异常名)。"""

    fetched: str
    """本记录的产出时刻(ISO,UTC);增量与冷却都按它算。"""

    description: str
    """官网简介(og:description / meta description / 首个长 <p>,截 DESC_LEN_MAX)。"""

    sectors: str
    """行业词(meta keywords 前四个)。"""

