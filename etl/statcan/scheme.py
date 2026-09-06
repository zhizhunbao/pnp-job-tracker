"""
statcan 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 ircc/scheme.py 与 ee/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types,域目录=脚本
sys.path[0] 时 httpx/bs4 内部 import types 当场炸)。
本域形状两档:
① **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体(不是外来数据,不上 pydantic);
② **多返回值收编 XxxOut** = dataclass —— 原来 `return a, b` 的元组一律收成具名格。
产出行不上 pydantic:raw/statcan/*.json 与 raw/ircc/npr_share.json 等**逐格顺序即文件契约**
(契约 docs/design/把脉页省份段-契约-20260906.md §1),行构造留在 functions 的各段里按 K_ 键
逐格写全,校验靠各步自校硬闸。
2026-09-06 立域:段3/段4 的形状自 etl/ircc/scheme.py **原样搬来**(docstring 一字未改);
段2/段5 是新写。
import 只有标准库(叶子律:形状本域自声明,零跨域)。
"""
from dataclasses import dataclass


# =========================================================================
# 1. 共享词汇(本域无跨段形状:落盘日戳等是零参/单标量函数)
# =========================================================================


# =========================================================================
# 2. WDS 通用取数
# =========================================================================


@dataclass
class DimMembers:
    """一个维度的成员表(按 dimensionPositionId 排好序后的第 i 维)。"""

    name: str
    """维度英文名(dimensionNameEn,CUBES 按它点名)。"""

    ids: dict
    """成员英文名 → memberId。"""


@dataclass
class CubeMeta:
    """wds_meta() 出参:一张表的元数据(标题 + 按位排序的维度成员表)。"""

    title: str
    """官方英文表名(cubeTitleEn;落盘 title,也是 crawl 页行的标题)。"""

    dims: list
    """维度清单(DimMembers,下标即坐标段位)。"""


@dataclass
class WdsDataIn:
    """wds_data() 入参:一张表的全部坐标请求(一发全取)。"""

    requests: list
    """WDS 请求行清单(productId / coordinate / latestN)。"""


@dataclass
class WdsDataOut:
    """wds_data() 出参:解好的响应块 + 响应原文(原文进 crawl 层)。"""

    blocks: list
    """WDS 响应块清单(**不按请求顺序**回来,靠块自带 coordinate 反解)。"""

    text: str
    """响应原文(put_cached_page 落 crawl/statcan/)。"""


# =========================================================================
# 3. NPR 占总人口比
# =========================================================================


@dataclass
class NprRowsIn:
    """npr_rows_of() 入参:两条序列(总人口 / NPR)。"""

    pop: dict
    """季度参考日 → 总人口。"""

    npr: dict
    """季度参考日 → 非永久居民数。"""


@dataclass
class QuartersIn:
    """quarters_to_target_of() 入参。"""

    share: float
    """最新一季的占比。"""

    per_q: float
    """每季度变化(负=在降)。"""


# =========================================================================
# 4. StatCan 分省临时居民存量
# =========================================================================


@dataclass
class MemberIds:
    """member_ids() 出参(原 (geo, typ) 元组收编)。"""

    geo: dict
    """省码 → StatCan memberId。"""

    types: dict
    """证型键 → StatCan memberId。"""


@dataclass
class CoordIn:
    """coord_of() 入参:WDS 坐标的前两维。"""

    geo: int
    """省的 memberId。"""

    typ: int
    """证型的 memberId。"""


@dataclass
class ByProvIn:
    """tr_prov_by_prov() 入参:响应块 + 成员 id(响应乱序,靠 id 反解)。"""

    blocks: list
    """WDS 响应块清单。"""

    ids: MemberIds
    """请求时用的成员 id。"""


# =========================================================================
# 5. 表清单取数
# =========================================================================


@dataclass
class DimOfIn:
    """dim_of() 入参:按名字在元数据里取一维(取不到即报「表改版」)。"""

    meta: CubeMeta
    """该表的元数据。"""

    name: str
    """维度英文名。"""

    pid: int
    """表号(只为报错话里带上)。"""


@dataclass
class MemberIdIn:
    """member_id_of() 入参:按名字在一维里取成员 id(取不到即报「表改版」)。"""

    dim: DimMembers
    """维度成员表。"""

    member: str
    """成员英文名(逐字,不猜近似名)。"""

    pid: int
    """表号(只为报错话里带上)。"""


@dataclass
class GeoIdsIn:
    """cube_geo_ids() 入参:从 Geography 维解出 CA + 十省的 memberId。"""

    dim: DimMembers
    """Geography 维的成员表。"""

    pid: int
    """表号(只为报错话里带上)。"""


@dataclass
class SigIn:
    """sig_of() 入参:坐标里「除地理外」的成员 id 签名(反解输出键的钥匙)。"""

    parts: list
    """坐标各段(请求侧是 id 清单,响应侧是切开的字符串;两侧都归一成整数比)。"""

    skip: int
    """地理维在坐标里的段位(签名里剔掉它)。"""

    dims: int
    """该表真实维数(响应坐标恒十段,尾部补零段不进签名)。"""


@dataclass
class CubePlanIn:
    """cube_plan() 入参:一张表的取数计划要的两样(清单行 + 元数据)。"""

    cube: dict
    """CUBES 里的一行。"""

    meta: CubeMeta
    """该表的元数据。"""


@dataclass
class CubePlanOut:
    """cube_plan() 出参:请求清单 + 反解响应要的三张表。"""

    requests: list
    """WDS 请求行清单(geo × 输出键 的笛卡尔积)。"""

    geo_of: dict
    """Geography memberId → geo 码。"""

    key_of: dict
    """非地理成员 id 签名 → 输出键。"""

    geo_pos: int
    """Geography 维在坐标里的段位。"""

    dims: int
    """该表真实维数。"""


@dataclass
class CubePointsIn:
    """cube_by_geo() 入参:响应块 + 取数计划(块乱序,靠计划反解)。"""

    blocks: list
    """WDS 响应块清单。"""

    plan: CubePlanOut
    """本表的取数计划。"""

    pid: int
    """表号(只为报错话里带上)。"""


@dataclass
class LabelsIn:
    """series_labels_of() 入参:输出键 → 成员名标签(单维表退回表名)。"""

    cube: dict
    """CUBES 里的一行。"""

    meta: CubeMeta
    """该表的元数据(维度顺序即标签里成员名的拼接顺序;单维表用它的 title)。"""


@dataclass
class CubeCheckIn:
    """check_cube() 入参:自校(CA/ON 必须有点 + ON 最新期的量级线)。"""

    cube: dict
    """CUBES 里的一行(带 probe)。"""

    by_geo: dict
    """本轮解出的 geo → 期 → {输出键: 值}。"""


@dataclass
class CubeDocIn:
    """to_cube_doc() 入参:落盘表的各格(键序即文件契约)。"""

    cube: dict
    """CUBES 里的一行。"""

    meta: CubeMeta
    """该表的元数据(取 title)。"""

    by_geo: dict
    """geo → 期 → {输出键: 值}。"""

    fetched: str
    """本轮抓取日。"""
