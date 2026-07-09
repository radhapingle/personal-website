"""Configuration for the job-alert system.

Non-secret settings live here as plain Python so the project stays
dependency-free. Anything sensitive (SMTP password, API keys) is read from
environment variables / GitHub Actions secrets, never committed.
"""

from __future__ import annotations

import os
import ssl


def make_ssl_context() -> ssl.SSLContext:
    """Return a verifying SSL context.

    Uses the system trust store (works out of the box on Linux / GitHub
    Actions). Falls back to the ``certifi`` CA bundle if it is installed,
    which fixes the common macOS "CERTIFICATE_VERIFY_FAILED" issue without
    making certifi a hard dependency.
    """
    try:
        import certifi  # type: ignore

        return ssl.create_default_context(cafile=certifi.where())
    except Exception:  # noqa: BLE001
        return ssl.create_default_context()

# ---------------------------------------------------------------------------
# Who gets the alerts
# ---------------------------------------------------------------------------
RECIPIENT = os.environ.get("ALERT_TO", "rpingle@andrew.cmu.edu")

# ---------------------------------------------------------------------------
# Season / year targeting
# ---------------------------------------------------------------------------
# Only postings matching these are considered. The primary source is already a
# "Summer 2027" repo, but it also carries off-season (Winter/Fall) rows, so we
# still filter on season + year defensively.
TARGET_SEASONS = {"summer"}
TARGET_YEARS = {"2027"}
# If a posting has no explicit year but its season matches, keep it (the source
# repo is Summer-2027 scoped, so bare "Summer" rows are 2027).
KEEP_SEASON_MATCH_WITHOUT_YEAR = True

# ---------------------------------------------------------------------------
# Relevance keywords (built from Radha's resume + stated interests)
# ---------------------------------------------------------------------------
# Each group maps keyword -> weight. A posting's score is the sum of weights of
# groups it matches (each group counts once). Matching is case-insensitive and
# substring based, against the job title primarily.
#
# Interests: data analysis, product development, design-ish, psychology,
# cognitive science, and adjacent (ML, quant, research, UX).
KEYWORD_GROUPS: dict[str, dict[str, float]] = {
    "data": {
        "data analyst": 3.0,
        "data analysis": 3.0,
        "data science": 3.0,
        "data scientist": 3.0,
        "analytics": 2.5,
        "business analyst": 2.5,
        "business intelligence": 2.5,
        "bi analyst": 2.5,
        "quantitative": 2.0,
        "statistics": 2.0,
        "statistical": 2.0,
        "data engineer": 1.5,
    },
    "product": {
        "product manager": 3.0,
        "product management": 3.0,
        "associate product manager": 3.0,
        "apm": 2.0,
        "product analyst": 3.0,
        "product intern": 2.5,
        "product operations": 2.0,
        "product design": 3.0,
        "technical product": 2.5,
    },
    "design_ux": {
        "ux research": 3.0,
        "ux researcher": 3.0,
        "user research": 3.0,
        "user experience": 2.5,
        "product designer": 2.5,
        "design research": 3.0,
        "interaction design": 2.5,
        "human-computer interaction": 3.0,
        "human computer interaction": 3.0,
        "hci": 2.5,
        "human factors": 2.5,
        " ux ": 2.0,
        "ux/ui": 2.0,
    },
    "psych_cogsci": {
        "psychology": 3.0,
        "psychologist": 2.5,
        "cognitive science": 3.0,
        "cognitive": 2.5,
        "behavioral": 2.5,
        "behavioural": 2.5,
        "neuroscience": 2.0,
        "perception": 1.5,
    },
    "research": {
        "research assistant": 2.5,
        "research intern": 2.5,
        "research scientist": 2.0,
        "user researcher": 3.0,
        "quantitative researcher": 2.5,
    },
    "ml_ai": {
        "machine learning": 2.5,
        "artificial intelligence": 2.0,
        " ml ": 1.5,
        "ml intern": 1.5,
        " ai ": 1.5,
        "ai intern": 1.5,
        "nlp": 1.5,
        "natural language": 1.5,
        "data mining": 1.5,
    },
}

