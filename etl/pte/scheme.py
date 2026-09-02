"""pte.scheme — 形状(题型分组 Group / 整库装配入参 BankIn)。

2026-09-01 立域。抓取客户端形状复用 fetch 域的 HttpClientLike(叶子零依赖,
装配点直喂真 httpx 客户端);本域只声明自己的产出形状。全 dataclass(属性访问,
json 键只在 functions 的 to_* 行构造器里出现)。
"""
from dataclasses import dataclass


@dataclass
class Group:
    """一个题型分组(bundle 里一个 `const r=[…]` 数据模块的解析结果)。"""

    label: str
    """best-effort 人话标签;拿不准 = 空串(靠 signature + array_index 人工核)。"""

    signature: str
    """字段签名 = 首题排序键名 join(题型指纹)。"""

    array_index: int
    """bundle 内数组序号(标签留空时定位用)。"""

    questions: list
    """本组题目(原样 dict,私有研究不做二次清洗)。"""


@dataclass
class BankIn:
    """to_bank() 入参(整库产物装配)。"""

    bundle_url: str
    """bundle 地址(出处)。"""

    fetched: str
    """抓取日期(ISO)。"""

    groups: list
    """全部分组(Group 清单)。"""


@dataclass
class CloseIn:
    """close_index_of() 入参(bracket 配平)。"""

    src: str
    """bundle 全文。"""

    start: int
    """起始 `[` 的下标。"""


@dataclass
class GroupIn:
    """group_of() 入参(一个数据模块 → Group)。"""

    array_index: int
    """bundle 内数组序号。"""

    questions: list
    """已解析的题目清单(非空,run 已滤空)。"""


@dataclass
class SnapshotIn:
    """snapshot_bundle() 入参(bundle 原文留痕)。"""

    url: str
    """bundle 地址(抽 hash 命名)。"""

    text: str
    """bundle 原文。"""


@dataclass
class DiffIn:
    """diff_of() 入参(本轮 vs 上轮,按题型签名 + 题 id 比对)。"""

    prev_groups: list
    """上一轮分组清单(基准)。"""

    cur_groups: list
    """本轮分组清单。"""


@dataclass
class RadarIn:
    """radar() 入参(机经雷达一轮:读旧库当基准 → diff → 写 prev/changes)。
    2026-09-01 路径入参化:ptebank 第二源接入,ynwac/ptebank 共用一个 radar 实现(行为不复制)。"""

    cur_payload: dict
    """本轮整库产物(to_bank/to_pb_bank 出品;写盘前先过雷达)。"""

    bank: object
    """现行库 Path(旧库 = diff 基准;不存在 = 首轮建档)。"""

    prev: object
    """基准落盘 Path(写新库前旧库挪这)。"""

    changes: object
    """变更落盘 Path(新题/消失题清单)。"""


@dataclass
class VoteGetIn:
    """vote_get() 入参(登录态一发 GET)。"""

    client: object
    """带 Authorization 头的 httpx 客户端(装配点直喂,本域只 .get)。"""

    url: str
    """目标 API 地址。"""


@dataclass
class CollectIn:
    """collect_code() 入参(一个题型代码从 id=1 探到头)。"""

    client: object
    """带鉴权头的客户端。"""

    code: str
    """题型代码(候选表里的一个)。"""


@dataclass
class PbRowIn:
    """to_pb_row() 入参(一条 WP 帖 → 洗净 row;ptebank 第二源)。"""

    post: dict
    """WP 帖原始对象(_fields 收窄后的格)。"""

    cats: dict
    """分类映射 {id: {slug, name}}(id 换译 slug 用)。"""


@dataclass
class PbGroupsIn:
    """pb_groups_of() 入参(全部 row → 按分类 slug 集分组)。"""

    rows: list
    """洗净 row 清单(to_pb_row 出品)。"""

    cats: dict
    """分类映射 {id: {slug, name}}(组 label 取人话名用)。"""


@dataclass
class PbBankIn:
    """to_pb_bank() 入参(ptebank 整库产物装配)。"""

    fetched: str
    """抓取日期(ISO)。"""

    groups: list
    """全部分组(pb_groups_of 出品的组 dict 清单)。"""
