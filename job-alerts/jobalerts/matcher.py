"""Relevance scoring + season/location filtering."""

from __future__ import annotations

import re

from . import config

_YEAR_RE = re.compile(r"\b(20\d{2})\b")


def _haystack(job: dict) -> str:
    parts = [job.get("title", ""), " ".join(job.get("locations", []))]
    return (" " + " ".join(parts) + " ").lower()


def matched_year(job: dict) -> str | None:
    for field in (job.get("title", ""), job.get("url", "")):
        m = _YEAR_RE.search(field or "")
        if m:
            return m.group(1)
    return None


def passes_season(job: dict) -> bool:
    season = (job.get("season") or "").strip().lower()
    year = matched_year(job)

    season_ok = (season in config.TARGET_SEASONS) if season else False
    # Titles frequently encode the season too, e.g. "... Summer 2027 ...".
    title = job.get("title", "").lower()
    if not season_ok:
        season_ok = any(s in title for s in config.TARGET_SEASONS)

    if not season_ok:
        return False

    if year is not None:
        return year in config.TARGET_YEARS
    return config.KEEP_SEASON_MATCH_WITHOUT_YEAR


def passes_location(job: dict) -> bool:
    if not config.REQUIRE_US:
        return True
    locs = " ".join(job.get("locations", [])).lower()
    if not locs:
        return True  # unknown -> don't drop
    if "remote" in locs:
        return True
    if any(hint in locs for hint in config.NON_US_HINTS):
        # Only drop if it looks exclusively non-US.
        has_us = any(pl in locs for pl in config.PREFERRED_LOCATIONS)
        return has_us
    return True


def score(job: dict) -> tuple[float, list[str]]:
    """Return (score, matched_group_names)."""
    hay = _haystack(job)
    total = 0.0
    groups: list[str] = []

    for group_name, kws in config.KEYWORD_GROUPS.items():
        best = 0.0
        for kw, weight in kws.items():
            if kw in hay and weight > best:
                best = weight
        if best > 0:
            total += best
            groups.append(group_name)

    for kw, penalty in config.NEGATIVE_KEYWORDS.items():
        if kw in hay:
            total += penalty

    # Small bonus for preferred locations.
    if any(pl in hay for pl in config.PREFERRED_LOCATIONS):
        total += 0.5

    return round(total, 2), groups


def evaluate(job: dict) -> dict | None:
    """Return an enriched job dict if it is relevant, else None."""
    if not passes_season(job):
        return None
    if not passes_location(job):
        return None
    sc, groups = score(job)
    if sc < config.MIN_SCORE:
        return None
    enriched = dict(job)
    enriched["score"] = sc
    enriched["matched"] = groups
    return enriched


def relevant_jobs(jobs: list[dict]) -> list[dict]:
    out = [e for e in (evaluate(j) for j in jobs) if e is not None]
    out.sort(key=lambda j: (j["score"], j.get("date_posted", 0)), reverse=True)
    return out
