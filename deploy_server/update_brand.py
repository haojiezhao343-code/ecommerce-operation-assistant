# -*- coding: utf-8 -*-
"""将数据库中「美事堡/美堡」批量替换为「贝克汉堡/贝克」。

遍历库中全部文本列，对含目标字样的列执行 REPLACE 更新，输出各列受影响行数。
用法：python update_brand.py
"""
import os
import sys
from urllib.parse import unquote, urlparse

import pymysql

OLD = [("贝克汉堡", "麦克思汉堡"), ("贝克", "麦克思")]

_url = os.environ["DATABASE_URL"]
_p = urlparse(_url)
conn = pymysql.connect(
    host=_p.hostname or "mysql",
    user=unquote(_p.username or "root"),
    password=unquote(_p.password or ""),
    database=(_p.path or "/ecommerce_operation").lstrip("/"),
    charset="utf8mb4",
)

with conn.cursor() as cur:
    cur.execute(
        "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() AND DATA_TYPE IN ('varchar','text','mediumtext')"
    )
    cols = cur.fetchall()

total = 0
for table, column in cols:
    qcol = f"`{column}`"
    cond = " OR ".join([f"{qcol} LIKE '%{w}%'" for w, _ in OLD])
    set_clause = ", ".join([f"{qcol} = REPLACE({qcol}, '{w}', '{r}')" for w, r in OLD])
    try:
        with conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM `{table}` WHERE {cond}")
            n = cur.fetchone()[0]
            if n:
                cur.execute(f"UPDATE `{table}` SET {set_clause} WHERE {cond}")
                conn.commit()
                print(f"{table}.{column}: {n} rows updated")
                total += n
    except Exception as exc:  # noqa: BLE001
        print(f"{table}.{column}: SKIP ({exc})")
        conn.rollback()

print(f"DONE, total cells updated = {total}")
sys.exit(0)
