"""
fsa 域函数(2026-08-31 批C 全溶,原 build_geonames_fsa_districts.py 整件收编;
行为逐字不变,金标 = 产出 byte-identical,产出无时间戳全确定)。
"""
import json

from fsa.constants import (
    CA_PREFIX, DONE_TPL, ENC_UTF8, FSA_LEN, HOOD_SEP_RE, IN_GEONAMES, IN_LINE_TPL, MIN_FIELDS,
    OUT_LINE_TPL, OUT_TABLE, PLACE_RE, TAB,
)
from fsa.scheme import PlaceIn
from log.functions import say
from paths import WriteTextIn, write_text


def build_districts() -> None:
    """GeoNames CA.txt → fsa-districts.json(FSA→区维度表;入口,门直调)。"""
    say(IN_LINE_TPL.format(path=IN_GEONAMES))
    say(OUT_LINE_TPL.format(path=OUT_TABLE))
    table: dict = {}
    for line in IN_GEONAMES.read_text(encoding=ENC_UTF8).splitlines():
        f = line.split(TAB)
        if len(f) < MIN_FIELDS or f[0] != CA_PREFIX:
            continue
        fsa = f[1].strip().upper()
        if len(fsa) != FSA_LEN:
            continue
        table[fsa] = to_district_row(PlaceIn(place=f[2].strip(), prov=f[4].strip()))
    write_text(WriteTextIn(path=OUT_TABLE,
                           text=json.dumps(table, ensure_ascii=False, indent=1,
                                           sort_keys=True)))
    say(DONE_TPL.format(n=len(table)))


def to_district_row(x: PlaceIn) -> dict:
    """一行地名 → 维度行:main = 括号前主名,hood = 括号内第一个社区(无括号则 hood 空)。"""
    m = PLACE_RE.match(x.place)
    if m:
        main = m.group(1).strip()
        hood = HOOD_SEP_RE.split(m.group(2))[0].strip()
    else:
        main = x.place
        hood = ""
    return {"main": main, "hood": hood, "prov": x.prov}
