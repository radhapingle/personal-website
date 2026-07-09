#!/usr/bin/env python3
"""Entrypoint for the Summer 2027 job-alert system.

Usage:
    python run.py            # fetch, find NEW relevant jobs, email them
    python run.py --seed     # mark all current matches as seen WITHOUT emailing
                             #   (run once at setup so you don't get a huge first email)
    python run.py --dry-run  # print matches, don't email, don't update state
    python run.py --all      # ignore the "seen" store; show every current match
"""

from __future__ import annotations

import argparse
import sys

from jobalerts import config, emailer, matcher, sources, state


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Summer 2027 job alerts")
    parser.add_argument("--seed", action="store_true",
                        help="mark current matches as seen without emailing")
    parser.add_argument("--dry-run", action="store_true",
                        help="print matches without emailing or updating state")
    parser.add_argument("--all", action="store_true",
                        help="ignore the seen store (show all current matches)")
    args = parser.parse_args(argv)

    print("Fetching postings...")
    all_jobs = sources.fetch_all()
    print(f"Total postings fetched: {len(all_jobs)}")

    relevant = matcher.relevant_jobs(all_jobs)
    print(f"Relevant to profile (score >= {config.MIN_SCORE}): {len(relevant)}")

    seen = state.load_seen()

    if args.all:
        new_jobs = relevant
    else:
        new_jobs = [j for j in relevant if j["id"] not in seen]
    print(f"New (not previously seen): {len(new_jobs)}")

    # ------------------------------------------------------------------ seed
    if args.seed:
        for j in relevant:
            seen.add(j["id"])
        state.save_seen(seen)
        print(f"Seeded {len(relevant)} matches as seen. No email sent.")
        return 0

    # --------------------------------------------------------------- dry-run
    if args.dry_run:
        for j in new_jobs[: config.MAX_JOBS_PER_EMAIL]:
            locs = ", ".join(j.get("locations", [])) or "N/A"
            print(f"  [{j['score']:>4}] {j['title']} @ {j['company']} ({locs})")
            print(f"         {j['url']}  {j['matched']}")
        print("(dry-run: nothing emailed, state unchanged)")
        return 0

    # ------------------------------------------------------------- normal run
    if not new_jobs:
        print("No new matches. Nothing to send.")
        return 0

    to_send = new_jobs[: config.MAX_JOBS_PER_EMAIL]
    try:
        emailer.send(to_send)
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR sending email: {exc}", file=sys.stderr)
        return 1

    # Only mark as seen after a successful send.
    for j in new_jobs:
        seen.add(j["id"])
    state.save_seen(seen)
    print(f"Done. Emailed {len(to_send)} job(s); state updated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
