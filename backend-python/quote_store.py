from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


PANAMA_TZ = ZoneInfo("America/Panama")


def next_quote_reference(
    now: datetime | None = None,
    database_path: str | Path | None = None,
) -> str:
    local_now = (now or datetime.now(PANAMA_TZ)).astimezone(PANAMA_TZ)
    year = local_now.year
    path = Path(
        database_path
        or os.environ.get("QUOTE_DB_PATH", "/tmp/hedman-quotes.sqlite3")
    )
    path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(path, timeout=20)
    try:
        connection.execute("PRAGMA busy_timeout = 20000")
        connection.execute(
            "CREATE TABLE IF NOT EXISTS quote_counters "
            "(year INTEGER PRIMARY KEY, last_number INTEGER NOT NULL)"
        )
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute(
            "SELECT last_number FROM quote_counters WHERE year = ?",
            (year,),
        ).fetchone()
        next_number = (row[0] if row else 0) + 1
        connection.execute(
            "INSERT INTO quote_counters(year, last_number) VALUES(?, ?) "
            "ON CONFLICT(year) DO UPDATE SET last_number = excluded.last_number",
            (year, next_number),
        )
        connection.commit()
        return f"COT-{year}-{next_number:04d}"
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
