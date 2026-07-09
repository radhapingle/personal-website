# Summer 2027 Job Alerts

Automatically emails **rpingle@andrew.cmu.edu** whenever a new job posting shows
up that looks relevant to Radha's background and interests: data analysis,
product, design/UX, psychology, cognitive science, ML, and research.

It runs in the cloud on a schedule via GitHub Actions — your laptop does **not**
need to be on.

## How it works

1. **Fetch** — pulls current Summer 2027 internship postings from a maintained
   community list (`vanshb03/Summer2027-Internships`), plus an optional broader
   job feed (Adzuna) if you turn it on.
2. **Match** — scores each posting against keywords built from your résumé and
   stated interests (see `jobalerts/config.py`). Only postings scoring at or
   above `MIN_SCORE` (default 2.5) are kept.
3. **Dedupe** — remembers what it already emailed you in `state/seen.json`, so
   you only ever get *new* postings.
4. **Email** — sends a clean HTML digest of the new matches.

## One-time setup (about 5 minutes)

### 1. Create a Gmail App Password (the sender account)

The system sends email through Gmail's SMTP server. You need an **App
Password**, not your normal password.

1. Use any Gmail account as the sender (it can be a throwaway; the alert still
   arrives at `rpingle@andrew.cmu.edu`).
2. Turn on **2-Step Verification**: <https://myaccount.google.com/security>
3. Create an App Password: <https://myaccount.google.com/apppasswords>
   - Name it e.g. "job-alerts". Copy the 16-character password.

### 2. Add GitHub repository secrets

In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**.
Add:

| Secret name     | Value                                            |
| --------------- | ------------------------------------------------ |
| `SMTP_USER`     | the sending Gmail address (e.g. `you@gmail.com`) |
| `SMTP_PASSWORD` | the 16-character App Password from step 1        |

Optional (broader psychology / UX / behavioral roles beyond tech lists):

| Secret name      | Value                                              |
| ---------------- | -------------------------------------------------- |
| `ADZUNA_APP_ID`  | free key from <https://developer.adzuna.com/>      |
| `ADZUNA_APP_KEY` | free key from <https://developer.adzuna.com/>      |

### 3. Seed the first run (so you aren't flooded)

The first real run would otherwise email you *every* current match at once. To
avoid that, do one **seed** run first — it marks everything currently open as
"already seen" without emailing:

- GitHub → **Actions → Job Alerts (Summer 2027) → Run workflow** → set mode to
  **seed** → Run.

From then on you'll only get postings that appear *after* the seed.

> Prefer to receive that first batch instead? Skip the seed and just run in
> **normal** mode once.

That's it. The workflow then runs automatically twice a day.

## Schedule

Defined in `.github/workflows/job-alerts.yml`. Currently ~8 AM and ~6 PM US
Eastern. Change the two `cron` lines to adjust (times are in UTC).

## Running / testing locally

No dependencies — Python 3.9+ standard library only.

```bash
cd job-alerts

# See what it would send, without emailing:
python3 run.py --dry-run

# Send for real (needs the env vars below):
SMTP_USER="you@gmail.com" SMTP_PASSWORD="your-app-password" python3 run.py

# Mark current matches as seen, no email:
python3 run.py --seed

# Ignore the seen store and show every current match:
python3 run.py --all
```

## Tuning what counts as "relevant"

Everything lives in `jobalerts/config.py`:

- `KEYWORD_GROUPS` — the keywords and weights that define relevance. Add roles
  or bump weights for things you care more about.
- `NEGATIVE_KEYWORDS` — titles to push down (sales, hardware, etc.).
- `MIN_SCORE` — raise it for fewer/stricter matches, lower it for more.
- `TARGET_SEASONS` / `TARGET_YEARS` — currently Summer 2027.
- `PREFERRED_LOCATIONS` / `REQUIRE_US` — location preferences.

After editing, run `python3 run.py --dry-run` to preview the effect.

## Files

| File                     | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `run.py`                 | Entry point / CLI                              |
| `jobalerts/sources.py`   | Fetches postings from each source              |
| `jobalerts/matcher.py`   | Scoring + season/location filtering            |
| `jobalerts/config.py`    | All tunable settings (keywords, score, email)  |
| `jobalerts/emailer.py`   | Builds and sends the HTML/text email           |
| `jobalerts/state.py`     | The "already seen" dedupe store                |
| `../state/seen.json`     | Persisted list of already-emailed postings     |
