"""Dedupe store: tracks which posting ids have already been emailed."""

from __future__ import annotations

import json
import os

from . import config


def load_seen() -> set[str]:
    path = config.STATE_PATH
    if not os.path.exists(path):
        return set()
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return set(data.get("seen_ids", []))
    except Exception as exc:  # noqa: BLE001
        print(f"[state] could not read {path}: {exc}; starting fresh")
        return set()


def save_seen(seen: set[str]) -> None:
    path = config.STATE_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    payload = {"seen_ids": sorted(seen)}
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)
        fh.write("\n")
