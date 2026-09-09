#!/usr/bin/env python3
"""Persist a monotonic lifetime visit count from Umami's monthly totals."""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = ROOT / "data" / "visitor-count.json"
API_BASE = os.environ.get(
    "UMAMI_API_BASE", "https://cloud.umami.is/analytics/us/api"
).rstrip("/")
SHARE_ID = os.environ.get("UMAMI_SHARE_ID", "25j9UgiLIg8fd51W")
METRIC = "visits"
LOOKBACK_MONTHS = 6


def fetch_json(url, headers=None):
    request = Request(
        url,
        headers={"User-Agent": "Spheriverse-lifetime-counter", **(headers or {})},
    )
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def shifted_month(anchor, offset):
    month_index = anchor.year * 12 + anchor.month - 1 + offset
    return datetime(
        month_index // 12,
        month_index % 12 + 1,
        1,
        tzinfo=timezone.utc,
    )


def milliseconds(value):
    return int(value.timestamp() * 1000)


def load_state():
    if not STATE_PATH.exists():
        return {"schemaVersion": 1, "metric": METRIC, "months": {}, "total": 0}
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def parse_timestamp(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def main():
    now = datetime.now(timezone.utc)
    previous = load_state()
    months = {
        str(key): max(0, int(value))
        for key, value in previous.get("months", {}).items()
    }

    share = fetch_json(f"{API_BASE}/share/{SHARE_ID}")
    website_id = share["websiteId"]
    api_headers = {
        "x-umami-share-token": share["token"],
        "x-umami-share-context": "1",
    }

    successful_queries = 0
    for offset in range(-(LOOKBACK_MONTHS - 1), 1):
        start = shifted_month(now, offset)
        end = min(shifted_month(now, offset + 1), now)
        query = urlencode({"startAt": milliseconds(start), "endAt": milliseconds(end)})
        url = f"{API_BASE}/websites/{website_id}/stats?{query}"

        try:
            stats = fetch_json(url, api_headers)
        except (HTTPError, URLError, TimeoutError) as error:
            print(f"warning: unable to read {start:%Y-%m}: {error}", file=sys.stderr)
            continue

        successful_queries += 1
        key = start.strftime("%Y-%m")
        observed = max(0, int(stats.get(METRIC, 0)))
        archived = months.get(key, 0)

        # Never reduce an archived month when Umami's retention window moves on.
        if observed > 0 or key in months or offset == 0:
            months[key] = max(archived, observed)

    if successful_queries == 0:
        raise RuntimeError("No Umami monthly statistics could be retrieved")

    current = {
        "schemaVersion": 1,
        "metric": METRIC,
        "months": dict(sorted(months.items())),
        "total": sum(months.values()),
    }
    comparable_previous = {
        "schemaVersion": previous.get("schemaVersion", 1),
        "metric": previous.get("metric", METRIC),
        "months": previous.get("months", {}),
        "total": previous.get("total", 0),
    }

    counts_changed = current != comparable_previous
    last_checked = parse_timestamp(previous.get("checkedAt"))
    heartbeat_due = last_checked is None or now - last_checked >= timedelta(days=30)

    if not counts_changed and not heartbeat_due:
        print(f"Lifetime {METRIC} unchanged at {current['total']}")
        return

    timestamp = now.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    current["updatedAt"] = timestamp if counts_changed else previous.get("updatedAt", timestamp)
    current["checkedAt"] = timestamp
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(
        json.dumps(current, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )
    action = "updated" if counts_changed else "verified"
    print(f"Lifetime {METRIC} {action} at {current['total']}")


if __name__ == "__main__":
    main()