# Titles containing these are down-weighted / excluded even if they match above
# (roles that are clearly not aligned with the stated interests).
NEGATIVE_KEYWORDS: dict[str, float] = {
    "sales": -3.0,
    "recruiting": -3.0,
    "marketing intern": -1.5,
    "account executive": -3.0,
    "firmware": -2.0,
    "hardware": -1.5,
    "mechanical": -2.0,
    "electrical engineer": -2.0,
    "chassis": -3.0,
    "vehicle": -2.0,
    "manufacturing": -2.0,
    "warehouse": -3.0,
    "security engineer": -1.0,
}

# Minimum score for a posting to be emailed.
MIN_SCORE = float(os.environ.get("MIN_SCORE", "2.5"))

# ---------------------------------------------------------------------------
# Location preferences (soft signal only, does not filter by default)
# ---------------------------------------------------------------------------
# Set REQUIRE_US=1 to drop clearly non-US-only postings.
REQUIRE_US = os.environ.get("REQUIRE_US", "0") == "1"
PREFERRED_LOCATIONS = [
    "remote",
    "new york", "ny",
    "pittsburgh", "pa",
    "new jersey", "nj",
    "boston", "ma",
    "san francisco", "ca",
    "seattle", "wa",
]
NON_US_HINTS = [
    "london", "united kingdom", "uk", "canada", "toronto", "india",
    "bangalore", "singapore", "berlin", "dublin", "europe", "australia",
    "tokyo", "china", "beijing", "shanghai", "tel aviv", "israel",
]

# ---------------------------------------------------------------------------
# Sources
# ---------------------------------------------------------------------------
SOURCES = {
    # Actively maintained community list (cvrve schema). No API key needed.
    "vanshb03": {
        "enabled": True,
        "url": "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/dev/.github/scripts/listings.json",
    },
    # Optional broad job feed for psych / UX / behavioral roles beyond tech
    # lists. Requires free Adzuna app_id + app_key (set env vars to enable).
    "adzuna": {
        "enabled": bool(os.environ.get("ADZUNA_APP_ID") and os.environ.get("ADZUNA_APP_KEY")),
        "app_id": os.environ.get("ADZUNA_APP_ID", ""),
        "app_key": os.environ.get("ADZUNA_APP_KEY", ""),
        "country": os.environ.get("ADZUNA_COUNTRY", "us"),
        # Queries run against Adzuna; kept intern + Summer 2027 focused.
        "queries": [
            "data analyst intern 2027",
            "product management intern 2027",
            "ux research intern 2027",
            "psychology research intern 2027",
            "cognitive science intern 2027",
            "behavioral research intern 2027",
        ],
    },
}

# Safety cap so a single run (especially the first one) can't send a giant email.
MAX_JOBS_PER_EMAIL = int(os.environ.get("MAX_JOBS_PER_EMAIL", "40"))

# ---------------------------------------------------------------------------
# SMTP email settings (secrets come from env / GitHub Actions secrets)
# ---------------------------------------------------------------------------
SMTP = {
    "host": os.environ.get("SMTP_HOST", "smtp.gmail.com"),
    "port": int(os.environ.get("SMTP_PORT", "587")),
    "user": os.environ.get("SMTP_USER", ""),        # sending account address
    "password": os.environ.get("SMTP_PASSWORD", ""),  # app password
    "from_name": os.environ.get("SMTP_FROM_NAME", "Job Alerts"),
    "use_tls": os.environ.get("SMTP_USE_TLS", "1") == "1",
}

# Path to the dedupe store (relative to repo root).
STATE_PATH = os.environ.get(
    "STATE_PATH",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "state", "seen.json"),
)
