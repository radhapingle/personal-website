"""Job source fetchers. Each returns a list of normalized Job dicts.

Normalized Job schema:
    {
        "id": str,            # stable unique id (source-prefixed)
        "title": str,
        "company": str,
        "locations": list[str],
        "url": str,
        "season": str,        # e.g. "Summer" (may be "")
        "date_posted": int,   # unix seconds (0 if unknown)
        "source": str,
    }
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from typing import Any

from . import config

USER_AGENT = "job-alerts/1.0 (+https://github.com/rpingle06/personal-website)"


def _get_json(url: str, timeout: int = 30) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    ctx = config.make_ssl_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_vanshb03() -> list[dict]:
    """Fetch the cvrve-schema Summer 2027 internship list."""
    cfg = config.SOURCES["vanshb03"]
    if not cfg.get("enabled"):
        return []
    try:
        raw = _get_json(cfg["url"])
    except Exception as exc:  # noqa: BLE001 - never let one source kill the run
        print(f"[vanshb03] fetch failed: {exc}")
        return []

    jobs: list[dict] = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        # Skip closed / hidden rows.
        if row.get("active") is False or row.get("is_visible") is False:
            continue
        jobs.append(
            {
                "id": f"vanshb03:{row.get('id') or row.get('url')}",
                "title": (row.get("title") or "").strip(),
                "company": (row.get("company_name") or "").strip(),
                "locations": [l for l in (row.get("locations") or []) if l],
                "url": (row.get("url") or "").strip(),
                "season": (row.get("season") or "").strip(),
                "date_posted": int(row.get("date_posted") or 0),
                "source": "vanshb03",
            }
        )
    print(f"[vanshb03] {len(jobs)} active postings fetched")
    return jobs


def fetch_adzuna() -> list[dict]:
    """Optional broad feed. Enabled only when Adzuna credentials are present."""
    cfg = config.SOURCES["adzuna"]
    if not cfg.get("enabled"):
        return []

    jobs: list[dict] = []
    seen_ids: set[str] = set()
    base = f"https://api.adzuna.com/v1/api/jobs/{cfg['country']}/search/1"
    for query in cfg["queries"]:
        params = {
            "app_id": cfg["app_id"],
            "app_key": cfg["app_key"],
            "what": query,
            "results_per_page": "50",
            "content-type": "application/json",
        }
        url = f"{base}?{urllib.parse.urlencode(params)}"
        try:
            data = _get_json(url)
        except Exception as exc:  # noqa: BLE001
            print(f"[adzuna] query '{query}' failed: {exc}")
            continue
        for row in data.get("results", []):
            jid = f"adzuna:{row.get('id')}"
            if jid in seen_ids:
                continue
            seen_ids.add(jid)
            loc = row.get("location", {}) or {}
            jobs.append(
                {
                    "id": jid,
                    "title": (row.get("title") or "").strip(),
                    "company": ((row.get("company") or {}).get("display_name") or "").strip(),
                    "locations": loc.get("area", []) or [loc.get("display_name", "")],
                    "url": (row.get("redirect_url") or "").strip(),
                    "season": "",
                    "date_posted": 0,
                    "source": "adzuna",
                }
            )
    print(f"[adzuna] {len(jobs)} postings fetched")
    return jobs


def fetch_all() -> list[dict]:
    jobs: list[dict] = []
    jobs += fetch_vanshb03()
    jobs += fetch_adzuna()
    # De-duplicate by id across sources.
    dedup: dict[str, dict] = {}
    for job in jobs:
        if job["id"] not in dedup:
            dedup[job["id"]] = job
    return list(dedup.values())
