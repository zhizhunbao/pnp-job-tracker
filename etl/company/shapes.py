"""
company 域行形状(三件套形制**全站样张**,2026-08-30)。

⚠ 抽屉名 Python 方言定 **shapes.py** 不叫 types.py(2026-08-30 实撞):域目录是脚本的
sys.path[0],types.py 会遮蔽标准库 types 模块 —— 进程里 httpx/bs4 内部 import types
拿到我们的文件当场炸。cms 侧照旧 types.ts,这是两种方言唯一的名字分叉。

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
