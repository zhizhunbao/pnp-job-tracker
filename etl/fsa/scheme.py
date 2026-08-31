"""
fsa 域形状(2026-08-31 批C 全溶;单段小域)。
"""
from dataclasses import dataclass


@dataclass
class PlaceIn:
    """to_district_row 的入参:一行 GeoNames 的地名与省码。"""

    place: str
    """place_name 原文("主名 (社区1 / 社区2 …)" 或裸主名)。"""

    prov: str
    """省码(GeoNames 第 5 格)。"""
